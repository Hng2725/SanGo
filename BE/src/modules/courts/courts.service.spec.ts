import { CourtsService } from './courts.service';

describe('CourtsService removal', () => {
  const prisma = {
    court: { findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    booking: { count: jest.fn() },
    bookingHold: { count: jest.fn() },
    recurringSeries: { count: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };
  const service = new CourtsService(prisma as never, {} as never);
  beforeEach(() => {
    jest.resetAllMocks();
    prisma.court.findUnique.mockResolvedValue({ id: 'c1', venue: { ownerId: 'owner1' } });
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => Promise<void>) =>
      callback(prisma),
    );
    prisma.booking.count.mockResolvedValue(0);
    prisma.bookingHold.count.mockResolvedValue(0);
    prisma.recurringSeries.count.mockResolvedValue(0);
  });

  it('deactivates instead of deleting a court with customer holds', async () => {
    prisma.bookingHold.count.mockResolvedValue(1);
    await service.remove('c1', 'owner1');
    expect(prisma.court.delete).not.toHaveBeenCalled();
    expect(prisma.court.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { isActive: false },
    });
  });

  it('deactivates a court with recurring reservations', async () => {
    prisma.recurringSeries.count.mockResolvedValue(1);
    await service.remove('c1', 'owner1');
    expect(prisma.court.delete).not.toHaveBeenCalled();
    expect(prisma.court.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { isActive: false },
    });
  });

  it('physically removes a court without any reservation references', async () => {
    await service.remove('c1', 'owner1');
    expect(prisma.court.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('rejects removal of another owner court', async () => {
    await expect(service.remove('c1', 'other_owner')).rejects.toMatchObject({ status: 403 });
    expect(prisma.court.delete).not.toHaveBeenCalled();
  });
});
