import { IsIn, IsInt, IsString, IsUrl, Min, Max } from 'class-validator'

export class ImportImagenUrlDto {
  @IsUrl({}, { message: 'URL de imagen invalida' })
  @IsString()
  url!: string

  @IsIn(['etiqueta', 'producto'])
  tipo!: 'etiqueta' | 'producto'

  @IsInt()
  @Min(1)
  @Max(6)
  slot!: number
}
