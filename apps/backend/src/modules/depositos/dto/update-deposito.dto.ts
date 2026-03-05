import { IsString, IsOptional, MaxLength } from 'class-validator'

export class UpdateDepositoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string

  @IsOptional()
  @IsString()
  descripcion?: string
}
