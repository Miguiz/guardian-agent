import { ZodError } from 'zod';
import { fromError } from 'zod-validation-error';

export function formatZodError(error: unknown): string {
  if (error instanceof ZodError) {
    return fromError(error).message;
  }
  return 'Validation failed';
}
