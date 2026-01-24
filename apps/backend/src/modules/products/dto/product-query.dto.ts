import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'
import { QueryDto } from '../../../common/dto/query.dto'

export class ProductQueryDto extends QueryDto {
  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsEnum(['active', 'inactive', 'discontinued'])
  status?: 'active' | 'inactive' | 'discontinued'

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number
}
