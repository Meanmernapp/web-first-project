// utils/emailTemplates.ts
import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FROM_NAME } from './config';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const sendProjectEndAlertEmail = (to: string[], projectName: string, endDate: string) => {
  const subject = `Project ${projectName} is Ending Soon`;
  const text = `Hello,

This is a reminder that the project "${projectName}" is scheduled to end on ${endDate}.

Please double check the Purchase order for the end date and work towards getting a contract extension, where possible.

Best regards,
${FROM_NAME}`;

  const mailOptions = {
    from: `${FROM_NAME} <${SMTP_FROM}>`,
    to: to.join(', '),
    subject,
    text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email: ', error);
    } else {
      console.log('Email sent: ', info.response);
    }
  });
};

export const sendBudgetAlertEmail = (
  to: string[],
  projectName: string,
  projectDescription: string,
  contractType: string,
  periodOfPerformance: string,
  threshold: number
) => {
  const subject = `Project ${projectName} has Reached ${threshold}% Budget Usage`;
  const text = `Hello,

For Project: ${projectName} - ${projectDescription}
Contract Type: ${contractType}
POP: ${periodOfPerformance}
The Actual Hours Expended on this project exceeds the budget threshold set (${threshold}%).
Please check hours in Clockify (www.clockify.me) for details against the budgeted hours in the proposal.

Best regards,
${FROM_NAME}`;

  const mailOptions = {
    from: `${FROM_NAME} <${SMTP_FROM}>`,
    to: to.join(', '),
    subject,
    text,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email: ', error);
    } else {
      console.log('Email sent: ', info.response);
    }
  });
};
