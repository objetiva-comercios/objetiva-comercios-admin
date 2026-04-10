'use client'

import * as React from 'react'
import {
  ColumnDef,
  VisibilityState,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SlidersHorizontalIcon } from 'lucide-react'

interface ServerDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageCount: number
  currentPage: number
  onPageChange: (page: number) => void
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void
  onRowClick?: (row: TData) => void
  isLoading?: boolean
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc'
  onSortChange?: (sortBy: string | null, sortOrder: 'asc' | 'desc') => void
}

export function ServerDataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  currentPage,
  onPageChange,
  columnVisibility: columnVisibilityProp,
  onColumnVisibilityChange,
  onRowClick,
  isLoading = false,
  sortBy,
  sortOrder,
  onSortChange,
}: ServerDataTableProps<TData, TValue>) {
  const memoizedData = React.useMemo(() => data, [data])
  const memoizedColumns = React.useMemo(() => columns, [columns])

  const controlledVisibility = columnVisibilityProp ?? {}

  const sorting = React.useMemo<SortingState>(
    () => (sortBy ? [{ id: sortBy, desc: sortOrder === 'desc' }] : []),
    [sortBy, sortOrder]
  )

  const table = useReactTable({
    data: memoizedData,
    columns: memoizedColumns,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    enableSortingRemoval: true,
    onColumnVisibilityChange: updaterOrValue => {
      const newState =
        typeof updaterOrValue === 'function' ? updaterOrValue(controlledVisibility) : updaterOrValue
      // Find which column changed and call the callback
      if (onColumnVisibilityChange) {
        const allKeys = new Set([...Object.keys(controlledVisibility), ...Object.keys(newState)])
        for (const key of allKeys) {
          if (controlledVisibility[key] !== newState[key]) {
            onColumnVisibilityChange(key, newState[key] ?? true)
          }
        }
      }
    },
    onSortingChange: updater => {
      if (!onSortChange) return
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater
      if (newSorting.length === 0) {
        onSortChange(null, 'desc')
      } else {
        onSortChange(newSorting[0].id, newSorting[0].desc ? 'desc' : 'asc')
      }
    },
    state: {
      columnVisibility: controlledVisibility,
      sorting,
      pagination: {
        pageIndex: currentPage - 1,
        pageSize: data.length || 20,
      },
    },
  })

  const canPreviousPage = currentPage > 1
  const canNextPage = currentPage < pageCount

  return (
    <div className="space-y-4">
      {/* Column visibility toggle */}
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-sm">
              <SlidersHorizontalIcon className="mr-2 h-4 w-4" />
              Columnas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[180px]">
            {table
              .getAllColumns()
              .filter(column => column.getCanHide())
              .map(column => {
                const header = column.columnDef.header
                const label = typeof header === 'string' ? header : column.id
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="text-sm"
                    checked={column.getIsVisible()}
                    onCheckedChange={value => column.toggleVisibility(!!value)}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-sm border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="text-sm px-2 py-1.5">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="text-sm px-2 py-1.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm">
                  No se encontraron resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Server-side pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1" />
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-[120px] items-center justify-center text-sm font-medium">
            Pagina {currentPage} de {pageCount || 1}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => onPageChange(1)}
              disabled={!canPreviousPage}
            >
              <span className="sr-only">Ir a la primera pagina</span>
              <ChevronsLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canPreviousPage}
            >
              <span className="sr-only">Ir a la pagina anterior</span>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canNextPage}
            >
              <span className="sr-only">Ir a la pagina siguiente</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => onPageChange(pageCount)}
              disabled={!canNextPage}
            >
              <span className="sr-only">Ir a la ultima pagina</span>
              <ChevronsRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
