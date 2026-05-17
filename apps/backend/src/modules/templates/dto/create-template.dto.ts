import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nombre!: string

  @IsString()
  @IsOptional()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  descripcion?: string
}
