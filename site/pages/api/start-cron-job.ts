import type { NextApiRequest, NextApiResponse } from 'next';
import { startCronJobs as startEndAlertsCron } from '../../cronjobs/checkProjectEndAlertsCron';
import { startBudgetAlertsCronJob } from '../../cronjobs/checkProjectBudgetAlertsCron';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    startEndAlertsCron();
    startBudgetAlertsCronJob();
    res.status(200).json({ message: 'Cron jobs started successfully' });
  } catch (error) {
    console.error('Error starting cron jobs:', error);
    res.status(500).json({ message: 'Error starting cron jobs' });
  }
}
