import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe';
import { AppException } from '../exceptions/app.exception';
describe('ZodValidationPipe', () => {
  it('returns typed, coerced data', () =>
    expect(
      new ZodValidationPipe(z.object({ page: z.coerce.number().int() })).transform({ page: '2' }),
    ).toEqual({ page: 2 }));
  it('reports the invalid field', () => {
    try {
      new ZodValidationPipe(z.object({ page: z.number() })).transform({ page: 'two' });
      throw new Error('Expected validation error');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      if (error instanceof AppException) {
        expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(error.getResponse()).toMatchObject({
          code: 'VALIDATION_ERROR',
          details: [{ path: 'page' }],
        });
      }
    }
  });
});
