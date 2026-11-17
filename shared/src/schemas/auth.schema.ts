import { z } from 'zod';
import { phoneVnSchema } from './common.schema';
export const passwordSchema = z.string().min(8).regex(/[A-Z]/, 'Cần chữ hoa').regex(/[a-z]/, 'Cần chữ thường').regex(/\d/, 'Cần chữ số');
export const registerSchema = z.object({ email: z.string().email(), password: passwordSchema, confirmPassword: z.string(), fullName: z.string().trim().min(2).max(100), phone: phoneVnSchema.optional().or(z.literal('')), role: z.enum(['CUSTOMER', 'OWNER']) }).refine(value => value.password === value.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu xác nhận không khớp' });
export type RegisterInput = z.infer<typeof registerSchema>;
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export type LoginInput = z.infer<typeof loginSchema>;
