import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorObj = errors.array().reduce((acc, err) => {
      if ('param' in err && typeof err.param === 'string') {
        acc[err.param] = err.msg;
      } else {
        acc['error'] = err.msg;
      }
      return acc;
    }, {} as Record<string, string>);

    return res.status(400).json({
      message: "Validation failed",
      errors: errorObj,
    });
  }
  next();
}
