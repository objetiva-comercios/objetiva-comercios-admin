import { IsOptional, IsString, IsIn } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { QueryDto } from '../../../common/dto/query.dto'

export class ArticuloQueryDto extends QueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return undefined
  })
  activo?: boolean

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'nombre', 'codigo', 'precio', 'costo', 'updatedAt'])
  sortBy?: string = 'createdAt'

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc'
}
