import nodemailer from "nodemailer";
import { config } from "../config";

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const { host, port, user, pass, secure } = config.email;
  if (host && port && user && pass) {
    try {
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
      await transporter.verify();
      return transporter;
    } catch (err) {
      console.warn("Failed to create mail transporter from SMTP config", err);
      return null;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.info("Using Ethereal email account for local development:", testAccount.user);
      return transporter;
    } catch (err) {
      console.warn("Failed to create ethereal mail transporter", err);
      return null;
    }
  }

  console.warn("SMTP_URL not configured; skipping email delivery in production");
  return null;
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string,
) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn("SMTP not configured. Skipping email to:", to);
    return;
  }

  const info = await transporter.sendMail({
    from: config.email.from,
    to,
    subject,
    text,
    html,
  });

  if (nodemailer.getTestMessageUrl(info)) {
    console.info("Preview email URL:", nodemailer.getTestMessageUrl(info));
  }
}
