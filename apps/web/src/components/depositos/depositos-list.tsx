'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Deposito } from '@/types/deposito'
import { fetchDepositosClient, toggleDepositoActivo } from '@/lib/api.client'
import { DepositoDialog } from '@/components/depositos/deposito-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Plus, Pencil, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'

interface DepositosListProps {
  initialDepositos?: Deposito[]
}

export function DepositosList({ initialDepositos }: DepositosListProps) {
  const { toast } = useToast()
  const [depositos, setDepositos] = useState<Deposito[]>(initialDepositos ?? [])
  const [loading, setLoading] = useState(!initialDepositos)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDeposito, setEditingDeposito] = useState<Deposito | undefined>()

  const loadDepositos = useCallback(async () => {
    try {
      const data = await fetchDepositosClient()
      setDepositos(data)
    } catch (error) {
      toast({
        title: 'Error al cargar depositos',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadDepositos()
  }, [loadDepositos])

  function handleCreate() {
    setEditingDeposito(undefined)
    setDialogOpen(true)
  }

  function handleEdit(deposito: Deposito) {
    setEditingDeposito(deposito)
    setDialogOpen(true)
  }

  async function handleToggle(deposito: Deposito) {
    setTogglingId(deposito.id)
    try {
      await toggleDepositoActivo(deposito.id)
      toast({
        title: deposito.activo ? 'Deposito desactivado' : 'Deposito activado',
      })
      await loadDepositos()
    } catch (error) {
      toast({
        title: 'Error al cambiar estado',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  function handleSuccess() {
    loadDepositos()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button size="sm" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Deposito
        </Button>
      </div>

      {depositos.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No hay depositos registrados. Crea uno para empezar.
        </div>
      ) : (
        <div className="rounded-sm border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Direccion</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {depositos.map(deposito => (
                <TableRow key={deposito.id}>
                  <TableCell className="font-medium text-sm">{deposito.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {deposito.direccion || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {deposito.stockSummary.totalArticulos} articulos
                      </Badge>
                      <span className="text-muted-foreground text-xs">&middot;</span>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {deposito.stockSummary.totalUnidades} unidades
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={deposito.activo ? 'default' : 'outline'} className="text-xs">
                      {deposito.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(deposito)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={togglingId === deposito.id}
                        onClick={() => handleToggle(deposito)}
                        title={deposito.activo ? 'Desactivar' : 'Activar'}
                      >
                        {togglingId === deposito.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : deposito.activo ? (
                          <ToggleRight className="h-4 w-4" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DepositoDialog
        deposito={editingDeposito}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </>
  )
}
