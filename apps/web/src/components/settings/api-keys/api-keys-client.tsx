'use client'

import { useEffect, useState } from 'react'
import { Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDateES } from '@/lib/dates'
import {
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKeyItem,
  type ApiKeyCreated,
} from '@/lib/api.client'

export function ApiKeysClient() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<'form' | 'reveal'>('form')
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null)
  const [copied, setCopied] = useState(false)
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    fetchApiKeys()
      .then(setKeys)
      .finally(() => setLoading(false))
  }, [])

  function openCreateDialog() {
    setCreateStep('form')
    setNewKeyName('')
    setCreatedKey(null)
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!newKeyName.trim()) return
    setCreating(true)
    try {
      const result = await createApiKey(newKeyName.trim())
      setCreatedKey(result)
      setKeys(prev => [...prev, result])
      setCreateStep('reveal')
    } finally {
      setCreating(false)
    }
  }

  async function handleCopy() {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey.fullKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open && createStep === 'reveal') {
      // Prevent accidental close on reveal step
      return
    }
    setCreateOpen(open)
  }

  function handleRevealClose() {
    setCreateOpen(false)
    setCreatedKey(null)
    setCreateStep('form')
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await revokeApiKey(revokeTarget.id)
      setKeys(prev => prev.filter(k => k.id !== revokeTarget.id))
      setRevokeTarget(null)
    } finally {
      setRevoking(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando API keys...</p>
  }

  return (
    <div className="space-y-4">
      {keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Key className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No hay API keys activas</p>
          <Button size="sm" onClick={openCreateDialog}>
            Nueva API Key
          </Button>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateDialog}>
              Nueva API Key
            </Button>
          </div>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Nombre</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Key</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Creada</th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">
                    Último uso
                  </th>
                  <th className="py-3 px-4 text-left font-medium text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody>
                {keys.map(key => (
                  <tr key={key.id} className="border-b last:border-0">
                    <td className="py-3 px-4">{key.name}</td>
                    <td className="py-3 px-4">
                      <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {key.prefix}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {formatDateES(key.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {formatDateES(key.lastUsedAt)}
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setRevokeTarget(key)}
                      >
                        Revocar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          {createStep === 'form' ? (
            <>
              <DialogHeader>
                <DialogTitle>Nueva API Key</DialogTitle>
                <DialogDescription>
                  Asigná un nombre descriptivo para identificar esta key.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="key-name">Nombre</Label>
                  <Input
                    id="key-name"
                    placeholder="Ej: Sistema de facturación"
                    maxLength={100}
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !creating && handleCreate()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!newKeyName.trim() || creating}>
                  {creating ? 'Creando...' : 'Crear'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Tu nueva API Key</DialogTitle>
                <DialogDescription>
                  Copiá esta key ahora. No se mostrará de nuevo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
                  Guardá esta key ahora. No se mostrará de nuevo.
                </div>
                <code className="font-mono text-sm bg-muted p-3 rounded block break-all select-all">
                  {createdKey?.fullKey}
                </code>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={handleCopy} className="sm:mr-auto">
                  {copied ? 'Copiada!' : 'Copiar al portapapeles'}
                </Button>
                <Button onClick={handleRevealClose}>Entendido, guardé la key</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke AlertDialog */}
      <AlertDialog open={!!revokeTarget} onOpenChange={open => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revocar API Key</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de revocar &ldquo;{revokeTarget?.name}&rdquo;? Los sistemas que usen
              esta key dejarán de funcionar inmediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeTarget(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? 'Revocando...' : 'Revocar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
