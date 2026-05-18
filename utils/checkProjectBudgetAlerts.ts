import { sendBudgetAlertEmail } from './emailTemplates';
import { connectDB } from '../models/db';
import { WithId } from 'mongodb';

interface AlertConfig {
  projectName: string;
  customEmails?: string[];
  managerEmail: string;
  lowAlert: number;
  highAlert: number;
  lastLowAlert?: Date;
  lastHighAlert?: Date;
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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const isServer = typeof window === 'undefined';
  const url = isServer
    ? `${baseUrl}/api/time-entries?projectName=${encodeURIComponent(projectName)}`
    : `/api/time-entries?projectName=${encodeURIComponent(projectName)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch time entries: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`Fetched total hours for project ${projectName}:`, data.totalHours);
  return data.totalHours;
};

export const checkProjectBudgetAlerts = async () => {
  console.log('Running checkProjectBudgetAlerts...');
  const db = await connectDB();
  const projects: WithId<Project>[] = await db
    .collection<Project>('projects')
    .find({ status: 'Active' })
    .toArray();
  const projectAlerts: WithId<AlertConfig>[] = await db
    .collection<AlertConfig>('projectAlerts')
    .find({})
    .toArray();

  for (const project of projects) {
    const alertConfig = projectAlerts.find((alert) => alert.projectName === project.name);

    if (alertConfig) {
      const totalHours = await fetchTotalHours(project.name);
      const budgetHours = project.budgetHours;
      const percentageUsed = (totalHours / budgetHours) * 100;

      console.log(
        `Project: ${project.name}, Total Hours: ${totalHours}, Budget Hours: ${budgetHours}`
      );
      console.log(
        `Low Alert Threshold: ${budgetHours * alertConfig.lowAlert}, High Alert Threshold: ${
          budgetHours * alertConfig.highAlert
        }`
      );
      console.log(
        `Last Low Alert: ${alertConfig.lastLowAlert}, Last High Alert: ${alertConfig.lastHighAlert}`
      );

      let alertMessage = '';
      let updateFields: Partial<AlertConfig> = {};

      if (totalHours >= budgetHours * alertConfig.highAlert) {
        if (!alertConfig.lastHighAlert) {
          alertMessage =
            `For Project: ${project.name} - ${project.description}\n` +
            `Contract Type: ${project.contractType}\n` +
            `POP: ${new Date(project.periodOfPerformance.startDate).toLocaleDateString()} to ${new Date(
              project.periodOfPerformance.endDate
            ).toLocaleDateString()}\n` +
            `The Actual Hours Expended on this project have reached ${Math.floor(
              percentageUsed
            )}% of the budget threshold set (${alertConfig.highAlert * 100}%).`;
          updateFields.lastHighAlert = new Date();
          console.log('Preparing high alert message');
        } else {
          console.log(`High alert already sent for project: ${project.name}`);
        }
      } else if (totalHours >= budgetHours * alertConfig.lowAlert) {
        if (!alertConfig.lastLowAlert) {
          alertMessage =
            `For Project: ${project.name} - ${project.description}\n` +
            `Contract Type: ${project.contractType}\n` +
            `POP: ${new Date(project.periodOfPerformance.startDate).toLocaleDateString()} to ${new Date(
              project.periodOfPerformance.endDate
            ).toLocaleDateString()}\n` +
            `The Actual Hours Expended on this project have reached ${Math.floor(
              percentageUsed
            )}% of the budget threshold set (${alertConfig.lowAlert * 100}%).`;
          updateFields.lastLowAlert = new Date();
          console.log('Preparing low alert message');
        } else {
          console.log(`Low alert already sent for project: ${project.name}`);
        }
      }

      if (alertMessage) {
        console.log(`Sending alert for project: ${project.name}`);
        const customEmails = Array.isArray(alertConfig.customEmails)
          ? alertConfig.customEmails
          : [];
        const recipients = [alertConfig.managerEmail, ...customEmails].filter((email) => email);

        // Use Math.floor to round down the percentage to the nearest whole number
        const roundedPercentageUsed = Math.floor(percentageUsed);

        await sendBudgetAlertEmail(
          recipients,
          project.name,
          project.description,
          project.contractType,
          `${new Date(project.periodOfPerformance.startDate).toLocaleDateString()} to ${new Date(
            project.periodOfPerformance.endDate
          ).toLocaleDateString()}`,
          roundedPercentageUsed // Use rounded percentage here
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
