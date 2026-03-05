import { IsString, IsOptional, MaxLength } from 'class-validator'

export class CreateDepositoDto {
  @IsString()
  @MaxLength(100)
  nombre!: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string

  @IsOptional()
  @IsString()
  descripcion?: string
}
