import type { NextApiRequest, NextApiResponse } from 'next';
import { startCronJobs } from '../../cronjobs/checkProjectEndAlertsCron';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    startCronJobs();
    res.status(200).json({ message: 'Cron job started successfully' });
  } catch (error) {
    console.error('Error starting cron job:', error);
    res.status(500).json({ message: 'Error starting cron job' });
  }
}
