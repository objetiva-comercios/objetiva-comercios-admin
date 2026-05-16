'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, CheckCircle, Copy, Loader2, XCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDateTimeES } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  fetchWebhookDeliveries,
  pingWebhook,
  resendWebhookDelivery,
  regenerateWebhookSecret,
  type WebhookDeliveryItem,
  type PingResult,
  type WebhookItem,
} from '@/lib/api.client'
import { cn } from '@/lib/utils'

const EVENT_LABELS: Record<string, string> = {
  created: 'Crear',
  updated: 'Actualizar',
  deleted: 'Eliminar',
}

const ENTITY_LABELS: Record<string, string> = {
  articulos: 'Artículos',
}

function formatDate(iso: string): string {
  return formatDateTimeES(iso)
}

interface DeliveryRowProps {
  delivery: WebhookDeliveryItem
  webhookId: number
  onResent: () => void
}

function DeliveryRow({ delivery, webhookId, onResent }: DeliveryRowProps) {
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [resending, setResending] = useState(false)

  const handleResend = useCallback(async () => {
    setResending(true)
    try {
      await resendWebhookDelivery(webhookId, delivery.deliveryId)
      toast({ title: 'Entrega reenviada correctamente' })
      onResent()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'Error al reenviar la entrega',
      })
    } finally {
      setResending(false)
    }
  }, [webhookId, delivery.deliveryId, onResent, toast])

  const eventLabel = `${delivery.eventName}${delivery.isTest ? ' (test)' : ''}`

  return (
    <>
      <tr
        className="border-b last:border-0 hover:bg-muted/30 cursor-pointer select-none"
        onClick={() => setExpanded(prev => !prev)}
      >
        <td className="py-2.5 px-4 text-sm">{eventLabel}</td>
        <td className="py-2.5 px-4">
          <Badge
            variant="secondary"
            className={cn(
              'text-xs',
              delivery.success
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            )}
          >
            {delivery.success ? 'OK' : 'Fallo'}
          </Badge>
        </td>
        <td className="py-2.5 px-4 text-sm text-muted-foreground font-mono">
          {delivery.httpStatus ?? '—'}
        </td>
        <td className="py-2.5 px-4 text-sm text-muted-foreground">
          {formatDate(delivery.createdAt)}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b last:border-0 bg-muted/20">
          <td colSpan={4} className="px-4 py-3">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground font-medium">Intento:</span>{' '}
                <span className="font-mono">{delivery.attempt}/3</span>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Payload:</p>
                <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-auto max-h-40 whitespace-pre-wrap break-all">
                  {JSON.stringify(delivery.payload, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-muted-foreground font-medium mb-1">Respuesta:</p>
                {delivery.responseBody ? (
                  <pre className="bg-muted rounded-md p-3 text-xs font-mono overflow-auto max-h-40 whitespace-pre-wrap break-all">
                    {delivery.responseBody}
                  </pre>
                ) : (
                  <span className="text-muted-foreground text-xs">Sin respuesta</span>
                )}
              </div>
              {!delivery.success && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={e => {
                    e.stopPropagation()
                    handleResend()
                  }}
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Reenviando...
                    </>
                  ) : (
                    'Reenviar'
                  )}
                </Button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

interface WebhookDetailProps {
  webhook: WebhookItem
  onBack: () => void
}

export function WebhookDetail({ webhook, onBack }: WebhookDetailProps) {
  const { toast } = useToast()

  // Deliveries state
  const [deliveries, setDeliveries] = useState<WebhookDeliveryItem[]>([])
  const [deliveriesMeta, setDeliveriesMeta] = useState<{
    total: number
    page: number
    limit: number
    totalPages: number
  } | null>(null)
  const [loadingDeliveries, setLoadingDeliveries] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Ping state
  const [pinging, setPinging] = useState(false)
  const [pingResult, setPingResult] = useState<PingResult | null>(null)

  // Regenerate secret state
  const [regenDialogOpen, setRegenDialogOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState(false)

  const loadDeliveries = useCallback(
    async (page = 1, append = false) => {
      try {
        const result = await fetchWebhookDeliveries(webhook.id, page)
        setDeliveries(prev => (append ? [...prev, ...result.data] : result.data))
        setDeliveriesMeta(result.meta)
      } catch {
        toast({ variant: 'destructive', title: 'Error al cargar entregas' })
      } finally {
        setLoadingDeliveries(false)
        setLoadingMore(false)
      }
    },
    [webhook.id, toast]
  )

  useEffect(() => {
    loadDeliveries(1, false)
  }, [loadDeliveries])

  const handleLoadMore = useCallback(async () => {
    if (!deliveriesMeta) return
    setLoadingMore(true)
    await loadDeliveries(deliveriesMeta.page + 1, true)
  }, [deliveriesMeta, loadDeliveries])

  const handlePing = useCallback(async () => {
    setPinging(true)
    setPingResult(null)
    try {
      const result = await pingWebhook(webhook.id)
      setPingResult(result)
      // Reload deliveries to show the test ping entry
      await loadDeliveries(1, false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'Error al enviar ping',
      })
    } finally {
      setPinging(false)
    }
  }, [webhook.id, loadDeliveries, toast])

  const handleRegenConfirm = useCallback(async () => {
    setRegenerating(true)
    try {
      const result = await regenerateWebhookSecret(webhook.id)
      setNewSecret(result.fullSecret)
      setRegenDialogOpen(false)
      toast({ title: 'Secreto regenerado correctamente' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'Error al regenerar el secreto',
      })
    } finally {
      setRegenerating(false)
    }
  }, [webhook.id, toast])

  const handleCopySecret = useCallback(async () => {
    if (!newSecret) return
    await navigator.clipboard.writeText(newSecret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }, [newSecret])

  const handleResent = useCallback(() => {
    loadDeliveries(1, false)
  }, [loadDeliveries])

  const hasMore = deliveriesMeta ? deliveriesMeta.page < deliveriesMeta.totalPages : false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a webhooks
        </Button>
      </div>

      <h2 className="text-lg font-semibold">{webhook.name}</h2>

      {/* Info section */}
      <div className="rounded-md border p-4 space-y-3 text-sm">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">URL</p>
            <code className="font-mono text-xs break-all">{webhook.url}</code>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Entidad</p>
            <Badge variant="secondary" className="text-xs">
              {ENTITY_LABELS[webhook.entity] ?? webhook.entity}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Eventos</p>
            <div className="flex flex-wrap gap-1">
              {webhook.events.map(ev => (
                <Badge key={ev} variant="secondary" className="text-xs">
                  {EVENT_LABELS[ev] ?? ev}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Estado</p>
            <Badge
              variant="secondary"
              className={cn(
                'text-xs',
                webhook.active
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              )}
            >
              {webhook.active ? 'Activo' : 'Pausa'}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Creado</p>
            <span className="text-muted-foreground">{formatDate(webhook.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handlePing} disabled={pinging}>
          {pinging ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              Enviando ping...
            </>
          ) : (
            'Test Ping'
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => setRegenDialogOpen(true)}
        >
          Regenerar Secreto
        </Button>
      </div>

      {/* Ping result */}
      {pingResult && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
            pingResult.success
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800'
          )}
        >
          {pingResult.success ? (
            <>
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>
                {pingResult.httpStatus} OK ({pingResult.durationMs}ms)
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 shrink-0" />
              <span>
                {pingResult.error
                  ? `Fallo: ${pingResult.error}`
                  : pingResult.httpStatus
                    ? `Fallo: ${pingResult.httpStatus} (${pingResult.durationMs}ms)`
                    : `Fallo: Error de red`}
              </span>
            </>
          )}
        </div>
      )}

      {/* New secret reveal */}
      {newSecret && (
        <div className="rounded-md border space-y-3 p-4">
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
            Este secreto no se mostrará de nuevo. Guardalo en un lugar seguro.
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-muted p-3 rounded-md break-all select-all">
              {newSecret}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySecret}
              className="shrink-0 gap-1.5"
            >
              {copiedSecret ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Delivery log */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Registro de entregas</h3>
        {loadingDeliveries ? (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando entregas...
          </div>
        ) : deliveries.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            No hay entregas registradas
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs">
                    Evento
                  </th>
                  <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs">
                    Estado
                  </th>
                  <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs">
                    Código HTTP
                  </th>
                  <th className="py-2.5 px-4 text-left font-medium text-muted-foreground text-xs">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map(delivery => (
                  <DeliveryRow
                    key={delivery.id}
                    delivery={delivery}
                    webhookId={webhook.id}
                    onResent={handleResent}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Cargar más'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Regenerate secret AlertDialog */}
      <AlertDialog open={regenDialogOpen} onOpenChange={setRegenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerar Secreto</AlertDialogTitle>
            <AlertDialogDescription>
              El secreto anterior dejará de funcionar inmediatamente. Los endpoints que verifican la
              firma dejarán de validar hasta actualizar el nuevo secreto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRegenConfirm}
              disabled={regenerating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {regenerating ? 'Regenerando...' : 'Regenerar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
