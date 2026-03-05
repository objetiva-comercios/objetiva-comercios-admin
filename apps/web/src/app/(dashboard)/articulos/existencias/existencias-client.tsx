'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SearchIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExistenciasKpiCards } from '@/components/existencias/existencias-kpi-cards'
import { ExistenciasPorDeposito } from '@/components/existencias/existencias-por-deposito'
import { ExistenciasPorArticulo } from '@/components/existencias/existencias-por-articulo'
import { cn } from '@/lib/utils'
import {
  fetchExistenciasByDepositoClient,
  fetchExistenciasMatrixClient,
  fetchExistenciasKpiClient,
  updateExistenciaClient,
} from '@/lib/api.client'
import type { Deposito } from '@/types/deposito'
import type {
  Existencia,
  ExistenciaMatrixRow,
  ExistenciasKpi,
  StockStatus,
} from '@/types/existencia'

type ViewMode = 'por_deposito' | 'por_articulo'

const viewModeOptions: { label: string; value: ViewMode }[] = [
  { label: 'Por Deposito', value: 'por_deposito' },
  { label: 'Por Articulo', value: 'por_articulo' },
]

interface ExistenciasClientProps {
  depositos: Deposito[]
  initialData: {
    data: Existencia[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  } | null
  initialKpi: ExistenciasKpi | null
}

export function ExistenciasClient({ depositos, initialData, initialKpi }: ExistenciasClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('por_deposito')
  const [selectedDepositoId, setSelectedDepositoId] = useState<number>(depositos[0]?.id ?? 0)
  const [data, setData] = useState<Existencia[]>(initialData?.data ?? [])
  const [meta, setMeta] = useState(
    initialData?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 }
  )
  const [page, setPage] = useState(initialData?.meta?.page ?? 1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StockStatus | null>(null)
  const [kpi, setKpi] = useState<ExistenciasKpi | null>(initialKpi)
  const [isLoading, setIsLoading] = useState(false)
  const [kpiLoading, setKpiLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Matrix view state (por_articulo)
  const [matrixData, setMatrixData] = useState<ExistenciaMatrixRow[]>([])
  const [matrixMeta, setMatrixMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 })
  const [matrixPage, setMatrixPage] = useState(1)
  const [matrixSearch, setMatrixSearch] = useState('')
  const [matrixLoading, setMatrixLoading] = useState(false)
  const matrixSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(
    async (
      fetchPage: number,
      fetchSearch: string,
      fetchStatus: StockStatus | null,
      depositoId: number
    ) => {
      if (!depositoId) return
      setIsLoading(true)
      try {
        const response = await fetchExistenciasByDepositoClient(depositoId, {
          page: fetchPage,
          limit: 20,
          search: fetchSearch || undefined,
          stockStatus: fetchStatus ?? undefined,
        })
        setData(response.data)
        setMeta(response.meta)
      } catch (error) {
        console.error('Error fetching existencias:', error)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const fetchKpi = useCallback(async () => {
    setKpiLoading(true)
    try {
      const result = await fetchExistenciasKpiClient()
      setKpi(result)
    } catch (error) {
      console.error('Error fetching KPI:', error)
    } finally {
      setKpiLoading(false)
    }
  }, [])

  const fetchMatrixData = useCallback(async (fetchPage: number, fetchSearch: string) => {
    setMatrixLoading(true)
    try {
      const response = await fetchExistenciasMatrixClient({
        page: fetchPage,
        limit: 20,
        search: fetchSearch || undefined,
      })
      setMatrixData(response.data)
      setMatrixMeta(response.meta)
    } catch (error) {
      console.error('Error fetching matrix data:', error)
    } finally {
      setMatrixLoading(false)
    }
  }, [])

  // Fetch matrix data when switching to por_articulo view
  useEffect(() => {
    if (viewMode === 'por_articulo') {
      fetchMatrixData(matrixPage, matrixSearch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode])

  // Debounced matrix search
  useEffect(() => {
    if (viewMode !== 'por_articulo') return
    if (matrixSearchTimeoutRef.current) {
      clearTimeout(matrixSearchTimeoutRef.current)
    }
    matrixSearchTimeoutRef.current = setTimeout(() => {
      setMatrixPage(1)
      fetchMatrixData(1, matrixSearch)
    }, 300)

    return () => {
      if (matrixSearchTimeoutRef.current) {
        clearTimeout(matrixSearchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixSearch])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1)
      fetchData(1, search, statusFilter, selectedDepositoId)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleDepositoChange = (value: string) => {
    const id = parseInt(value, 10)
    setSelectedDepositoId(id)
    setPage(1)
    fetchData(1, search, statusFilter, id)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchData(newPage, search, statusFilter, selectedDepositoId)
  }

  const handleFilterChange = (status: StockStatus | null) => {
    setStatusFilter(status)
    setPage(1)
    fetchData(1, search, status, selectedDepositoId)
  }

  const handleMatrixPageChange = (newPage: number) => {
    setMatrixPage(newPage)
    fetchMatrixData(newPage, matrixSearch)
  }

  const handleMatrixStockUpdate = async (
    articuloCodigo: string,
    depositoId: number,
    newValue: number
  ) => {
    // Optimistic update on matrix data
    setMatrixData(prev =>
      prev.map(row => {
        if (row.articuloCodigo !== articuloCodigo) return row
        const oldValue = row.stock[depositoId] ?? 0
        const diff = newValue - oldValue
        return {
          ...row,
          stock: { ...row.stock, [depositoId]: newValue },
          total: row.total + diff,
        }
      })
    )

    await updateExistenciaClient(articuloCodigo, depositoId, { cantidad: newValue })

    // Refetch KPI after edit
    fetchKpi()
  }

  const handleStockUpdate = async (
    articuloCodigo: string,
    depositoId: number,
    field: 'cantidad' | 'stockMinimo' | 'stockMaximo',
    value: number
  ) => {
    // Optimistic update
    setData(prev =>
      prev.map(item =>
        item.articuloCodigo === articuloCodigo && item.depositoId === depositoId
          ? { ...item, [field]: value }
          : item
      )
    )

    await updateExistenciaClient(articuloCodigo, depositoId, { [field]: value })

    // Refetch KPI after edit
    fetchKpi()
  }

  return (
    <div className="space-y-4">
      {/* View mode toggle */}
      <div className="inline-flex items-center rounded-sm border bg-background p-0.5">
        {viewModeOptions.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => setViewMode(option.value)}
            className={cn(
              'inline-flex items-center justify-center rounded-sm px-3 py-1 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              viewMode === option.value
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <ExistenciasKpiCards
        kpi={kpi}
        activeFilter={statusFilter}
        onFilterChange={handleFilterChange}
        isLoading={kpiLoading}
      />

      {viewMode === 'por_deposito' ? (
        <>
          {/* Toolbar: deposito selector + search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={String(selectedDepositoId)} onValueChange={handleDepositoChange}>
              <SelectTrigger className="h-8 w-[200px] text-sm">
                <SelectValue placeholder="Seleccionar deposito" />
              </SelectTrigger>
              <SelectContent>
                {depositos.map(dep => (
                  <SelectItem key={dep.id} value={String(dep.id)}>
                    {dep.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por codigo o nombre..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-[200px] pl-8 text-sm lg:w-[300px]"
              />
            </div>
          </div>

          {/* Table */}
          <ExistenciasPorDeposito
            data={data}
            meta={meta}
            page={page}
            onPageChange={handlePageChange}
            isLoading={isLoading}
            onStockUpdate={handleStockUpdate}
          />
        </>
      ) : (
        <>
          {/* Toolbar: search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por codigo o nombre..."
                value={matrixSearch}
                onChange={e => setMatrixSearch(e.target.value)}
                className="h-8 w-[200px] pl-8 text-sm lg:w-[300px]"
              />
            </div>
          </div>

          {/* Matrix Table */}
          <ExistenciasPorArticulo
            depositos={depositos}
            data={matrixData}
            isLoading={matrixLoading}
            onStockUpdate={handleMatrixStockUpdate}
            pageCount={matrixMeta.totalPages}
            currentPage={matrixPage}
            onPageChange={handleMatrixPageChange}
          />
        </>
      )}
    </div>
  )
}
