import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  const prisma = mockDeep<PrismaClient>();
  const jwt = { signAsync: jest.fn().mockResolvedValue('token') } as unknown as JwtService;
  const users = new UsersService(prisma as never);
  const service = new AuthService(users, jwt);
  beforeEach(() => jest.clearAllMocks());

  it('registers owners as pending and excludes password from response', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'u1',
        email: data.email,
        fullName: data.fullName,
        phone: null,
        passwordHash: 'hash',
        role: 'OWNER',
        status: 'ACTIVE',
        ownerStatus: 'PENDING',
        ownerNote: null,
        createdAt: new Date('2026-11-20T00:00:00Z'),
        updatedAt: new Date('2026-11-20T00:00:00Z'),
      }),
    );
    const result = await service.register({
      email: 'OWNER@SANGO.VN',
      fullName: 'Owner One',
      password: 'Secret123',
      confirmPassword: 'Secret123',
      role: 'OWNER',
    });
    expect(result.user.email).toBe('owner@sango.vn');
    expect(result.user.ownerStatus).toBe('PENDING');
    expect(result.user).not.toHaveProperty('passwordHash');
  });
  it('rejects duplicate emails', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' } as never);
    await expect(
      service.register({
        email: 'owner@sango.vn',
        fullName: 'Owner One',
        password: 'Secret123',
        confirmPassword: 'Secret123',
        role: 'OWNER',
      }),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
  });
  it('returns the same invalid-credentials error for an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'missing@sango.vn', password: 'bad' }),
    ).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED });
  });
  it('rejects a locked account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      status: 'LOCKED',
      passwordHash: '$2b$10$placeholder',
    } as never);
    await expect(
      service.login({ email: 'locked@sango.vn', password: 'Secret123' }),
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN });
  });
});
