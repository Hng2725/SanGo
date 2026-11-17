import type { PrismaClient, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
export async function seedUsers(prisma: PrismaClient): Promise<void> {
  const demo = [
    {
      email: 'admin@sango.vn',
      password: 'Admin@123',
      fullName: 'Quản trị SanGo',
      role: 'ADMIN' as const,
      ownerStatus: 'NONE' as const,
    },
    {
      email: 'owner@sango.vn',
      password: 'Owner@123',
      fullName: 'Chủ sân An',
      role: 'OWNER' as const,
      ownerStatus: 'APPROVED' as const,
    },
    {
      email: 'owner2@sango.vn',
      password: 'Owner@123',
      fullName: 'Chủ sân Bình',
      role: 'OWNER' as const,
      ownerStatus: 'APPROVED' as const,
    },
    {
      email: 'owner.pending@sango.vn',
      password: 'Owner@123',
      fullName: 'Chủ sân chờ duyệt',
      role: 'OWNER' as const,
      ownerStatus: 'PENDING' as const,
    },
    {
      email: 'customer@sango.vn',
      password: 'Customer@123',
      fullName: 'Khách hàng An',
      role: 'CUSTOMER' as const,
      ownerStatus: 'NONE' as const,
    },
    {
      email: 'customer2@sango.vn',
      password: 'Customer@123',
      fullName: 'Khách hàng Bình',
      role: 'CUSTOMER' as const,
      ownerStatus: 'NONE' as const,
    },
  ];
  const demoHashes = await Promise.all(demo.map((user) => hash(user.password, 10)));
  await prisma.user.createMany({
    data: demo.map((user, index) => ({
      email: user.email,
      passwordHash: demoHashes[index],
      fullName: user.fullName,
      role: user.role,
      ownerStatus: user.ownerStatus,
    })),
  });
  const generatedHash = await hash('Customer@123', 10);
  // Keep the two customer demo accounts plus eight generated customers.
  const numbers = [
    ...Array.from({ length: 8 }, (_, index) => index + 1),
    ...Array.from({ length: 13 }, (_, index) => (index + 1) * 20),
  ];
  const generated: Prisma.UserCreateManyInput[] = numbers.map((number) => {
    const owner = number % 20 === 0;
    return {
      email: `${owner ? 'owner' : 'customer'}${String(number).padStart(3, '0')}@sango.vn`,
      passwordHash: generatedHash,
      fullName: `${owner ? 'Chủ sân' : 'Khách hàng'} ${String(number).padStart(3, '0')}`,
      role: owner ? 'OWNER' : 'CUSTOMER',
      ownerStatus: owner ? (number % 40 === 0 ? 'REJECTED' : 'PENDING') : 'NONE',
      status: number % 31 === 0 ? 'LOCKED' : 'ACTIVE',
    };
  });
  await prisma.user.createMany({ data: generated });
}
