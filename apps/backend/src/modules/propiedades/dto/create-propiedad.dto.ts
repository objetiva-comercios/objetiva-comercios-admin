import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator'
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
}
