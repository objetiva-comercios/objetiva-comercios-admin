import { IsOptional, IsEnum, IsNumber, IsString } from 'class-validator'
import { Type } from 'class-transformer'
import { QueryDto } from '../../../common/dto/query.dto'

export class OrderQueryDto extends QueryDto {
  @IsOptional()
  @IsEnum(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
  status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

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
