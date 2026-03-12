export const WEBHOOK_EVENTS = {
  ARTICULO_CREATED: 'articulo.created',
  ARTICULO_UPDATED: 'articulo.updated',
  ARTICULO_DELETED: 'articulo.deleted',
} as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS]

export const EVENT_TO_DB: Record<WebhookEvent, string> = {
  'articulo.created': 'created',
  'articulo.updated': 'updated',
  'articulo.deleted': 'deleted',
}
