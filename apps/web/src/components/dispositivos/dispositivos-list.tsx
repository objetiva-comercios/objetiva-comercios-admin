'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DispositivoMovil } from '@/types/dispositivo'
import { toggleDispositivo } from '@/lib/api.client'
import { DispositivoDialog } from '@/components/dispositivos/dispositivo-dialog'
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

interface DispositivosListProps {
  dispositivos: DispositivoMovil[]
}

export function DispositivosList({ dispositivos: initialDispositivos }: DispositivosListProps) {
  const { toast } = useToast()
  const [dispositivos, setDispositivos] = useState<DispositivoMovil[]>(initialDispositivos)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDispositivo, setEditingDispositivo] = useState<DispositivoMovil | undefined>()

  useEffect(() => {
    setDispositivos(initialDispositivos)
  }, [initialDispositivos])

  const reloadPage = useCallback(() => {
    window.location.reload()
  }, [])

  function handleCreate() {
    setEditingDispositivo(undefined)
    setDialogOpen(true)
  }

  function handleEdit(dispositivo: DispositivoMovil) {
    setEditingDispositivo(dispositivo)
    setDialogOpen(true)
  }

  async function handleToggle(dispositivo: DispositivoMovil) {
    setTogglingId(dispositivo.id)
    try {
      await toggleDispositivo(dispositivo.id)
      toast({
        title: dispositivo.activo ? 'Dispositivo desactivado' : 'Dispositivo activado',
      })
      reloadPage()
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
    reloadPage()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div />
        <Button size="sm" onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Dispositivo
        </Button>
      </div>

      {dispositivos.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No hay dispositivos registrados. Crea uno para empezar.
        </div>
      ) : (
        <div className="rounded-sm border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Identificador</TableHead>
                <TableHead>Descripcion</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispositivos.map(dispositivo => (
                <TableRow key={dispositivo.id}>
                  <TableCell className="font-medium text-sm">{dispositivo.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dispositivo.identificador}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {dispositivo.descripcion || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={dispositivo.activo ? 'default' : 'outline'} className="text-xs">
                      {dispositivo.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(dispositivo)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={togglingId === dispositivo.id}
                        onClick={() => handleToggle(dispositivo)}
                        title={dispositivo.activo ? 'Desactivar' : 'Activar'}
                      >
                        {togglingId === dispositivo.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : dispositivo.activo ? (
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

      <DispositivoDialog
        dispositivo={editingDispositivo}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />
    </>
  )
}
