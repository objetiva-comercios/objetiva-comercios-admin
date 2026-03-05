import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator'

export class CreateExistenciaDto {
  @IsString()
  @IsNotEmpty()
  articuloCodigo!: string

  @IsNumber()
  depositoId!: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad?: number = 0

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number = 0

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMaximo?: number = 0
}
