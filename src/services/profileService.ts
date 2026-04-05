import * as profileModel from "../models/profileModel";
import type { UpdateProfileBody } from "../types/api";

// Whitelist of safe table names — prevents SQL injection in dynamic queries.
const SECTION_TABLES = [
  "degrees",
  "certifications",
  "licences",
  "professional_courses",
  "employment_history",
] as const;

type ProfileSection = typeof SECTION_TABLES[number];

/** Throws if `section` is not in the whitelist. */
function assertSection(section: string): asserts section is ProfileSection {
  if (!SECTION_TABLES.includes(section as ProfileSection)) {
    throw new Error("Invalid profile section");
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getFullProfile(userId: string) {
  const profile = await profileModel.findProfileByUserId(userId);
  if (!profile) return null;

  const [degrees, certifications, licences, professional_courses, employment_history] =
    await Promise.all([
      profileModel.findDegreesByUserId(userId),
      profileModel.findCertificationsByUserId(userId),
      profileModel.findLicencesByUserId(userId),
      profileModel.findCoursesByUserId(userId),
      profileModel.findEmploymentByUserId(userId),
    ]);

  return {
    ...profile,
    degrees,
    certifications,
    licences,
    professional_courses,
    employment_history,
  };
}

export async function upsertProfile(userId: string, body: UpdateProfileBody) {
  const { full_name, bio, linkedin_url, phone_number } = body as any;
  return profileModel.upsertAlumniProfile(userId, full_name, bio, linkedin_url, phone_number);
}

export async function setProfileAvatar(userId: string, profileImageUrl: string) {
  return profileModel.updateProfileImage(userId, profileImageUrl);
}

export async function getProfileCompletion(userId: string) {
  const profile = await getFullProfile(userId);
  if (!profile) return null;

  const total = 7;
  let filled = 0;
  if (profile.full_name) filled++;
  if (profile.bio) filled++;
  if (profile.linkedin_url) filled++;
  if (profile.profile_image_url) filled++;
  if (profile.degrees.length) filled++;
  if (profile.certifications.length) filled++;
  if (profile.employment_history.length) filled++;

  return Math.round((filled / total) * 100);
}

export async function setAttendance(targetUserId: string, attended: boolean) {
  return profileModel.updateAttendance(targetUserId, attended);
}

// ─── Section CRUD ─────────────────────────────────────────────────────────────

export async function createSectionEntry(
  userId: string,
  section: string,
  data: Record<string, unknown>,
) {
  assertSection(section);
  const keys = Object.keys(data);
  const values = Object.values(data);
  await profileModel.insertSectionEntry(section, userId, keys, values);
}

export async function updateSectionEntry(
  userId: string,
  section: string,
  id: string,
  data: Record<string, unknown>,
) {
  assertSection(section);
  const keys = Object.keys(data);
  const values = Object.values(data);
  return profileModel.updateSectionEntry(section, id, userId, keys, values);
}

export async function deleteSectionEntry(userId: string, section: string, id: string) {
  assertSection(section);
  return profileModel.deleteSectionEntry(section, id, userId);
}
