import { BadRequestException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';
import { formatZodError } from './format-zod-error';

export const AppZodValidationPipe = createZodValidationPipe({
  createValidationException: (error) =>
    new BadRequestException(`Requête invalide — ${formatZodError(error)}`),
});
