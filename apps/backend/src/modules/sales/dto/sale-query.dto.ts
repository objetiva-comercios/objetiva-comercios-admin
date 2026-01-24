import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator'
import { Type } from 'class-transformer'
import { QueryDto } from '../../../common/dto/query.dto'

export class SaleQueryDto extends QueryDto {
  @IsOptional()
  @IsIn(['completed', 'refunded', 'partial_refund'])
  status?: 'completed' | 'refunded' | 'partial_refund'

  @IsOptional()
  @IsIn(['cash', 'card', 'transfer', 'credit'])
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'credit'

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  customerId?: number

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
