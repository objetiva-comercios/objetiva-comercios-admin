import { IsString, IsOptional, MaxLength } from 'class-validator'

export class UpdateInventarioDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string

  @IsOptional()
  @IsString()
  descripcion?: string
}
