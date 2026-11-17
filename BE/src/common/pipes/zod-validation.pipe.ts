import { HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { z, ZodTypeAny } from 'zod';
import { AppException } from '../exceptions/app.exception';
@Injectable()
export class ZodValidationPipe<TSchema extends ZodTypeAny> implements PipeTransform<
  unknown,
  z.infer<TSchema>
> {
  constructor(private readonly schema: TSchema) {}
  transform(value: unknown): z.infer<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success)
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Dữ liệu không hợp lệ',
        result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    const data: unknown = result.data;
    return data;
  }
}
