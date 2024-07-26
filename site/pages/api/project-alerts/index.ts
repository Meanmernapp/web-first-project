// pages/api/project-alerts/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();

  switch (req.method) {
    case 'GET':
      try {
        const projectAlerts = await db.collection('projectAlerts').find({}).toArray();
        res.status(200).json(projectAlerts);
      } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching project alerts' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
