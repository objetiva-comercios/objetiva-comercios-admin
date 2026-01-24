import { IsOptional, IsEnum, IsNumber, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { QueryDto } from '../../../common/dto/query.dto'

export class InventoryQueryDto extends QueryDto {
  @IsOptional()
  @IsEnum(['in_stock', 'low_stock', 'out_of_stock'])
  status?: 'in_stock' | 'low_stock' | 'out_of_stock'

  @IsOptional()
  @IsString()
  location?: string

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minQuantity?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxQuantity?: number
}
