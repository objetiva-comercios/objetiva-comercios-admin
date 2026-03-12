import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsBoolean,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

class CamposVisiblesDto {
  @IsBoolean() marca!: boolean
  @IsBoolean() modelo!: boolean
  @IsBoolean() talle!: boolean
  @IsBoolean() color!: boolean
  @IsBoolean() material!: boolean
  @IsBoolean() presentacion!: boolean
  @IsBoolean() medida!: boolean
  @IsBoolean() sku!: boolean
  @IsBoolean() codigoBarras!: boolean
  @IsBoolean() costo!: boolean
  @IsBoolean() observaciones!: boolean
  @IsBoolean() erp!: boolean
  @IsBoolean() erpUnidades!: boolean
  @IsBoolean() origen!: boolean
  @IsBoolean() objeto!: boolean
}

class ArticulosConfigDto {
  @ValidateNested()
  @Type(() => CamposVisiblesDto)
  camposVisibles!: CamposVisiblesDto
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  taxId?: string

  @IsOptional()
  @ValidateNested()
  @Type(() => ArticulosConfigDto)
  articulosConfig?: ArticulosConfigDto
}
