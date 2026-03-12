import { IsString, IsUrl, IsArray, ArrayMinSize, IsIn, IsOptional } from 'class-validator'

const VALID_EVENTS = ['created', 'updated', 'deleted'] as const

export class UpdateWebhookDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url?: string

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(VALID_EVENTS, { each: true })
  events?: string[]
}
