import { IsOptional, IsInt, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateInventarioArticuloDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cantidadContada?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dispositivoId?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sectorId?: number

  @IsOptional()
  @IsString()
  observaciones?: string
}
