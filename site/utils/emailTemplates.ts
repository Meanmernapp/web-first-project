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

const BCC_EMAIL = 'kostas@webfirst.com'; // Hardcoded BCC email

// Use a dummy address for the 'to' field
const DEFAULT_TO = 'noreply@webfirst.dev';

export const sendProjectEndAlertEmail = (to: string[], projectName: string, endDate: string) => {
  const subject = `Project ${projectName} PO/Contract Period Expires Soon`;
  const text = `Hello,

This is a reminder that the current period of the POP for "${projectName}" PO/Contract is scheduled to end on ${endDate}.

Please re-confirm the Government/Client Purchase Order for the end date, check to see if we have an Option Period, or work towards getting a contract period extension, where possible.

Best regards,
${FROM_NAME}`;

  const mailOptions = {
    from: `${FROM_NAME} <${SMTP_FROM}>`,
    to: DEFAULT_TO, // Use a default or placeholder email
    bcc: [...to, BCC_EMAIL], // Add recipients to the BCC field
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

The Actual Hours Expended on this project exceeds the budget threshold set:
(${threshold}%).

Please check hours in Clockify (www.clockify.me) for details against the budgeted hours in the project proposal/quote.

Best regards,
${FROM_NAME}`;

  const mailOptions = {
    from: `${FROM_NAME} <${SMTP_FROM}>`,
    to: DEFAULT_TO, // Use a default or placeholder email
    bcc: [...to, BCC_EMAIL], // Add recipients to the BCC field
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
