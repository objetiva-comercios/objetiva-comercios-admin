'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchPropiedades, togglePropiedadActivo } from '@/lib/api.client'
import type { Propiedad, PropTipo } from '@/types/propiedad'
import { PROP_LABELS, copyFor } from '@/types/propiedad'
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
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { Plus, MoreHorizontal, Pencil, Loader2 } from 'lucide-react'
import { PropiedadCreateDialog } from './propiedad-create-dialog'
import { PropiedadEditDialog } from './propiedad-edit-dialog'
import { PropiedadDeactivateDialog } from './propiedad-deactivate-dialog'

export interface PropiedadTableProps {
  propTipo: PropTipo
}

export function PropiedadTable({ propTipo }: PropiedadTableProps) {
  const { toast } = useToast()
  const label = PROP_LABELS[propTipo]
  const c = copyFor(propTipo)

  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactivos, setShowInactivos] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Propiedad | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deactivating, setDeactivating] = useState<Propiedad | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPropiedades(propTipo, {
        activo: showInactivos ? 'all' : true,
      })
      setPropiedades(data)
    } catch (err) {
      toast({
        title: `No se pudieron cargar las ${label.plural.toLowerCase()}`,
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [propTipo, showInactivos, toast, label.plural])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleEdit(p: Propiedad) {
    setEditing(p)
    setEditOpen(true)
  }

  function handleDeactivateRequest(p: Propiedad) {
    setDeactivating(p)
    setDeactivateOpen(true)
  }

  async function handleConfirmDeactivate() {
    if (!deactivating) return
    const target = deactivating
    setTogglingId(target.id)
    setDeactivateOpen(false)
    try {
      await togglePropiedadActivo(propTipo, target.id)
      toast({ title: `${c.singular} ${c.desactivada}` })
      await loadData()
    } catch (err) {
      toast({
        title: 'Error al desactivar',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
      setDeactivating(null)
    }
  }

  async function handleReactivate(p: Propiedad) {
    setTogglingId(p.id)
    try {
      await togglePropiedadActivo(propTipo, p.id)
      toast({ title: `${c.singular} ${c.reactivada}` })
      await loadData()
    } catch (err) {
      toast({
        title: 'Error al reactivar',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Switch
            id={`show-inactive-${propTipo}`}
            checked={showInactivos}
            onCheckedChange={setShowInactivos}
          />
          <label
            htmlFor={`show-inactive-${propTipo}`}
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Mostrar inactivos
          </label>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {c.nuevo} {c.singularLower}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="w-[100px]">Abrev</TableHead>
              <TableHead className="w-[80px]">Estado</TableHead>
              <TableHead className="w-[40px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : propiedades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  Sin {c.pluralLower}. Usá el botón {c.nuevo} {c.singularLower} para agregar{' '}
                  {c.articulo} {c.ordinalPrimero}.
                </TableCell>
              </TableRow>
            ) : (
              propiedades.map(p => (
                <TableRow key={p.id} className={p.activo ? '' : 'text-muted-foreground'}>
                  <TableCell className="font-mono text-sm text-muted-foreground">{p.id}</TableCell>
                  <TableCell className="font-medium text-sm">{p.nombre}</TableCell>
                  <TableCell className="font-mono text-sm">{p.abrev}</TableCell>
                  <TableCell>
                    <Badge
                      variant={p.activo ? 'default' : 'secondary'}
                      className="px-1.5 py-0 text-[11px]"
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {togglingId === p.id ? (
                      <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-6 w-6 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(p)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {p.activo ? (
                            <DropdownMenuItem onClick={() => handleDeactivateRequest(p)}>
                              Desactivar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleReactivate(p)}>
                              Reactivar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog (controlled) */}
      <PropiedadCreateDialog
        propTipo={propTipo}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => loadData()}
      />

      {/* Edit Dialog */}
      {editing && (
        <PropiedadEditDialog
          propTipo={propTipo}
          propiedad={editing}
          open={editOpen}
          onOpenChange={o => {
            setEditOpen(o)
            if (!o) setEditing(null)
          }}
          onSuccess={loadData}
        />
      )}

      {/* Deactivate Dialog */}
      {deactivating && (
        <PropiedadDeactivateDialog
          propiedad={deactivating}
          propTipo={propTipo}
          open={deactivateOpen}
          onOpenChange={o => {
            setDeactivateOpen(o)
            if (!o) setDeactivating(null)
          }}
          onConfirm={handleConfirmDeactivate}
        />
      )}
    </div>
  )
}
