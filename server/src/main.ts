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
  // Local convenience: a missing or empty development database migrates and
  // reseeds itself so the demo opens on the same clean dataset. Skipped on
  // serverless/production, where startup must stay fast and schema changes
  // are a deliberate deploy step (npm run db:setup, see docs/deployment.md).
  const logger = new Logger('Bootstrap');
  const prisma = app.get(PrismaService);
  const autoSetup = !process.env.VERCEL && process.env.NODE_ENV !== 'production';
  if (autoSetup) {
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
  }

  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
}
bootstrap();
