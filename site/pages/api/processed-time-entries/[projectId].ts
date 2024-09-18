// pages/api/timeEntries/[projectId].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware'; // Adjust the path if necessary
import { format } from 'date-fns';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();
  const { projectId } = req.query;

  switch (req.method) {
    case 'GET':
      try {
        const entries = await db.collection('timeEntries').find({ projectName: projectId as string }).toArray();
        const project = await db.collection('projects').findOne({ name: projectId as string })
        if (!entries || entries.length === 0) {
          return res.status(404).json({ error: 'No time entries found for this project' });
        }

        const userHours: { [key: string]: { [key: string]: number } } = {};
        const totals: { [key: string]: number } = {};
        const monthsSet = new Set<string>();

        entries.forEach(entry => {
          const date = new Date(entry.date);
          const month = format(date, 'yyyy-MM'); // Use ISO format
          monthsSet.add(month);

          if (!userHours[entry.username]) {
            userHours[entry.username] = {};
          }

          if (!userHours[entry.username][month]) {
            userHours[entry.username][month] = 0;
          }

          if (!totals[month]) {
            totals[month] = 0;
          }

          userHours[entry.username][month] += entry.hours;
          totals[month] += entry.hours;
        });

        const monthsArray = Array.from(monthsSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const formattedUserHours = Object.keys(userHours).map(username => {
          const userRecord: { [key: string]: string | number } = { username };
          monthsArray.forEach(month => {
            userRecord[month] = userHours[username][month] || '-';
          });
          return userRecord;
        });

        monthsArray.forEach(month => {
          if (!totals[month]) {
            totals[month] = 0;
          }
        });

        res.status(200).json({ userHours: formattedUserHours, months: monthsArray, totals, project });
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while fetching time entries', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

// Wrap the handler with apiKeyMiddleware
export default apiKeyMiddleware(handler);
