import bcrypt from "bcrypt";
import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import prisma from "../prisma";
import { config } from "../config";

const SALT_ROUNDS = 10;

export async function registerUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error("Email already in use");
    // @ts-expect-error allow custom field
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
    },
  });
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error("Invalid credentials");
    // @ts-expect-error allow custom field
    err.status = 401;
    throw err;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    const err = new Error("Invalid credentials");
    // @ts-expect-error allow custom field
    err.status = 401;
    throw err;
  }

  const secret = config.jwtSecret as Secret;
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as any };
  return jwt.sign({ userId: user.id }, secret, options);
}
