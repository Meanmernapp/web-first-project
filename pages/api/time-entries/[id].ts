import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware'; // Adjust the path if necessary

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production' ? 'https://ts.webfirst.com' : '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  const db = await connectDB();

  switch (req.method) {
    case 'GET':
      const { projectName } = req.query;
      try {
        const timeEntries = await db.collection('timeEntries').find({ projectName }).toArray();
        const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
        res.status(200).json({ totalHours });
      } catch (error: any) {
        console.error('Error fetching time entries:', error);
        res.status(500).json({ error: 'An error occurred while fetching time entries', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
