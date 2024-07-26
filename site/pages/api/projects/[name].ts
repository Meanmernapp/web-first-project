// pages/api/projects/[name].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware'; // Adjust the path if necessary

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();
  const { name } = req.query;

  switch (req.method) {
    case 'PUT':
      try {
        const result = await db.collection('projects').updateOne(
          { name: name as string },
          { $set: req.body }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Project not found' });
        }
        res.status(200).json({ message: 'Project updated' });
      } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the project' });
      }
      break;

    default:
      res.setHeader('Allow', ['PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
