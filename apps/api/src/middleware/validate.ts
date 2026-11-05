import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { BadRequestError } from "../utils/errors";

interface ValidationTargets {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validate(schemas: ValidationTargets) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as typeof req.query;
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as typeof req.params;
      }
      next();
    } catch (error: any) {
      if (error instanceof ZodError || error?.name === "ZodError" || Array.isArray(error?.issues)) {
        const errors = error.errors || error.issues || [];
        const issues = errors.map((e: any) => ({
          field: e.path ? e.path.join(".") : "unknown",
          message: e.message,
        }));
        next(new BadRequestError("Validation failed", issues));
      } else {
        next(error);
      }
    }
  };
}
