// pages/api/project-alerts/[projectName].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../models/db';
import apiKeyMiddleware from '../../../middleware/apiKeyMiddleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();
  const { projectName } = req.query;

  if (typeof projectName !== 'string') {
    res.status(400).json({ error: 'Invalid project name' });
    return;
  }

  if (req.method === 'POST') {
    try {
      const alertConfig = req.body;
      await db.collection('projectAlerts').updateOne(
        { projectName },
        { $set: alertConfig },
        { upsert: true }
      );
      res.status(200).json({ message: 'Alert configuration updated' });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: 'Failed to update alert configuration', details: errorMessage });
    }
  } else if (req.method === 'DELETE') {
    try {
      await db.collection('projectAlerts').deleteOne({ projectName });
      res.status(200).json({ message: 'Alert configuration deleted' });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: 'Failed to delete alert configuration', details: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
