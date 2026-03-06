import { IsString, IsOptional, MaxLength } from 'class-validator'

export class UpdateDispositivoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  identificador?: string

  @IsOptional()
  @IsString()
  descripcion?: string
}
