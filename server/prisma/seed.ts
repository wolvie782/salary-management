// Usage: npm run seed -w server
import { PrismaClient } from '@prisma/client';
import { loadDataset } from '../src/seeding/load-dataset';

const prisma = new PrismaClient();

loadDataset(prisma)
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
