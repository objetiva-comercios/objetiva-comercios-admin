'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Deposito } from '@/types/deposito'
import type { InventarioSector } from '@/types/inventario'
import {
  fetchDepositosClient,
  toggleDepositoActivo,
  fetchSectoresClient,
  deleteSector,
} from '@/lib/api.client'
import { DepositoDialog } from '@/components/depositos/deposito-dialog'
import { SectorDialog } from '@/components/depositos/sector-dialog'
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
import {
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Loader2,
  ChevronDown,
  ChevronRight,
  Trash2,
} from 'lucide-react'

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

  // Sectores state
  const [expandedDepositos, setExpandedDepositos] = useState<Set<number>>(new Set())
  const [sectoresByDeposito, setSectoresByDeposito] = useState<Record<number, InventarioSector[]>>(
    {}
  )
  const [loadingSectores, setLoadingSectores] = useState<Set<number>>(new Set())
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false)
  const [editingSector, setEditingSector] = useState<InventarioSector | undefined>()
  const [sectorDepositoId, setSectorDepositoId] = useState<number>(0)
  const [deletingSectorId, setDeletingSectorId] = useState<number | null>(null)

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

  const loadSectores = useCallback(
    async (depositoId: number) => {
      setLoadingSectores(prev => new Set(prev).add(depositoId))
      try {
        const sectores = await fetchSectoresClient(depositoId)
        setSectoresByDeposito(prev => ({ ...prev, [depositoId]: sectores }))
      } catch (error) {
        toast({
          title: 'Error al cargar sectores',
          description: error instanceof Error ? error.message : 'Error desconocido',
          variant: 'destructive',
        })
      } finally {
        setLoadingSectores(prev => {
          const next = new Set(prev)
          next.delete(depositoId)
          return next
        })
      }
    },
    [toast]
  )

  function toggleExpand(depositoId: number) {
    setExpandedDepositos(prev => {
      const next = new Set(prev)
      if (next.has(depositoId)) {
        next.delete(depositoId)
      } else {
        next.add(depositoId)
        if (!sectoresByDeposito[depositoId]) {
          loadSectores(depositoId)
        }
      }
      return next
    })
  }

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

  // Sector handlers
  function handleCreateSector(depositoId: number) {
    setEditingSector(undefined)
    setSectorDepositoId(depositoId)
    setSectorDialogOpen(true)
  }

  function handleEditSector(depositoId: number, sector: InventarioSector) {
    setEditingSector(sector)
    setSectorDepositoId(depositoId)
    setSectorDialogOpen(true)
  }

  async function handleDeleteSector(depositoId: number, sectorId: number) {
    if (!confirm('Estas seguro de eliminar este sector?')) return
    setDeletingSectorId(sectorId)
    try {
      await deleteSector(depositoId, sectorId)
      toast({ title: 'Sector eliminado correctamente' })
      await loadSectores(depositoId)
    } catch (error) {
      toast({
        title: 'Error al eliminar sector',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setDeletingSectorId(null)
    }
  }

  function handleSectorSuccess() {
    loadSectores(sectorDepositoId)
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
        <div className="space-y-2">
          {depositos.map(deposito => {
            const isExpanded = expandedDepositos.has(deposito.id)
            const sectores = sectoresByDeposito[deposito.id]
            const isLoadingSectores = loadingSectores.has(deposito.id)

            return (
              <div key={deposito.id} className="rounded-sm border">
                <div className="flex items-center gap-2 px-3 py-2">
                  {deposito.activo && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => toggleExpand(deposito.id)}
                      title={isExpanded ? 'Contraer' : 'Expandir sectores'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{deposito.nombre}</span>
                      <Badge variant={deposito.activo ? 'default' : 'outline'} className="text-xs">
                        {deposito.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {deposito.direccion && (
                        <span className="text-xs text-muted-foreground truncate">
                          {deposito.direccion}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {deposito.stockSummary.totalArticulos} articulos
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {deposito.stockSummary.totalUnidades} unidades
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
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
                </div>

                {/* Sectores expandable section */}
                {isExpanded && deposito.activo && (
                  <div className="border-t px-3 py-2 bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Sectores
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleCreateSector(deposito.id)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Agregar Sector
                      </Button>
                    </div>

                    {isLoadingSectores ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : !sectores || sectores.length === 0 ? (
                      <div className="text-center py-4 text-xs text-muted-foreground">
                        No hay sectores configurados para este deposito.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Nombre</TableHead>
                            <TableHead className="text-xs">Columnas</TableHead>
                            <TableHead className="text-xs text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sectores.map(sector => (
                            <TableRow key={sector.id}>
                              <TableCell className="text-sm">{sector.nombre}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {sector.columnas.length > 0 ? sector.columnas.join(', ') : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => handleEditSector(deposito.id, sector)}
                                    title="Editar sector"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    disabled={deletingSectorId === sector.id}
                                    onClick={() => handleDeleteSector(deposito.id, sector.id)}
                                    title="Eliminar sector"
                                  >
                                    {deletingSectorId === sector.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <DepositoDialog
        deposito={editingDeposito}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
      />

      <SectorDialog
        depositoId={sectorDepositoId}
        sector={editingSector}
        open={sectorDialogOpen}
        onOpenChange={setSectorDialogOpen}
        onSuccess={handleSectorSuccess}
      />
    </>
  )
}
