// pages/api/test-budget-alert.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { checkProjectBudgetAlerts } from '../../utils/checkProjectBudgetAlerts';
import apiKeyMiddleware from '../../middleware/apiKeyMiddleware';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      await checkProjectBudgetAlerts();
      res.status(200).send('Budget alerts checked and emails sent if necessary.');
    } catch (error) {
      console.error('Error checking budget alerts:', error);
      res.status(500).send('Failed to check budget alerts.');
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default apiKeyMiddleware(handler);
