// pages/api/project-end-alerts/index.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import { checkProjectEndAlerts } from '../../../utils/checkProjectEndAlerts';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();

  switch (req.method) {
    case 'GET':
      try {
        const projectEndAlerts = await db.collection('projectEndAlerts').find({}).toArray();
        res.status(200).json(projectEndAlerts);
      } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching project end alerts' });
      }
      break;

    case 'POST':
      try {
        await checkProjectEndAlerts();
        res.status(200).send('Project end alerts check triggered successfully.');
      } catch (error) {
        res.status(500).send('Failed to trigger project end alerts.');
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
