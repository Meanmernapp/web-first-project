// pages/api/check-project-end-alerts/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkProjectEndAlerts } from '../../../utils/checkProjectEndAlerts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await checkProjectEndAlerts();
    res.status(200).json({ message: 'Project end alerts checked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error checking project end alerts' });
  }
}
