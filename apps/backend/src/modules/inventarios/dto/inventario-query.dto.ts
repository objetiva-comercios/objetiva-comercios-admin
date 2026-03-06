import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator'
import { QueryDto } from '../../../common/dto/query.dto'

export class InventarioQueryDto extends QueryDto {
  @IsOptional()
  @IsString()
  @IsIn(['pendiente', 'en_curso', 'finalizado', 'cancelado'])
  estado?: string

  @IsOptional()
  @IsDateString()
  fechaDesde?: string

  @IsOptional()
  @IsDateString()
  fechaHasta?: string
}
