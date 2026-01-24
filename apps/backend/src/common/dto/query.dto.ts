import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'

export class QueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20

  @IsOptional()
  @IsString()
  sort?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  status?: string
}
