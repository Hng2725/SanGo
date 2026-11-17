import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
describe('JwtAuthGuard', () => {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
  const jwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1', role: 'CUSTOMER' }) };
  const prisma = { user: { findUnique: jest.fn() } };
  const guard = new JwtAuthGuard(reflector as never, jwt as never, prisma as never);
  const request = { headers: { authorization: '' }, user: undefined as unknown };
  const context = {
    getHandler: () => {},
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(false);
    request.headers.authorization = '';
    request.user = undefined;
  });
  it('requires a bearer token on protected routes', async () =>
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
    }));
  it('allows a public route without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
  it('attaches the current user from DB', async () => {
    request.headers.authorization = 'Bearer token';
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'u@sango.vn',
      fullName: 'User',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      ownerStatus: 'NONE',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ id: 'u1', role: 'CUSTOMER' });
  });
  it('rejects a locked account', async () => {
    request.headers.authorization = 'Bearer token';
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'LOCKED' });
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
  });
});
