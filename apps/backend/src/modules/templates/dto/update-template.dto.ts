import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

// Patrón canónico del repo: NO usar `@nestjs/mapped-types` (no instalado).
// Declaramos los campos opcionales manualmente (ver UpdatePropiedadDto).
export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nombre?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  descripcion?: string

  @IsOptional()
  @IsBoolean()
  activo?: boolean
}
