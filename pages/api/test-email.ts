// pages/api/test-email.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { checkProjectEndAlerts } from '../../utils/checkProjectEndAlerts';
import apiKeyMiddleware from '../../middleware/apiKeyMiddleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      await checkProjectEndAlerts();
      res.status(200).send('Emails sent and database updated successfully.');
    } catch (error) {
      console.error('Error sending emails and updating database:', error);
      res.status(500).send('Failed to send emails and update database.');
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
