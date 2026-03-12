import { Injectable, Logger } from '@nestjs/common'
import { createHash, randomBytes } from 'crypto'
import { eq, isNull } from 'drizzle-orm'
import { DrizzleService } from '../../db'
import { apiKeys } from '../../db/schema'

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name)

  constructor(private readonly drizzle: DrizzleService) {}

  async create(name: string) {
    const random = randomBytes(32).toString('hex')
    const fullKey = 'obj_sk_' + random.substring(0, 33)
    const prefix = 'obj_sk_...' + random.substring(29, 33)
    const keyHash = createHash('sha256').update(fullKey).digest('hex')

    const [created] = await this.drizzle.db
      .insert(apiKeys)
      .values({ name, keyHash, prefix })
      .returning()

    return { key: created, fullKey }
  }

  async findAll() {
    return this.drizzle.db
      .select()
      .from(apiKeys)
      .where(isNull(apiKeys.revokedAt))
      .orderBy(apiKeys.createdAt)
  }

  async revoke(id: number) {
    await this.drizzle.db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id))
  }

  async findByToken(token: string) {
    const keyHash = createHash('sha256').update(token).digest('hex')

    const results = await this.drizzle.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1)

    const found = results[0]
    if (!found || found.revokedAt !== null) {
      return null
    }

    return found
  }

  updateLastUsed(id: number): void {
    this.drizzle.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .catch((err: unknown) => {
        this.logger.error(`Failed to update lastUsedAt for API key ${id}:`, err)
      })
  }
}
