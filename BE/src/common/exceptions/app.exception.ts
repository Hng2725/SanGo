import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from '@sango/shared';
export class AppException extends HttpException {
  constructor(status: HttpStatus, code: ErrorCode, message: string, details?: unknown) {
    super({ code, message, ...(details === undefined ? {} : { details }) }, status);
  }
}
