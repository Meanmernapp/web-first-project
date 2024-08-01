import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust this for production
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  const db = await connectDB();

  switch (req.method) {
    case 'GET':
      try {
        const timeEntries = await db.collection('timeEntries').find({}).toArray();
        res.status(200).json(timeEntries);
      } catch (error: any) {
        console.error('Error fetching time entries:', error);
        res.status(500).json({ error: 'An error occurred while fetching time entries', details: error.message });
      }
      break;

    case 'POST':
      try {
        if (!req.body || typeof req.body.username !== 'string' || typeof req.body.hours !== 'number') {
          return res.status(400).json({ error: 'Invalid input data' });
        }

        const result = await db.collection('timeEntries').insertOne(req.body);
        res.status(201).json(result);
      } catch (error: any) {
        console.error('Error creating time entry:', error);
        res.status(500).json({ error: 'An error occurred while creating the time entry', details: error.message });
      }
      break;

    case 'DELETE':
      try {
        await db.collection('timeEntries').deleteMany({});
        res.status(200).json({ message: 'All time entries deleted' });
      } catch (error: any) {
        console.error('Error deleting time entries:', error);
        res.status(500).json({ error: 'An error occurred while deleting time entries', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
