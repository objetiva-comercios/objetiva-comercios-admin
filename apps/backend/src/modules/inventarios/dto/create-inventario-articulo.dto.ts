import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateInventarioArticuloDto {
  @IsString()
  @IsNotEmpty()
  articuloCodigo!: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cantidadContada?: number = 0

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
