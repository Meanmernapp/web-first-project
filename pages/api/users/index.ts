import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();

  switch (req.method) {
    case 'GET':
      try {
        const users = await db.collection('users').find({}).toArray();
        res.status(200).json(users);
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while fetching users', details: error.message });
      }
      break;

    case 'POST':
      try {
        const result = await db.collection('users').insertOne(req.body);
        res.status(201).json(result);
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while creating the user', details: error.message });
      }
      break;

    case 'DELETE':
      try {
        await db.collection('users').deleteMany({});
        res.status(200).json({ message: 'All users deleted' });
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while deleting users', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
