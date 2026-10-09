import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error | unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Handle Zod Schema Validation Errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload format.',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  // Handle standard errors
  const errorObj = err as Error;
  const statusCode = (err as { status?: number }).status || 500;

  // Mask internal stack traces in production / test, log safely without PHI
  console.error(`[Error Handler] ${req.method} ${req.path} -> ${errorObj.message || 'Unknown error'}`);

  res.status(statusCode).json({
    success: false,
    error: {
      code: (err as { code?: string }).code || 'INTERNAL_SERVER_ERROR',
      message: errorObj.message || 'An unexpected error occurred while processing your request.',
    },
  });
}
