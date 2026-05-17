import { IsString, IsNotEmpty, IsInt, IsOptional, MaxLength, Matches } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreatePropiedadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nombre!: string

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{1,8}$/, {
    message: 'La abreviación debe tener 1 a 8 caracteres en mayúsculas o dígitos',
  })
  abrev!: string

  // Phase 30: requerido solo para `tipo === 'familia'` (FK a prop_subcategoria.id).
  // La validación condicional vive en `PropiedadesService.create` — el DTO acepta
  // opcionalmente el campo para los 7 tipos restantes (ignorado).
  @IsOptional()
  @IsInt()
  parentId?: number
}
