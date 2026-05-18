// pages/api/timeEntries/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware'; // Adjust the path if necessary
import { ObjectId } from 'mongodb';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();
  const { id } = req.query;

  switch (req.method) {
    case 'PUT':
      try {
        const result = await db.collection('timeEntries').updateOne(
          { _id: new ObjectId(id as string) },
          { $set: req.body }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Time entry not found' });
        }
        res.status(200).json({ message: 'Time entry updated' });
      } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the time entry' });
      }
      break;

    default:
      res.setHeader('Allow', ['PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
