import { Logger } from '@nestjs/common';
import { MailListener } from './mail.listener';
describe('MailListener', () => {
  const prisma = { booking: { findUnique: jest.fn() }, user: { findUnique: jest.fn() } };
  const mail = { send: jest.fn() };
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
});
