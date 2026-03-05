import { IsOptional, IsString, IsIn } from 'class-validator'
import { Type } from 'class-transformer'
import { QueryDto } from '../../../common/dto/query.dto'

export class ExistenciaQueryDto extends QueryDto {
  @IsOptional()
  @Type(() => Number)
  depositoId?: number

  @IsOptional()
  @IsString()
  @IsIn(['normal', 'bajo', 'sin_stock'])
  stockStatus?: 'normal' | 'bajo' | 'sin_stock'
}
