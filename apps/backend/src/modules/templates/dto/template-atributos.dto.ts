import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'

/**
 * Atributo individual de un template. La PK compuesta es (templateId, atributoTipo),
 * por lo que `atributoTipo` debe ser único dentro de cada template.
 *
 * `customSlot` solo es válido cuando `atributoTipo` es `'custom_1' | 'custom_2' | 'custom_3'`
 * (la validación de coherencia atributoTipo<->customSlot se aplica en el service o se
 * delega al UNIQUE PK + check de DB).
 */
export class TemplateAtributoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  atributoTipo!: string

  @IsOptional()
  @IsInt()
  ordenNombre?: number | null

  @IsOptional()
  @IsInt()
  ordenSku?: number | null

  @IsOptional()
  @IsBoolean()
  esVariante?: boolean

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  customSlot?: number | null
}

/**
 * Body del PATCH /templates/:id/atributos — reemplaza completo la lista de
 * atributos del template (DELETE + INSERT en transacción).
 */
export class ReplaceTemplateAtributosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateAtributoDto)
  atributos!: TemplateAtributoDto[]
}
