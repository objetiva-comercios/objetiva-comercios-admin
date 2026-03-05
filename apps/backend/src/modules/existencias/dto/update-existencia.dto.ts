import { IsOptional, IsNumber, Min } from 'class-validator'

export class UpdateExistenciaDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMaximo?: number
}
