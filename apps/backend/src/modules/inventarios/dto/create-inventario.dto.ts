import { IsString, IsNotEmpty, IsDateString, IsInt, IsOptional, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateInventarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre!: string

  @IsDateString()
  fecha!: string

  @Type(() => Number)
  @IsInt()
  depositoId!: number

  @IsOptional()
  @IsString()
  descripcion?: string
}
