import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import sharp from 'sharp'
import { eq } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { articulos } from '../../db/schema'
import { UploadImagenDto } from './dto/upload-imagen.dto'

@Injectable()
export class ArticulosImagenesService {
  constructor(private readonly drizzle: DrizzleService) {}

  private sanitizeCodigo(codigo: string): string {
    return codigo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-zA-Z0-9]+/g, '_') // replace non-alphanumeric with _
      .replace(/_+/g, '_') // collapse consecutive _
      .replace(/^_+|_+$/g, '') // trim leading/trailing _
      .toUpperCase()
  }

  private buildFileName(codigo: string, slot: number, size: 'thumb' | 'detail'): string {
    return `${this.sanitizeCodigo(codigo)}_${slot}_${size}.webp`
  }

  private getOutputDir(tipo: 'etiqueta' | 'producto'): string {
    const subdir = tipo === 'etiqueta' ? 'etiquetas' : 'productos'
    return join(process.cwd(), 'uploads', 'articulos', subdir)
  }

  private getDbField(tipo: 'etiqueta' | 'producto'): 'imagenesProducto' | 'imagenesEtiqueta' {
    return tipo === 'producto' ? 'imagenesProducto' : 'imagenesEtiqueta'
  }

  async uploadImagen(codigo: string, buffer: Buffer, dto: UploadImagenDto) {
    // 1. Verify articulo exists
    const rows = await this.drizzle.db.select().from(articulos).where(eq(articulos.codigo, codigo))

    if (!rows.length) {
      throw new NotFoundException(`Articulo con codigo ${codigo} no encontrado`)
    }

    const articulo = rows[0]

    // 2. Validate slot range
    const maxSlot = dto.tipo === 'etiqueta' ? 3 : 6
    if (dto.slot > maxSlot) {
      throw new BadRequestException(
        `Slot invalido: ${dto.tipo} acepta maximo ${maxSlot} imagenes (slot 1-${maxSlot})`
      )
    }

    const outputDir = this.getOutputDir(dto.tipo)
    const thumbFileName = this.buildFileName(codigo, dto.slot, 'thumb')
    const detailFileName = this.buildFileName(codigo, dto.slot, 'detail')

    // 3. Process with sharp (also validates image bytes)
    let thumbBuffer: Buffer
    let detailBuffer: Buffer

    try {
      thumbBuffer = await sharp(buffer)
        .resize(200, 200, { fit: 'cover', position: 'centre' })
        .webp({ quality: 80 })
        .toBuffer()

      detailBuffer = await sharp(buffer)
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
    } catch {
      throw new BadRequestException('Archivo no es una imagen valida')
    }

    // 4. Write files to disk
    await mkdir(outputDir, { recursive: true })
    await writeFile(join(outputDir, thumbFileName), thumbBuffer)
    await writeFile(join(outputDir, detailFileName), detailBuffer)

    // 5. Build URL (plural: etiquetas/, productos/)
    const tipoPlural = dto.tipo === 'etiqueta' ? 'etiquetas' : 'productos'
    const detailUrl = `/api/uploads/articulos/${tipoPlural}/${detailFileName}`

    // 6. Update DB JSONB array
    const dbField = this.getDbField(dto.tipo)
    const currentArr: (string | null)[] = [...((articulo[dbField] as string[]) || [])]

    // Extend array with nulls if needed
    while (currentArr.length < dto.slot) {
      currentArr.push(null)
    }
    currentArr[dto.slot - 1] = detailUrl

    // 7. Persist and return updated articulo
    const updated = await this.drizzle.db
      .update(articulos)
      .set({ [dbField]: currentArr, updatedAt: new Date() })
      .where(eq(articulos.codigo, codigo))
      .returning()

    return updated[0]
  }

  async deleteImagen(codigo: string, tipo: 'etiqueta' | 'producto', slot: number) {
    // 1. Verify articulo exists
    const rows = await this.drizzle.db.select().from(articulos).where(eq(articulos.codigo, codigo))

    if (!rows.length) {
      throw new NotFoundException(`Articulo con codigo ${codigo} no encontrado`)
    }

    const articulo = rows[0]

    // 2. Build file paths
    const outputDir = this.getOutputDir(tipo)
    const thumbPath = join(outputDir, this.buildFileName(codigo, slot, 'thumb'))
    const detailPath = join(outputDir, this.buildFileName(codigo, slot, 'detail'))

    // 3. Delete files (ignore ENOENT — idempotent)
    await unlink(thumbPath).catch(err => {
      if (err.code !== 'ENOENT') throw err
    })
    await unlink(detailPath).catch(err => {
      if (err.code !== 'ENOENT') throw err
    })

    // 4. Update DB: set slot to null
    const dbField = this.getDbField(tipo)
    const currentArr: (string | null)[] = [...((articulo[dbField] as string[]) || [])]

    if (slot <= currentArr.length) {
      currentArr[slot - 1] = null
    }

    const updated = await this.drizzle.db
      .update(articulos)
      .set({ [dbField]: currentArr, updatedAt: new Date() })
      .where(eq(articulos.codigo, codigo))
      .returning()

    return updated[0]
  }
}
