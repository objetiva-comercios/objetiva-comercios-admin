import { IsString, IsUrl, IsArray, ArrayMinSize, IsIn } from 'class-validator'

const VALID_EVENTS = ['created', 'updated', 'deleted'] as const

export class CreateWebhookDto {
  @IsString()
  name!: string

  @IsUrl({ protocols: ['https'], require_protocol: true })
  url!: string

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(VALID_EVENTS, { each: true })
  events!: string[]
}
