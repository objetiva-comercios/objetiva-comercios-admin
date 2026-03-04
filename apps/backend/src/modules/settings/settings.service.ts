import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { join } from 'path'
import { unlink } from 'fs/promises'
import { DrizzleService } from '../../db'
import { businessSettings } from '../../db/schema'
import { UpdateSettingsDto } from './dto/update-settings.dto'

@Injectable()
export class SettingsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async get() {
    const rows = await this.drizzle.db.select().from(businessSettings).limit(1)

    if (rows.length > 0) return rows[0]

    // Auto-create default row
    const [created] = await this.drizzle.db.insert(businessSettings).values({}).returning()
    return created
  }

  async update(dto: UpdateSettingsDto) {
    const current = await this.get()

    const [updated] = await this.drizzle.db
      .update(businessSettings)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(businessSettings.id, current.id))
      .returning()

    return updated
  }

  async updateLogo(field: 'logoSquare' | 'logoRectangular', filename: string) {
    const current = await this.get()

    // Delete previous file if exists
    const previousFile = current[field]
    if (previousFile) {
      await this.deleteFile(previousFile)
    }

    const [updated] = await this.drizzle.db
      .update(businessSettings)
      .set({ [field]: filename, updatedAt: new Date() })
      .where(eq(businessSettings.id, current.id))
      .returning()

    return updated
  }

  async deleteLogo(field: 'logoSquare' | 'logoRectangular') {
    const current = await this.get()

    const previousFile = current[field]
    if (previousFile) {
      await this.deleteFile(previousFile)
    }

    const [updated] = await this.drizzle.db
      .update(businessSettings)
      .set({ [field]: null, updatedAt: new Date() })
      .where(eq(businessSettings.id, current.id))
      .returning()

    return updated
  }

  private async deleteFile(filename: string) {
    try {
      await unlink(join(process.cwd(), 'uploads', filename))
    } catch {
      // File may not exist, ignore
    }
  }
}
