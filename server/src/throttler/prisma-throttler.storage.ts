import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { PrismaService } from '../prisma/prisma.service';

// Rate limit counters kept in Postgres instead of process memory. On a
// serverless deployment each function instance has its own memory, so an
// in-memory throttle would let an attacker multiply the login attempt budget
// by the number of live instances. Sharing counters through the database
// makes the limit global, including for the stricter login throttler.
//
// Semantics mirror the bundled in-memory storage: hits reset when the window
// expires, and exceeding the limit starts a block period during which every
// request is rejected.
@Injectable()
export class PrismaThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly prisma: PrismaService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const fullKey = `${throttlerName}:${key}`;
    const now = Date.now();

    // Default (ReadCommitted) isolation with a row lock. The upsert creates
    // the row atomically on a key's first concurrent touches, then SELECT FOR
    // UPDATE serializes increments on it: parallel requests wait for each
    // other and observe the committed count, instead of failing with the
    // write conflicts a serializable transaction produces under load. Writes
    // stay on the Prisma model layer because raw query Date parameters are
    // serialized in local time while raw reads assume UTC.
    return this.prisma.$transaction(async (tx) => {
      await tx.throttleRecord.upsert({
        where: { key: fullKey },
        create: { key: fullKey, totalHits: 0, expiresAt: new Date(now + ttl) },
        update: {},
      });

      const rows = await tx.$queryRawUnsafe<
        { key: string; totalHits: number; expiresAt: Date; blockedUntil: Date | null }[]
      >(`SELECT * FROM "ThrottleRecord" WHERE "key" = $1 FOR UPDATE`, fullKey);
      let rec = rows[0];

      // An expired window starts fresh, including clearing any old block.
      if (rec.expiresAt.getTime() <= now) {
        rec = { ...rec, totalHits: 0, expiresAt: new Date(now + ttl), blockedUntil: null };
      }

      const totalHits = rec.totalHits + 1;
      let blockedUntil = rec.blockedUntil;
      if (totalHits > limit && blockDuration > 0) {
        blockedUntil = new Date(
          Math.max(blockedUntil?.getTime() ?? 0, now + blockDuration),
        );
      }
      await tx.throttleRecord.update({
        where: { key: fullKey },
        data: { totalHits, expiresAt: rec.expiresAt, blockedUntil },
      });

      const isBlocked = blockedUntil != null && blockedUntil.getTime() > now;
      return {
        totalHits,
        timeToExpire: Math.max(0, Math.round((rec.expiresAt.getTime() - now) / 1000)),
        isBlocked,
        timeToBlockExpire:
          isBlocked && blockedUntil != null
            ? Math.round((blockedUntil.getTime() - now) / 1000)
            : 0,
      };
    });
  }

  // Best effort cleanup so the table does not grow without bound on a busy
  // deployment. Called occasionally from the seed path and safe to run any
  // time.
  async sweepExpired(): Promise<void> {
    await this.prisma.throttleRecord.deleteMany({
      where: { expiresAt: { lt: new Date() }, blockedUntil: null },
    });
  }
}
