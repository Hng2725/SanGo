import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Env } from '../../config/env';
interface MailInput {
  to: string;
  subject: string;
  html: string;
}
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(private readonly config: ConfigService<Env>) {}
  async send(input: MailInput): Promise<void> {
    if (!this.config.getOrThrow('MAIL_ENABLED')) {
      this.logger.log(`Mail disabled: ${input.subject} to ${input.to}`);
      return;
    }
    const from = this.config.getOrThrow<string>('MAIL_FROM');
    if (this.config.getOrThrow('MAIL_PROVIDER') === 'smtp') {
      const transport = nodemailer.createTransport({
        host: this.config.getOrThrow('SMTP_HOST'),
        port: this.config.getOrThrow('SMTP_PORT'),
        secure: false,
        auth: this.config.get('SMTP_USER')
          ? { user: this.config.getOrThrow('SMTP_USER'), pass: this.config.getOrThrow('SMTP_PASS') }
          : undefined,
      });
      await transport.sendMail({ from, ...input });
      return;
    }
    const parsed = /^(.*)<([^>]+)>$/.exec(from);
    const sender = { name: parsed?.[1].trim() || 'SanGo', email: parsed?.[2] ?? from };
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'api-key': this.config.getOrThrow('BREVO_API_KEY'),
      },
      body: JSON.stringify({
        sender,
        to: [{ email: input.to }],
        subject: input.subject,
        htmlContent: input.html,
      }),
    });
    if (!response.ok) throw new Error(`Brevo returned ${response.status}`);
  }
}
