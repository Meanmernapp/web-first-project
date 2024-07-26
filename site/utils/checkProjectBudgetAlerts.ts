// utils/checkProjectBudgetAlerts.ts
import { sendBudgetAlertEmail } from './emailTemplates';
import { connectDB } from '../models/db';
import { WithId } from 'mongodb';

interface AlertConfig {
  projectName: string;
  customEmails?: string[];
  managerEmail: string;
  alert50: number;
  alert80: number;
  lastAlert50?: Date;
  lastAlert80?: Date;
}

interface Project {
  name: string;
  status: string;
  budgetHours: number;
  contractType: string;
  description: string;
  periodOfPerformance: {
    startDate: string;
    endDate: string;
  };
}

const fetchTotalHours = async (projectName: string): Promise<number> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await fetch(`${baseUrl}/api/time-entries?projectName=${projectName}`);
  const data = await response.json();
  return data.totalHours;
};

export const checkProjectBudgetAlerts = async () => {
  console.log('Running checkProjectBudgetAlerts...');
  const db = await connectDB();
  const projects: WithId<Project>[] = await db.collection<Project>('projects').find({ status: 'Active' }).toArray();
  const projectAlerts: WithId<AlertConfig>[] = await db.collection<AlertConfig>('projectAlerts').find({}).toArray();

  for (const project of projects) {
    const alertConfig = projectAlerts.find((alert) => alert.projectName === project.name);

    if (alertConfig) {
      const totalHours = await fetchTotalHours(project.name);
      const budgetHours = project.budgetHours;

      let alertMessage = '';
      let updateFields: Partial<AlertConfig> = {};

      if (totalHours >= budgetHours * alertConfig.alert80) {
        if (!alertConfig.lastAlert80) {
          alertMessage = `For Project : ${project.name} - ${project.description}\n`
            + `Contract Type: ${project.contractType}\n`
            + `POP: ${new Date(project.periodOfPerformance.startDate).toLocaleDateString()} to ${new Date(project.periodOfPerformance.endDate).toLocaleDateString()}\n`
            + `The Actual Hours Expended on this project exceeds the budget threshold set (80%).`;
          updateFields.lastAlert80 = new Date();
        } else {
          console.log(`80% alert already sent for project: ${project.name}`);
        }
      } else if (totalHours >= budgetHours * alertConfig.alert50) {
        if (!alertConfig.lastAlert50) {
          alertMessage = `For Project : ${project.name} - ${project.description}\n`
            + `Contract Type: ${project.contractType}\n`
            + `POP: ${new Date(project.periodOfPerformance.startDate).toLocaleDateString()} to ${new Date(project.periodOfPerformance.endDate).toLocaleDateString()}\n`
            + `The Actual Hours Expended on this project exceeds the budget threshold set (50%).`;
          updateFields.lastAlert50 = new Date();
        } else {
          console.log(`50% alert already sent for project: ${project.name}`);
        }
      }

      if (alertMessage) {
        const customEmails = Array.isArray(alertConfig.customEmails) ? alertConfig.customEmails : [];
        const recipients = [alertConfig.managerEmail, ...customEmails].filter(email => email);
        await sendBudgetAlertEmail(
          recipients,
          project.name,
          project.description,
          project.contractType,
          `${new Date(project.periodOfPerformance.startDate).toLocaleDateString()} to ${new Date(project.periodOfPerformance.endDate).toLocaleDateString()}`,
          totalHours >= budgetHours * alertConfig.alert80 ? 80 : 50
        );

        await db.collection('projectAlerts').updateOne(
          { projectName: project.name },
          { $set: updateFields }
        );
        console.log(`Sent project budget alert for ${project.name}`);
      }
    }
  }
};
