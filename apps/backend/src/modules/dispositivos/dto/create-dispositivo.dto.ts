import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'

export class CreateDispositivoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  identificador!: string

  @IsOptional()
  @IsString()
  descripcion?: string
}
