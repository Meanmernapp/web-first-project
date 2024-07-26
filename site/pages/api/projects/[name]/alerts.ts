// pages/api/projectAlerts/[name].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { connectDB } from '../../../../models/db';
import apiKeyMiddleware from '../../../../middleware/apiKeyMiddleware'; // Adjust the path as necessary

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const db = await connectDB();
  const { name } = req.query;

  switch (req.method) {
    case 'POST':
      try {
        const { managerEmail, customEmails, alert50, alert80 } = req.body;
        const project = await db.collection('projects').findOne({ name: name as string });
        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }

        const result = await db.collection('projectAlerts').updateOne(
          { projectName: name as string },
          {
            $set: {
              projectName: name as string,
              managerEmail,
              customEmails,
              alert50,
              alert80,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );

        res.status(201).json(result);
      } catch (error: any) {
        res.status(500).json({ error: 'An error occurred while setting alerts for the project', details: error.message });
      }
      break;

    case 'DELETE':
      try {
        await db.collection('projectAlerts').deleteOne({ projectName: name as string });
        res.status(200).send(`Alerts removed for project ${name}`);
      } catch (error: any) {
        res.status(500).json({ error: `An error occurred while removing alerts for project ${name}`, details: error.message });
      }
      break;

    default:
      res.setHeader('Allow', ['POST', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

// Wrap the handler with apiKeyMiddleware
export default apiKeyMiddleware(handler);
