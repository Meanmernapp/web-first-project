// utils/config.ts
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const SMTP_HOST = process.env.SMTP_HOST || '';
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || '0', 10);
export const SMTP_USER = process.env.SMTP_USER || '';
export const SMTP_PASS = process.env.SMTP_PASS || '';
export const SMTP_FROM = process.env.SMTP_FROM || '';
export const FROM_NAME = process.env.FROM_NAME || '';

/** Call from email send paths only — not at module load (builds must work without SMTP). */
export function assertSmtpConfigured(): void {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    throw new Error('One or more SMTP environment variables are not defined');
  }
}
