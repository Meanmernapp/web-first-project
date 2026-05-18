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
      console.log('Received alert config:', alertConfig); // Log the received config

      const { _id, ...updateData } = alertConfig;

      const updateOperation: any = { $set: updateData };

      console.log('Processed alert config for update:', updateOperation); // Log the processed config

      const result = await db.collection('projectEndAlerts').updateOne(
        { projectName },
        updateOperation,
        { upsert: true }
      );

      console.log('Update result:', result); // Log the update result

      if (result.modifiedCount === 0 && result.upsertedCount === 0) {
        throw new Error('Failed to update or insert alert configuration');
      }

      res.status(200).json({ message: 'Alert configuration updated' });
    } catch (error: any) {
      console.error('Error updating alert configuration:', error); // Log the error
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: 'Failed to update alert configuration', details: errorMessage });
    }
  } else if (req.method === 'DELETE') {
    try {
      const result = await db.collection('projectEndAlerts').deleteOne({ projectName });

      if (result.deletedCount === 0) {
        throw new Error('Failed to delete alert configuration');
      }

      res.status(200).json({ message: 'Alert configuration deleted' });
    } catch (error: any) {
      console.error('Error deleting alert configuration:', error); // Log the error
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ message: 'Failed to delete alert configuration', details: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
