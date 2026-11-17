import { PrismaClient } from '@prisma/client';
import { seedAdminDemo } from './seed/admin-demo.seed';

const prisma = new PrismaClient();
seedAdminDemo(prisma)
  .then((result) => process.stdout.write(`Dữ liệu mẫu Tổng quan: ${JSON.stringify(result)}\n`))
  .catch((error: unknown) => {
    process.stderr.write(String(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
