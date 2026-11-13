import { execSync } from 'node:child_process';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { loadDataset } from './seeding/load-dataset';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  // Free tier hosts reset the filesystem on idle; a missing or empty
  // database migrates and reseeds itself so the demo always opens on the
  // same clean dataset.
  const logger = new Logger('Bootstrap');
  const prisma = app.get(PrismaService);
  try {
    await prisma.employee.count();
  } catch {
    logger.log('Database tables missing, running migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  }
  if ((await prisma.employee.count()) === 0) {
    logger.log('Empty database, loading demo dataset...');
    await loadDataset(prisma, (msg) => logger.log(msg));
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}
bootstrap();
