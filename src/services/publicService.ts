import * as profileModel from "../models/profileModel";

export async function getAlumniOfTheDay() {
  const today = new Date().toISOString().slice(0, 10);

  const row = await profileModel.findAlumniOfTheDay(today);
  if (!row) return null;

  const [degrees, certifications, licences, professional_courses, employment_history] =
    await Promise.all([
      profileModel.findDegreesByUserId(row.user_id),
      profileModel.findCertificationsByUserId(row.user_id),
      profileModel.findLicencesByUserId(row.user_id),
      profileModel.findCoursesByUserId(row.user_id),
      profileModel.findEmploymentByUserId(row.user_id),
    ]);

  return {
    ...row,
    degrees,
    certifications,
    licences,
    professional_courses,
    employment_history,
  };
}
