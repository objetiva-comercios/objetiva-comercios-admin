import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator'
import { Type } from 'class-transformer'
import { QueryDto } from '../../../common/dto/query.dto'

export class PurchaseQueryDto extends QueryDto {
  @IsOptional()
  @IsIn(['draft', 'ordered', 'received', 'cancelled'])
  status?: 'draft' | 'ordered' | 'received' | 'cancelled'

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  supplierId?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minTotal?: number

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxTotal?: number

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string
}
