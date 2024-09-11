import cron from 'node-cron';
import { checkProjectEndAlerts } from '../utils/checkProjectEndAlerts';

//const job = cron.schedule('0 */12 * * *', async () => {
const job = cron.schedule('*/5 * * * *', async () => {
  
  try {
    console.log('Running scheduled task: checkProjectEndAlerts');
    await checkProjectEndAlerts();
    console.log('Completed scheduled task: checkProjectEndAlerts');
  } catch (error) {
    console.error('Error running scheduled task: checkProjectEndAlerts', error);
  }
});

export const startCronJobs = () => {
  job.start();
};
