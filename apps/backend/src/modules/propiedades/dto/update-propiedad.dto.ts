import { IsString, IsOptional, MaxLength, Matches } from 'class-validator'
import { Transform } from 'class-transformer'

// Patrón canónico del repo: NO usar `@nestjs/mapped-types` (no instalado).
// Replicamos el shape de UpdateDispositivoDto pero con los campos de propiedad.
export class UpdatePropiedadDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nombre?: string

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{1,8}$/, {
    message: 'La abreviación debe tener 1 a 8 caracteres en mayúsculas o dígitos',
  })
  abrev?: string
}
