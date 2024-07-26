// utils/checkProjectEndAlerts.ts
import { sendProjectEndAlertEmail } from './emailTemplates';
import { connectDB } from '../models/db';
import { WithId } from 'mongodb';

interface AlertConfig {
  projectName: string;
  customEmails?: string[];
  managerEmail: string;
  lastAlertSent?: Date;
}

interface Project {
  name: string;
  periodOfPerformance?: {
    endDate?: string;
  };
  status: string;
}

export const checkProjectEndAlerts = async () => {
  console.log('Running checkProjectEndAlerts...');
  const db = await connectDB();
  const projects: WithId<Project>[] = await db.collection<Project>('projects').find({ status: 'Active' }).toArray();
  const projectEndAlerts: WithId<AlertConfig>[] = await db.collection<AlertConfig>('projectEndAlerts').find({}).toArray();

  const today = new Date();

  for (const project of projects) {
    if (!project.periodOfPerformance || !project.periodOfPerformance.endDate) {
      console.warn(`Project ${project.name} does not have a valid periodOfPerformance or endDate`);
      continue;
    }

    const endDate = new Date(project.periodOfPerformance.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    console.log(`Project: ${project.name}, Days remaining: ${daysRemaining}`);

    const alertConfig = projectEndAlerts.find((alert) => alert.projectName === project.name);
    if (alertConfig) {
      const alertDaysThreshold = 30; // Alert when there are 30 days or less remaining

      if (daysRemaining <= alertDaysThreshold) {
        // Check if the email has already been sent
        if (alertConfig.lastAlertSent && (new Date(alertConfig.lastAlertSent)).getTime() > (today.getTime() - (alertDaysThreshold * 1000 * 3600 * 24))) {
          console.log(`Email for project ${project.name} has already been sent on ${alertConfig.lastAlertSent}. Skipping.`);
          continue;
        }

        const alertMessage = `The project "${project.name}" is ending on ${endDate.toLocaleDateString()}. Please take necessary actions.`;

        const customEmails = Array.isArray(alertConfig.customEmails) ? alertConfig.customEmails : [];
        const recipients = [alertConfig.managerEmail, ...customEmails].filter((email): email is string => Boolean(email));

        await sendProjectEndAlertEmail(recipients, project.name, endDate.toLocaleDateString());

        await db.collection('projectEndAlerts').updateOne(
          { projectName: project.name },
          { $set: { lastAlertSent: new Date() } }
        );

        console.log(`Sent project end alert for ${project.name}`);
      }
    }
  }
};
