import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator'

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
}
