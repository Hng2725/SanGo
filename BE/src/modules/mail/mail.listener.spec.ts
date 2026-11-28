import { Logger } from '@nestjs/common';
import { MailListener } from './mail.listener';
import type { MailService } from './mail.service';
describe('MailListener', () => {
  const prisma = {
    booking: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    recurringSeries: { findUnique: jest.fn() },
  };
  const mail = {
    send: jest.fn<ReturnType<MailService['send']>, Parameters<MailService['send']>>(),
  };
  const listener = new MailListener(prisma as never, mail as never);
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());
  it('sends booking confirmation to the customer', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      code: 'SG001',
      startAt: new Date('2026-11-20T10:00:00Z'),
      customer: { email: 'customer@sango.vn', fullName: 'Khách hàng' },
      court: { name: 'Sân 1', venue: { name: 'Sân xanh', owner: { email: 'owner@sango.vn' } } },
    });
    await listener.bookingConfirmed({ bookingId: 'b1' });
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'customer@sango.vn' }));
  });
  it('does not throw when delivery fails', async () => {
    prisma.booking.findUnique.mockResolvedValue({
      code: 'SG001',
      startAt: new Date('2026-11-20T10:00:00Z'),
      customer: { email: 'customer@sango.vn', fullName: 'Khách hàng' },
      court: { name: 'Sân 1', venue: { name: 'Sân xanh', owner: { email: 'owner@sango.vn' } } },
    });
    mail.send.mockRejectedValue(new Error('SMTP unavailable'));
    await expect(listener.bookingConfirmed({ bookingId: 'b1' })).resolves.toBeUndefined();
  });
  it('sends one recurring summary each to the customer and venue owner', async () => {
    prisma.recurringSeries.findUnique.mockResolvedValue({
      weeks: 12,
      _count: { bookings: 10 },
      customer: { email: 'customer@sango.vn', fullName: '<Khách>' },
      court: { name: 'Sân <1>', venue: { name: 'Sân xanh', owner: { email: 'owner@sango.vn' } } },
    });
    mail.send.mockResolvedValue(undefined);
    await listener.recurringCreated({ seriesId: 'r1' });
    expect(mail.send).toHaveBeenCalledTimes(2);
    const ownerMessage = mail.send.mock.calls.find(([input]) => input.to === 'owner@sango.vn')?.[0];
    expect(ownerMessage?.html).toContain('10');
    expect(mail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'customer@sango.vn' }));
    expect(mail.send.mock.calls.map(([input]) => input.html).join('')).not.toContain('<Khách>');
  });
});
