import { describe, expect, it } from 'vitest';
import { registerSchema } from './auth.schema';
import { dateStrSchema } from './common.schema';
import { ownerApprovalSchema } from './user.schema';

describe('shared input rules', () => {
  it('rejects an impossible calendar day', () => expect(dateStrSchema.safeParse('2026-02-29').success).toBe(false));
  it('rejects a mismatched confirmation', () => expect(registerSchema.safeParse({ email: 'a@b.vn', fullName: 'Nguyen An', password: 'Secret123', confirmPassword: 'Secret124', role: 'OWNER' }).success).toBe(false));
  it('requires a reason when rejecting an owner', () => expect(ownerApprovalSchema.safeParse({ decision: 'REJECTED' }).success).toBe(false));
  it('accepts an empty optional phone number on registration', () => expect(registerSchema.safeParse({ email: 'a@b.vn', fullName: 'Nguyen An', password: 'Secret123', confirmPassword: 'Secret123', role: 'OWNER', phone: '' }).success).toBe(true));
});
