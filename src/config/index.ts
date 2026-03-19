import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  jwtSecret: process.env.SECRET_KEY ?? "change_me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  email: {
    from: process.env.EMAIL_FROM ?? "no-reply@alumni-be.local",
    smtpUrl: process.env.SMTP_URL ?? "",
  },
  bidding: {
    monthlyLimit: 3,
  },
};
