import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { AuthUser } from '@sango/shared';
import type { Request, Response } from 'express';
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const response = context.switchToHttp().getResponse<Response>();
    const started = Date.now();
    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log(
            `${request.method} ${request.url} ${response.statusCode} - ${Date.now() - started} ms - ${request.user?.id ?? 'guest'}`,
          ),
      }),
    );
  }
}
