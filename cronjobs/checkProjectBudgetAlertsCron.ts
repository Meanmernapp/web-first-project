import cron from 'node-cron';
import { checkProjectBudgetAlerts } from '../utils/checkProjectBudgetAlerts';

const job = cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('Running scheduled task: checkProjectBudgetAlerts');
    await checkProjectBudgetAlerts();
    console.log('Completed scheduled task: checkProjectBudgetAlerts');
  } catch (error) {
    console.error('Error running scheduled task: checkProjectBudgetAlerts', error);
  }
});

export const startBudgetAlertsCronJob = () => {
  job.start();
};
