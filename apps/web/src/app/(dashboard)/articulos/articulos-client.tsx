'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, SearchIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ServerDataTable } from '@/components/tables/server-data-table'
import { columns, defaultColumnVisibility } from '@/components/articulos/articulos-columns'
import {
  ArticuloStatusFilter,
  type StatusFilterValue,
} from '@/components/articulos/articulo-status-filter'
import { ArticuloSheet } from '@/components/articulos/articulo-sheet'
import { fetchArticulosClient } from '@/lib/api.client'
import type { Articulo } from '@/types/articulo'

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
  const [data, setData] = useState(initialData.data)
  const [meta, setMeta] = useState(initialData.meta)
  const [page, setPage] = useState(initialData.meta.page)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('active')
  const [selectedArticulo, setSelectedArticulo] = useState<Articulo | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(
    async (fetchPage: number, fetchSearch: string, fetchStatus: StatusFilterValue) => {
      setIsLoading(true)
      try {
        const activo = fetchStatus === 'active' ? true : fetchStatus === 'inactive' ? false : null
        const response = await fetchArticulosClient({
          page: fetchPage,
          limit: 20,
          search: fetchSearch || undefined,
          activo,
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
      fetchData(1, search, statusFilter)
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
    fetchData(1, search, value)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    fetchData(newPage, search, statusFilter)
  }

  const handleRowClick = (articulo: Articulo) => {
    setSelectedArticulo(articulo)
    setSheetOpen(true)
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
              placeholder="Buscar por codigo, nombre, SKU..."
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
        columns={columns}
        data={data}
        pageCount={meta.totalPages}
        currentPage={page}
        onPageChange={handlePageChange}
        defaultColumnVisibility={defaultColumnVisibility}
        onRowClick={handleRowClick}
        isLoading={isLoading}
      />

      {/* Detail sheet */}
      <ArticuloSheet articulo={selectedArticulo} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
