import { Global, Module } from '@nestjs/common'
import postgres from 'postgres'
import { DrizzleService, DRIZZLE_CLIENT } from './db'

@Global()
@Module({
  providers: [
    DrizzleService,
    {
      provide: DRIZZLE_CLIENT,
      useFactory: () => postgres(process.env.DATABASE_URL!),
    },
  ],
  exports: [DrizzleService],
})
export class DbModule {}
