import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const result = await prisma.$queryRaw`
    SELECT current_database() AS database, NOW() AS time;
  `;

  console.log("✅ Prisma connection successful!");
  console.log(result);
} catch (error) {
  console.error("❌ Prisma connection failed:");
  console.error(error);
} finally {
  await prisma.$disconnect();
}