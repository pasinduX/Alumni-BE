import { Request, Response, NextFunction } from "express";
import { getAlumniOfTheDay as fetchAlumniOfTheDay } from "../services/publicService";

export async function getAlumniOfTheDay(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await fetchAlumniOfTheDay();
    if (!profile) {
      return res.status(404).json({ message: "No alumni of the day" });
    }
    return res.json(profile);
  } catch (err) {
    next(err);
  }
}
