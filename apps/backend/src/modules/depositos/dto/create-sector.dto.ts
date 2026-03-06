import { IsString, IsNotEmpty, IsOptional, IsArray, MaxLength } from 'class-validator'

export class CreateSectorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columnas?: string[] = []
}
