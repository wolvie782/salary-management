import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

// Local development works out of the box with a built in secret. A real
// deployment must set JWT_SECRET; refusing to boot without it is safer
// than silently signing tokens with a public default.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-secret-change-me';
export const JWT_TTL_SECONDS = 12 * 3600;

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_TTL_SECONDS },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
