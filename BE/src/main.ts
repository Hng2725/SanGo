import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import type { Env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env>);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGIN').split(','),
    credentials: true,
  });
  app.enableShutdownHooks();
  await app.listen(config.getOrThrow<number>('PORT'));
  if (process.env.NODE_ENV !== 'production') {
    Logger.log(
      `\nSanGo đã sẵn sàng:\n  Website     ${config.getOrThrow<string>('APP_URL').replace(/\/$/, '')}/\n  API health  http://localhost:${config.getOrThrow<number>('PORT')}/api/health\n  Mailpit     http://localhost:8025/\n`,
      'DevLinks',
    );
  }
}
void bootstrap();
