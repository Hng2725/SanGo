import nodemailer from 'nodemailer';
import { MailService } from './mail.service';
jest.mock('nodemailer', () => ({ __esModule: true, default: { createTransport: jest.fn() } }));
describe('MailService', () => {
  const values: Record<string, unknown> = {
    MAIL_ENABLED: false,
    MAIL_PROVIDER: 'smtp',
    MAIL_FROM: 'SanGo <noreply@sango.vn>',
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_USER: '',
    SMTP_PASS: '',
    BREVO_API_KEY: 'key',
  };
  const config = { getOrThrow: (key: string) => values[key], get: (key: string) => values[key] };
  const service = new MailService(config as never);
  const input = { to: 'user@sango.vn', subject: 'Thông báo', html: '<p>Xin chào</p>' };
  beforeEach(() => {
    values.MAIL_ENABLED = false;
    values.MAIL_PROVIDER = 'smtp';
    jest.clearAllMocks();
  });
  it('does not contact a provider when mail is disabled', async () => {
    await service.send(input);
    expect(nodemailer.createTransport).not.toHaveBeenCalled();
  });
  it('sends through SMTP when enabled', async () => {
    values.MAIL_ENABLED = true;
    const sendMail = jest.fn().mockResolvedValue(undefined);
    jest.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
    await service.send(input);
    expect(sendMail).toHaveBeenCalledWith({ from: values.MAIL_FROM, ...input });
  });
  it('sends through the Brevo HTTP API when selected', async () => {
    values.MAIL_ENABLED = true;
    values.MAIL_PROVIDER = 'brevo';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    await service.send(input);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({ method: 'POST' }),
    );
    fetchMock.mockRestore();
  });
});
