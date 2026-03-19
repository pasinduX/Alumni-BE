import nodemailer from "nodemailer";
import { config } from "../config";

function getTransporter() {
  if (!config.email.smtpUrl || !config.email.smtpUrl.trim()) {
    return null;
  }

  try {
    return nodemailer.createTransport(config.email.smtpUrl);
  } catch (err) {
    console.warn("Failed to create mail transporter", err);
    return null;
  }
}

export async function sendEmail(to: string, subject: string, text: string) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("SMTP not configured. Skipping email to:", to);
    return;
  }

  await transporter.sendMail({
    from: config.email.from,
    to,
    subject,
    text,
  });
}
