import nodemailer from "nodemailer";
import { config } from "./index";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const mailOptions: nodemailer.SendMailOptions = {
    from: config.email.from,
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);

  if (nodemailer.getTestMessageUrl(info)) {
    console.info("Email preview URL:", nodemailer.getTestMessageUrl(info));
  }

  return info;
}

export default transporter;
