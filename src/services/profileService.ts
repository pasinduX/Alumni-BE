import prisma from "../prisma";
import type { UpdateProfileBody } from "../types/api";

export async function getProfileByUserId(userId: string) {
  return prisma.profile.findUnique({
    where: { userId },
    include: {
      degrees: true,
      certifications: true,
      licences: true,
      professionalCourses: true,
      employmentHistory: true,
    },
  });
}

export async function upsertProfileByUserId(userId: string, body: UpdateProfileBody) {
  const { fullName, biography, linkedinUrl } = body;
  return prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      fullName,
      biography,
      linkedinUrl,
    },
    update: {
      fullName,
      biography,
      linkedinUrl,
    },
  });
}

export async function setProfileAvatar(userId: string, imagePath: string) {
  return prisma.profile.update({
    where: { userId },
    data: { profileImagePath: imagePath },
  });
}
