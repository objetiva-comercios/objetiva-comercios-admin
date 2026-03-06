import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator'

export class UpdateSectorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columnas?: string[]
}
