import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ErrorCode } from '@sango/shared';
import type { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception';
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = 'Lỗi hệ thống';
    let details: unknown;
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = 'CONFLICT';
        message = 'Dữ liệu đã tồn tại';
      }
      if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'NOT_FOUND';
        message = 'Không tìm thấy dữ liệu';
      }
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body: unknown = exception.getResponse();
      if (typeof body === 'object' && body !== null) {
        const value = body as Record<string, unknown>;
        if (typeof value.message === 'string') message = value.message;
        if (value.details !== undefined) details = value.details;
        if (exception instanceof AppException && typeof value.code === 'string')
          code = value.code as ErrorCode;
      }
      if (!(exception instanceof AppException))
        code =
          status === HttpStatus.BAD_REQUEST
            ? 'VALIDATION_ERROR'
            : status === HttpStatus.UNAUTHORIZED
              ? 'UNAUTHORIZED'
              : status === HttpStatus.FORBIDDEN
                ? 'FORBIDDEN'
                : status === HttpStatus.NOT_FOUND
                  ? 'NOT_FOUND'
                  : status === HttpStatus.CONFLICT
                    ? 'CONFLICT'
                    : 'INTERNAL_ERROR';
    } else
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    response.status(status).json({
      statusCode: status,
      error: (HttpStatus[status] ?? 'Error')
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/^./, (value) => value.toUpperCase()),
      code,
      message,
      ...(details === undefined ? {} : { details }),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
