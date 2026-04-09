import { IsString, IsOptional, IsArray, IsBoolean, IsInt } from 'class-validator'

export class UpdateArticuloDto {
  @IsOptional()
  @IsString()
  nombre?: string

  @IsOptional()
  @IsString()
  sku?: string

  @IsOptional()
  @IsString()
  codigoBarras?: string

  @IsOptional()
  @IsString()
  observaciones?: string

  @IsOptional()
  @IsString()
  codigoEquivalencia?: string

  @IsOptional()
  @IsString()
  nombreCorto?: string

  @IsOptional()
  @IsString()
  descripcion?: string

  @IsOptional()
  @IsString()
  descripcionWeb?: string

  @IsOptional()
  @IsString()
  categoria?: string

  @IsOptional()
  @IsString()
  subcategoria?: string

  @IsOptional()
  @IsString()
  rubro?: string

  @IsOptional()
  @IsString()
  subrubro?: string

  @IsOptional()
  @IsString()
  adjetivo?: string

  @IsOptional()
  @IsString()
  marca?: string

  @IsOptional()
  @IsString()
  modelo?: string

  @IsOptional()
  @IsString()
  talle?: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsString()
  material?: string

  @IsOptional()
  @IsString()
  presentacion?: string

  @IsOptional()
  @IsString()
  medida?: string

  @IsOptional()
  @IsString()
  objeto?: string

  @IsOptional()
  @IsString()
  propAux1?: string

  @IsOptional()
  @IsString()
  propAux2?: string

  @IsOptional()
  @IsString()
  propAux3?: string

  @IsOptional()
  @IsString()
  propAux4?: string

  @IsOptional()
  @IsString()
  propAux5?: string

  @IsOptional()
  @IsInt()
  unidades?: number

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
  imagenesProductoProcesadas?: string[]

  @IsOptional()
  @IsArray()
  etiquetasOcr?: string[]

  @IsOptional()
  jsonArticulo?: unknown

  @IsOptional()
  @IsString()
  erpId?: string

  @IsOptional()
  @IsString()
  erpCodigo?: string

  @IsOptional()
  @IsString()
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
  originSource?: string

  @IsOptional()
  @IsString()
  originSyncId?: string

  @IsOptional()
  @IsBoolean()
  activo?: boolean
}
