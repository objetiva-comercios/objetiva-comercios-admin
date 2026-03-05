import { IsString, IsOptional, MaxLength, IsArray, IsBoolean, IsInt } from 'class-validator'

export class UpdateArticuloDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sku?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigoBarras?: string

  @IsOptional()
  @IsString()
  observaciones?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marca?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelo?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  talle?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  material?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  presentacion?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  medida?: string

  @IsOptional()
  @IsString()
  precio?: string

  @IsOptional()
  @IsString()
  costo?: string

  @IsOptional()
  @IsArray()
  imagenesProducto?: string[]

  @IsOptional()
  @IsArray()
  imagenesEtiqueta?: string[]

  @IsOptional()
  @IsArray()
  etiquetasOcr?: string[]

  @IsOptional()
  jsonArticulo?: unknown

  @IsOptional()
  @IsString()
  @MaxLength(50)
  erpId?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  erpCodigo?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  erpNombre?: string

  @IsOptional()
  @IsString()
  erpPrecio?: string

  @IsOptional()
  @IsString()
  erpCosto?: string

  @IsOptional()
  @IsInt()
  erpUnidades?: number

  @IsOptional()
  erpDatos?: unknown

  @IsOptional()
  @IsBoolean()
  erpSincronizado?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(50)
  originSource?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  originSyncId?: string

  @IsOptional()
  @IsBoolean()
  activo?: boolean
}
