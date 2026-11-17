import { HttpStatus } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { AuthUser } from '@sango/shared';
import { AdminUsersService } from './admin-users.service';
const actor: AuthUser = {
  id: 'admin1',
  email: 'admin@sango.vn',
  fullName: 'Admin',
  role: 'ADMIN',
  ownerStatus: 'NONE',
};
const owner: User = {
  id: 'owner1',
  email: 'owner@sango.vn',
  passwordHash: 'secret',
  fullName: 'Owner',
  phone: null,
  role: 'OWNER',
  status: 'ACTIVE',
  ownerStatus: 'PENDING',
  ownerNote: null,
  createdAt: new Date('2026-11-17T00:00:00Z'),
  updatedAt: new Date('2026-11-17T00:00:00Z'),
};
describe('AdminUsersService', () => {
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };
  const events = { emit: jest.fn() };
  const service = new AdminUsersService(prisma as never, events as never);
  beforeEach(() => jest.clearAllMocks());
  it('requires ADMIN in the service even without a controller guard', async () => {
    await expect(service.counts({ ...actor, role: 'CUSTOMER' })).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
  });
  it('paginates and removes password hashes', async () => {
    prisma.$transaction.mockResolvedValue([[owner], 1]);
    const result = await service.list(actor, { page: 2, pageSize: 20, sort: 'newest' });
    expect(result).toMatchObject({ page: 2, total: 1, totalPages: 1 });
    expect(result.items[0]).not.toHaveProperty('passwordHash');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
  });
  it('does not allow self-lock or locking another admin', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ ...owner, id: actor.id })
      .mockResolvedValueOnce({ ...owner, role: 'ADMIN' });
    await expect(service.status(actor, actor.id, { status: 'LOCKED' })).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
    });
    await expect(service.status(actor, 'other', { status: 'LOCKED' })).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
  });
  it('approves an owner and emits an event after update', async () => {
    prisma.user.findUnique.mockResolvedValue(owner);
    prisma.user.update.mockResolvedValue({ ...owner, ownerStatus: 'APPROVED' });
    const result = await service.approve(actor, owner.id, { decision: 'APPROVED' });
    expect(result.ownerStatus).toBe('APPROVED');
    expect(events.emit).toHaveBeenCalledWith('owner.approved', {
      userId: owner.id,
      note: undefined,
    });
  });
});
