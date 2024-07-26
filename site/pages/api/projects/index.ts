// pages/api/projects.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import { InsertOneResult, Document } from 'mongodb';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware'; // Adjust the path as necessary

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();
  const collection = db.collection('projects');

  switch (req.method) {
    case 'GET':
      try {
        const projects = await collection.find({}).toArray();
        res.status(200).json(projects);
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while fetching projects', details: error.message });
      }
      break;

    case 'POST':
      try {
        const result: InsertOneResult<Document> = await collection.insertOne(req.body);
        res.status(201).json(result);
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while creating the project', details: error.message });
      }
      break;

    case 'DELETE':
      try {
        await collection.deleteMany({});
        res.status(200).json({ message: 'All projects deleted' });
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while deleting projects', details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

// Apply the middleware
export default apiKeyMiddleware(handler);
