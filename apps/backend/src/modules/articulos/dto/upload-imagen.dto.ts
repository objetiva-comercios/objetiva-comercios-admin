import { IsIn, IsInt, Min, Max } from 'class-validator'
import { Transform } from 'class-transformer'

export class UploadImagenDto {
  @IsIn(['etiqueta', 'producto'])
  tipo!: 'etiqueta' | 'producto'

  // FormData sends strings — Transform to int before validation
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(6)
  slot!: number
}
