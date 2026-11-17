import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { AppException } from '../exceptions/app.exception';
describe('RolesGuard', () => {
  const metadata = new Map<string, unknown>();
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => metadata.get(key)),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const context = (user: unknown) =>
    ({
      getHandler: () => {},
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;
  beforeEach(() => {
    metadata.clear();
    metadata.set('roles', ['OWNER']);
  });
  function rejectedStatus(user: unknown): number | null {
    try {
      guard.canActivate(context(user));
      return null;
    } catch (error) {
      return error instanceof AppException ? error.getStatus() : null;
    }
  }
  it('rejects a different role', () =>
    expect(rejectedStatus({ role: 'CUSTOMER', ownerStatus: 'NONE' })).toBe(HttpStatus.FORBIDDEN));
  it('rejects an owner pending approval', () =>
    expect(rejectedStatus({ role: 'OWNER', ownerStatus: 'PENDING' })).toBe(HttpStatus.FORBIDDEN));
  it('allows an owner on an approval-exempt route', () => {
    metadata.set('allowUnapprovedOwner', true);
    expect(guard.canActivate(context({ role: 'OWNER', ownerStatus: 'PENDING' }))).toBe(true);
  });
});
