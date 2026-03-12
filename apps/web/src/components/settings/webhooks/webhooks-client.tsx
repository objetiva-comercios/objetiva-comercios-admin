'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Webhook, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoreHorizontal } from 'lucide-react'
import {
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  toggleWebhook,
  revokeWebhook,
  type WebhookItem,
  type WebhookCreated,
} from '@/lib/api.client'

const EVENT_OPTIONS = [
  { value: 'created', label: 'Crear' },
  { value: 'updated', label: 'Actualizar' },
  { value: 'deleted', label: 'Eliminar' },
]

const EVENT_LABELS: Record<string, string> = {
  created: 'Crear',
  updated: 'Actualizar',
  deleted: 'Eliminar',
}

type DialogMode = 'create' | 'edit'
type DialogStep = 'form' | 'reveal'

export function WebhooksClient() {
  const { toast } = useToast()
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<DialogMode>('create')
  const [dialogStep, setDialogStep] = useState<DialogStep>('form')
  const editingRef = useRef<WebhookItem | null>(null)
  const [createdWebhook, setCreatedWebhook] = useState<WebhookCreated | null>(null)
  const [copied, setCopied] = useState(false)

  // Form fields
  const [formName, setFormName] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formEvents, setFormEvents] = useState<string[]>([])

  // Loading states
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<WebhookItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchWebhooks()
      .then(setWebhooks)
      .catch(() => toast({ variant: 'destructive', title: 'Error al cargar webhooks' }))
      .finally(() => setLoading(false))
  }, [toast])

  const openCreateDialog = useCallback(() => {
    editingRef.current = null
    setDialogMode('create')
    setDialogStep('form')
    setFormName('')
    setFormUrl('')
    setFormEvents([])
    setCreatedWebhook(null)
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((webhook: WebhookItem) => {
    editingRef.current = webhook
    setDialogMode('edit')
    setDialogStep('form')
    setFormName(webhook.name)
    setFormUrl(webhook.url)
    setFormEvents([...webhook.events])
    setCreatedWebhook(null)
    setDialogOpen(true)
  }, [])

  function handleDialogOpenChange(open: boolean) {
    if (!open && dialogStep === 'reveal') {
      // Prevent accidental close during secret reveal
      return
    }
    setDialogOpen(open)
  }

  function handleRevealClose() {
    setDialogOpen(false)
    setCreatedWebhook(null)
    setDialogStep('form')
  }

  function toggleEvent(event: string) {
    setFormEvents(prev => (prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]))
  }

  function validateForm(): boolean {
    if (!formName.trim()) {
      toast({ variant: 'destructive', title: 'El nombre es requerido' })
      return false
    }
    if (!formUrl.trim()) {
      toast({ variant: 'destructive', title: 'La URL es requerida' })
      return false
    }
    if (!formUrl.startsWith('https://')) {
      toast({ variant: 'destructive', title: 'La URL debe comenzar con https://' })
      return false
    }
    if (formEvents.length === 0) {
      toast({ variant: 'destructive', title: 'Seleccioná al menos un evento' })
      return false
    }
    return true
  }

  const handleCreate = useCallback(async () => {
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const result = await createWebhook({
        name: formName.trim(),
        url: formUrl.trim(),
        events: formEvents,
      })
      setWebhooks(prev => [...prev, result])
      setCreatedWebhook(result)
      setDialogStep('reveal')
      toast({ title: 'Webhook creado correctamente' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'Error al crear webhook',
      })
    } finally {
      setSubmitting(false)
    }
  }, [formName, formUrl, formEvents])

  const handleEdit = useCallback(async () => {
    if (!validateForm()) return
    const target = editingRef.current
    if (!target) return
    setSubmitting(true)
    try {
      const updated = await updateWebhook(target.id, {
        name: formName.trim(),
        url: formUrl.trim(),
        events: formEvents,
      })
      setWebhooks(prev => prev.map(w => (w.id === updated.id ? updated : w)))
      setDialogOpen(false)
      toast({ title: 'Webhook actualizado correctamente' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'Error al actualizar webhook',
      })
    } finally {
      setSubmitting(false)
    }
  }, [formName, formUrl, formEvents])

  const handleCopySecret = useCallback(async () => {
    if (!createdWebhook) return
    await navigator.clipboard.writeText(createdWebhook.fullSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [createdWebhook])

  const handleToggle = useCallback(
    async (webhook: WebhookItem) => {
      if (togglingId !== null) return
      setTogglingId(webhook.id)
      // Optimistic update
      setWebhooks(prev => prev.map(w => (w.id === webhook.id ? { ...w, active: !w.active } : w)))
      try {
        const updated = await toggleWebhook(webhook.id)
        setWebhooks(prev => prev.map(w => (w.id === updated.id ? updated : w)))
      } catch (err) {
        // Revert on error
        setWebhooks(prev => prev.map(w => (w.id === webhook.id ? webhook : w)))
        toast({
          variant: 'destructive',
          title: err instanceof Error ? err.message : 'Error al cambiar estado del webhook',
        })
      } finally {
        setTogglingId(null)
      }
    },
    [togglingId]
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await revokeWebhook(deleteTarget.id)
      setWebhooks(prev => prev.filter(w => w.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast({ title: 'Webhook eliminado correctamente' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'Error al eliminar webhook',
      })
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando webhooks...</p>
  }

  return (
    <div className="space-y-4">
      {webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
          <Webhook className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No hay webhooks configurados</p>
          <Button size="sm" onClick={openCreateDialog}>
            Nuevo Webhook
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateDialog}>
              Nuevo Webhook
            </Button>
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Nombre</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">URL</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Eventos</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map(webhook => (
                  <tr key={webhook.id} className="border-b last:border-0">
                    <td className="py-3 px-4">{webhook.name}</td>
                    <td className="py-3 px-4">
                      <span className="truncate max-w-[200px] block text-muted-foreground font-mono text-xs">
                        {webhook.url}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map(event => (
                          <Badge key={event} variant="secondary" className="text-xs">
                            {EVENT_LABELS[event] ?? event}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={`text-xs cursor-pointer select-none ${
                          webhook.active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200'
                        } ${togglingId === webhook.id ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={() => handleToggle(webhook)}
                      >
                        {webhook.active ? 'Activo' : 'Pausa'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menú</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(webhook)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(webhook)}
                          >
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          {dialogStep === 'form' ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === 'create' ? 'Nuevo Webhook' : 'Editar Webhook'}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === 'create'
                    ? 'Configurá un nuevo endpoint para recibir eventos.'
                    : 'Modificá los datos del webhook.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="webhook-name">Nombre</Label>
                  <Input
                    id="webhook-name"
                    placeholder="Ej: Sistema de facturación"
                    maxLength={100}
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="webhook-url">URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://"
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Entidad</Label>
                  <Input value="Artículos" disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Eventos</Label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_OPTIONS.map(option => {
                      const selected = formEvents.includes(option.value)
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => toggleEvent(option.value)}
                          className={`px-3 py-1 rounded-md text-sm border transition-colors ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground'
                          }`}
                        >
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={dialogMode === 'create' ? handleCreate : handleEdit}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Guardando...'
                    : dialogMode === 'create'
                      ? 'Crear Webhook'
                      : 'Guardar Cambios'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Secreto del Webhook</DialogTitle>
                <DialogDescription>
                  Copiá este secreto ahora. No se mostrará de nuevo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
                  Este secreto no se mostrará de nuevo. Guardalo en un lugar seguro.
                </div>
                <code className="font-mono text-xs bg-muted p-3 rounded block break-all select-all">
                  {createdWebhook?.fullSecret}
                </code>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={handleCopySecret} className="sm:mr-auto gap-2">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copiar secreto
                    </>
                  )}
                </Button>
                <Button onClick={handleRevealClose}>Entendido</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de eliminar &ldquo;{deleteTarget?.name}&rdquo;? El webhook dejará de
              recibir eventos inmediatamente. Las entregas pendientes se cancelarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
