import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seed/users.seed';
import { seedAdminDemo } from './seed/admin-demo.seed';
const prisma = new PrismaClient();
async function main(): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.complaint.deleteMany();
    await tx.review.deleteMany();
    await tx.slotLock.deleteMany();
    await tx.bookingHold.deleteMany();
    await tx.booking.deleteMany();
    await tx.recurringSeries.deleteMany();
    await tx.maintenanceBlock.deleteMany();
    await tx.priceRule.deleteMany();
    await tx.openingHour.deleteMany();
    await tx.court.deleteMany();
    await tx.venue.deleteMany();
    await tx.user.deleteMany();
  });
  await seedUsers(prisma);
  await seedAdminDemo(prisma);
  // TODO(Lâm): gọi seedVenues(prisma) sau khi module sân được merge.
  // TODO(Dương): gọi seedBookings(prisma), seedReviewsAndComplaints(prisma) sau khi module đơn được merge.
}
main()
  .catch((error) => {
    process.stderr.write(String(error));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
