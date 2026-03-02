import { Injectable, Inject } from '@nestjs/common'
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export const DRIZZLE_CLIENT = 'DRIZZLE_CLIENT'

@Injectable()
export class DrizzleService {
  public db: PostgresJsDatabase<typeof schema>

  constructor(@Inject(DRIZZLE_CLIENT) private readonly client: ReturnType<typeof postgres>) {
    this.db = drizzle(client, { schema })
  }
}
