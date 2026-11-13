import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';
import { PrismaThrottlerStorage } from './throttler/prisma-throttler.storage';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { EmployeesModule } from './employees/employees.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MetaModule } from './meta/meta.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Counters live in Postgres (PrismaThrottlerStorage) so the limits hold
    // across every running instance, including serverless ones.
    ThrottlerModule.forRootAsync({
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => ({
        throttlers: [{ ttl: 60_000, limit: 300 }],
        storage: new PrismaThrottlerStorage(prisma),
      }),
    }),
    PrismaModule,
    AuthModule,
    EmployeesModule,
    AnalyticsModule,
    MetaModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, transform: true }),
    },
  ],
})
export class AppModule {}
