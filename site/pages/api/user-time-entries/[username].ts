import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import { format } from 'date-fns';

interface TimeEntry {
  username: string;
  projectName: string;
  date: string;
  hours: number;
}

interface UserProjects {
  [projectName: string]: { [month: string]: number };
}

interface Totals {
  [month: string]: number;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const db = await connectDB();
  const { username } = req.query as { username: string };

  if (typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid username parameter' });
  }

  try {
    // Fetch documents from the database
    const rawEntries = await db.collection('timeEntries').find({ username }).toArray();
    
    // Safely cast documents to TimeEntry type
    const timeEntries = rawEntries.map(entry => ({
      username: entry.username,
      projectName: entry.projectName,
      date: entry.date,
      hours: entry.hours,
    })) as TimeEntry[];

    if (!timeEntries || timeEntries.length === 0) {
      return res.status(404).json({ error: 'No time entries found for this user' });
    }

    const userProjects: UserProjects = {};
    const monthsSet = new Set<string>();
    const totals: Totals = {};

    timeEntries.forEach(entry => {
      const date = new Date(entry.date);
      const month = format(date, 'yyyy-MM'); // Use ISO format
      monthsSet.add(month);

      if (!userProjects[entry.projectName]) {
        userProjects[entry.projectName] = {};
      }

      if (!userProjects[entry.projectName][month]) {
        userProjects[entry.projectName][month] = 0;
      }

      if (!totals[month]) {
        totals[month] = 0;
      }

      userProjects[entry.projectName][month] += entry.hours;
      totals[month] += entry.hours;
    });

    const monthsArray = Array.from(monthsSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const formattedUserProjects = Object.keys(userProjects).map(projectName => {
      const projectRecord: { [key: string]: string | number } = { projectName };
      monthsArray.forEach(month => {
        projectRecord[month] = userProjects[projectName][month] || '-';
      });
      return projectRecord;
    });

    res.status(200).json({ userProjects: formattedUserProjects, months: monthsArray, totals });
  } catch (error: any) {
    console.error('Error fetching user time entries:', error);
    res.status(500).json({ error: 'An error occurred while fetching user time entries' });
  }
};

export default handler;
