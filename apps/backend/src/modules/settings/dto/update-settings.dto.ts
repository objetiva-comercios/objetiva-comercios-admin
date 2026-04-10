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
  @IsOptional() @IsBoolean() marca?: boolean
  @IsOptional() @IsBoolean() modelo?: boolean
  @IsOptional() @IsBoolean() talle?: boolean
  @IsOptional() @IsBoolean() color?: boolean
  @IsOptional() @IsBoolean() material?: boolean
  @IsOptional() @IsBoolean() presentacion?: boolean
  @IsOptional() @IsBoolean() medida?: boolean
  @IsOptional() @IsBoolean() sku?: boolean
  @IsOptional() @IsBoolean() codigoBarras?: boolean
  @IsOptional() @IsBoolean() costo?: boolean
  @IsOptional() @IsBoolean() observaciones?: boolean
  @IsOptional() @IsBoolean() erp?: boolean
  @IsOptional() @IsBoolean() erpUnidades?: boolean
  @IsOptional() @IsBoolean() origen?: boolean
  @IsOptional() @IsBoolean() objeto?: boolean
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
