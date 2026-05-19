'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlusIcon, SearchIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { ServerDataTable } from '@/components/tables/server-data-table'
import { getColumns } from '@/components/articulos/articulos-columns'
import {
  ArticuloStatusFilter,
  type StatusFilterValue,
} from '@/components/articulos/articulo-status-filter'
import { ArticuloSheet } from '@/components/articulos/articulo-sheet'
import {
  fetchArticulosClient,
  toggleArticuloActivo,
  deleteArticulo,
  updateSettings,
} from '@/lib/api.client'
import { useToast } from '@/hooks/use-toast'
import type { Articulo } from '@/types/articulo'
import { useArticulosConfig, invalidateArticulosConfig } from '@/hooks/use-articulos-config'
import type { CamposVisibles } from '@/types/articulos-config'
import type { VisibilityState } from '@tanstack/react-table'

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface ArticulosClientProps {
  initialData: PaginatedResponse<Articulo>
}

export function ArticulosClient({ initialData }: ArticulosClientProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState(initialData.data)
  const [meta, setMeta] = useState(initialData.meta)
  const [page, setPage] = useState(initialData.meta.page)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('active')
  const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<Articulo | null>(null)
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const { camposVisibles: camposVisiblesFromHook } = useArticulosConfig()
  const [camposVisibles, setCamposVisibles] = useState<CamposVisibles | null>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync from hook when it loads (only if we haven't set a local override yet)
  useEffect(() => {
    setCamposVisibles(camposVisiblesFromHook)
  }, [camposVisiblesFromHook])

  const effectiveCamposVisibles = camposVisibles ?? camposVisiblesFromHook

  const fetchData = useCallback(
    async (
      fetchPage: number,
      fetchSearch: string,
      fetchStatus: StatusFilterValue,
      fetchSortBy?: string | null,
      fetchSortOrder?: 'asc' | 'desc'
    ) => {
      setIsLoading(true)
      try {
        const activo = fetchStatus === 'active' ? true : fetchStatus === 'inactive' ? false : null
        const response = await fetchArticulosClient({
          page: fetchPage,
          limit: 20,
          search: fetchSearch || undefined,
          activo,
          sortBy: fetchSortBy || undefined,
          sortOrder: fetchSortBy ? fetchSortOrder : undefined,
        })
        setData(response.data)
        setMeta(response.meta)
      } catch (error) {
        console.error('Error fetching articulos:', error)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1)
      fetchData(1, search, statusFilter, sortBy, sortOrder)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleStatusChange = (value: StatusFilterValue) => {
    setStatusFilter(value)
    setPage(1)
    fetchData(1, search, value, sortBy, sortOrder)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchData(newPage, search, statusFilter, sortBy, sortOrder)
  }

  const handleSortChange = useCallback(
    (newSortBy: string | null, newSortOrder: 'asc' | 'desc') => {
      setSortBy(newSortBy)
      setSortOrder(newSortOrder)
      setPage(1)
      fetchData(1, search, statusFilter, newSortBy, newSortOrder)
    },
    [search, statusFilter, fetchData]
  )

  const handleRowClick = (articulo: Articulo) => {
    setSelectedArticulo(articulo)
    setSheetOpen(true)
  }

  const handleEdit = useCallback(
    (articulo: Articulo) => {
      // Phase 31 Deploy 2: navegar por sku (PK) en lugar de codigo
      router.push(`/articulos/${encodeURIComponent(articulo.sku!)}/editar`)
    },
    [router]
  )

  const handleToggleRequest = useCallback((articulo: Articulo) => {
    setToggleTarget(articulo)
  }, [])

  const tableColumns = useMemo(
    () => getColumns({ onEdit: handleEdit, onToggle: handleToggleRequest }),
    [handleEdit, handleToggleRequest]
  )

  const columnVisibility = useMemo<VisibilityState>(
    () => ({
      marca: effectiveCamposVisibles.marca,
      modelo: effectiveCamposVisibles.modelo,
      medida: effectiveCamposVisibles.medida,
      presentacion: effectiveCamposVisibles.presentacion,
      erpUnidades: effectiveCamposVisibles.erpUnidades,
      objeto: effectiveCamposVisibles.objeto,
      sku: effectiveCamposVisibles.sku,
      codigoBarras: effectiveCamposVisibles.codigoBarras,
      talle: effectiveCamposVisibles.talle,
      color: effectiveCamposVisibles.color,
      material: effectiveCamposVisibles.material,
      costo: effectiveCamposVisibles.costo,
      erpCodigo: effectiveCamposVisibles.erp,
    }),
    [effectiveCamposVisibles]
  )

  // Map from column ID to CamposVisibles key
  const columnIdToCampoKey: Record<string, keyof CamposVisibles> = {
    marca: 'marca',
    modelo: 'modelo',
    medida: 'medida',
    presentacion: 'presentacion',
    erpUnidades: 'erpUnidades',
    objeto: 'objeto',
    sku: 'sku',
    codigoBarras: 'codigoBarras',
    talle: 'talle',
    color: 'color',
    material: 'material',
    costo: 'costo',
    erpCodigo: 'erp',
  }

  const handleColumnVisibilityChange = useCallback(
    async (columnId: string, visible: boolean) => {
      const campoKey = columnIdToCampoKey[columnId]
      if (!campoKey) return

      // Optimistic update
      const updated = { ...effectiveCamposVisibles, [campoKey]: visible }
      setCamposVisibles(updated)

      try {
        await updateSettings({ articulosConfig: { camposVisibles: updated } })
        invalidateArticulosConfig()
      } catch {
        // Revert on error
        setCamposVisibles(effectiveCamposVisibles)
        toast({
          title: 'Error al guardar configuracion',
          variant: 'destructive',
        })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveCamposVisibles, toast]
  )

  const handleConfirmToggle = async () => {
    const target = toggleTarget
    if (!target) return
    setToggleTarget(null)

    const previousData = [...data]

    // Optimistic update: remove row if filtered view would hide it
    if (statusFilter === 'active' && target.activo) {
      setData(prev => prev.filter(a => a.codigo !== target.codigo))
    } else if (statusFilter === 'inactive' && !target.activo) {
      setData(prev => prev.filter(a => a.codigo !== target.codigo))
    }

    try {
      if (target.activo) {
        await deleteArticulo(target.codigo) // DELETE — emits articulo.deleted
      } else {
        await toggleArticuloActivo(target.codigo) // PATCH toggle — emits articulo.updated
      }
      toast({
        title: target.activo ? 'Articulo desactivado' : 'Articulo activado',
        description: `"${target.nombre}" fue ${target.activo ? 'desactivado' : 'activado'} correctamente.`,
      })
      // Refresh to update totals
      fetchData(page, search, statusFilter, sortBy, sortOrder)
    } catch {
      setData(previousData)
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del articulo.',
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      {/* Toolbar: filter, search, new button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ArticuloStatusFilter value={statusFilter} onChange={handleStatusChange} />
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar articulos..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 w-[200px] pl-8 text-sm lg:w-[300px]"
            />
          </div>
        </div>
        <Button asChild size="sm" className="h-8 text-sm">
          <Link href="/articulos/nuevo">
            <PlusIcon className="mr-1.5 h-4 w-4" />
            Nuevo Articulo
          </Link>
        </Button>
      </div>

      {/* Table */}
      <ServerDataTable
        columns={tableColumns}
        data={data}
        pageCount={meta.totalPages}
        currentPage={page}
        onPageChange={handlePageChange}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnVisibilityChange}
        onRowClick={handleRowClick}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
      />

      {/* Detail sheet */}
      <ArticuloSheet articulo={selectedArticulo} open={sheetOpen} onOpenChange={setSheetOpen} />

      {/* Toggle confirmation dialog */}
      <AlertDialog open={!!toggleTarget} onOpenChange={open => !open && setToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.activo ? '¿Desactivar articulo?' : '¿Reactivar articulo?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.activo
                ? `"${toggleTarget.nombre}" no aparecera en la lista principal.`
                : `"${toggleTarget?.nombre}" volvera a aparecer en la lista.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle}>
              {toggleTarget?.activo ? 'Desactivar' : 'Reactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
