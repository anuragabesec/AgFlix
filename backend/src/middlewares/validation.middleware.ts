import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../errors/app-error';

interface ValidationSchema {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

export const validateRequest = (schemas: ValidationSchema): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorDetails = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return next(new ValidationError('Request validation failed', errorDetails));
      }
      next(error);
    }
  };
};
