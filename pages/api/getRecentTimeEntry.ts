// pages/api/getRecentTimeEntry.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../models/db'; // Assuming you have this function to connect to MongoDB
import apiKeyMiddleware from '../../middleware/apiKeyMiddleware'; // Middleware to handle API keys

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this for production
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  const db = await connectDB();

  switch (req.method) {
    case 'GET':
      try {
        // Fetch the most recent time entry, selecting only the date field
        const mostRecentEntry = await db.collection('timeEntries')
        .find({ date: { $ne: null } }, { projection: { date: 1, _id: 0 } })
        .sort({ date: -1 })
        .limit(1)
        .toArray();
          
        if (mostRecentEntry.length === 0) {
          return res.status(404).json({ message: 'No time entries found' });
        }

        // Send the 'date' of the most recent entry
        res.status(200).json(mostRecentEntry[0].date);
      } catch (error: any) {
        console.error('Error fetching the most recent date:', error);
        res.status(500).json({
          error: 'An error occurred while fetching the most recent date',
          details: error.message,
        });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
