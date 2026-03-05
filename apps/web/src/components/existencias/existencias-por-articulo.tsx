'use client'

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InlineEditCell } from '@/components/existencias/inline-edit-cell'
import { cn } from '@/lib/utils'
import type { Deposito } from '@/types/deposito'
import type { ExistenciaMatrixRow } from '@/types/existencia'

interface ExistenciasPorArticuloProps {
  depositos: Deposito[]
  data: ExistenciaMatrixRow[]
  isLoading: boolean
  onStockUpdate: (articuloCodigo: string, depositoId: number, newValue: number) => Promise<void>
  pageCount: number
  currentPage: number
  onPageChange: (page: number) => void
}

const CODIGO_WIDTH = 120
const NOMBRE_WIDTH = 200

export function ExistenciasPorArticulo({
  depositos,
  data,
  isLoading,
  onStockUpdate,
  pageCount,
  currentPage,
  onPageChange,
}: ExistenciasPorArticuloProps) {
  const canPreviousPage = currentPage > 1
  const canNextPage = currentPage < pageCount

  return (
    <div className="space-y-4">
      {/* Scrollable matrix table */}
      <div className="overflow-x-auto border rounded-sm">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {/* Frozen: Codigo */}
              <th
                className="sticky left-0 z-10 bg-muted/50 h-8 px-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b"
                style={{ width: CODIGO_WIDTH, minWidth: CODIGO_WIDTH }}
              >
                Codigo
              </th>
              {/* Frozen: Articulo */}
              <th
                className={cn(
                  'sticky z-10 bg-muted/50 h-8 px-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b',
                  'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
                )}
                style={{ left: CODIGO_WIDTH, width: NOMBRE_WIDTH, minWidth: NOMBRE_WIDTH }}
              >
                Articulo
              </th>
              {/* Dynamic deposito columns */}
              {depositos.map(dep => (
                <th
                  key={dep.id}
                  className="h-8 px-2 text-left font-medium text-muted-foreground whitespace-nowrap border-b bg-muted/50"
                  style={{ width: 100, minWidth: 100 }}
                  title={dep.nombre}
                >
                  <span className="block max-w-[84px] truncate">{dep.nombre}</span>
                </th>
              ))}
              {/* Total column */}
              <th
                className="h-8 px-2 text-right font-medium text-muted-foreground whitespace-nowrap border-b bg-muted/50"
                style={{ width: 80, minWidth: 80 }}
              >
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td
                    className="sticky left-0 z-10 bg-background h-9 px-2 border-b"
                    style={{ width: CODIGO_WIDTH, minWidth: CODIGO_WIDTH }}
                  >
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td
                    className="sticky z-10 bg-background h-9 px-2 border-b shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                    style={{ left: CODIGO_WIDTH, width: NOMBRE_WIDTH, minWidth: NOMBRE_WIDTH }}
                  >
                    <Skeleton className="h-4 w-32" />
                  </td>
                  {depositos.map(dep => (
                    <td key={dep.id} className="h-9 px-2 border-b">
                      <Skeleton className="h-4 w-10" />
                    </td>
                  ))}
                  <td className="h-9 px-2 border-b text-right">
                    <Skeleton className="h-4 w-10 ml-auto" />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={depositos.length + 3}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No hay existencias registradas
                </td>
              </tr>
            ) : (
              data.map(row => (
                <tr key={row.articuloCodigo} className="hover:bg-muted/30">
                  {/* Frozen: Codigo */}
                  <td
                    className="sticky left-0 z-10 bg-background h-9 px-2 border-b whitespace-nowrap font-mono text-sm"
                    style={{ width: CODIGO_WIDTH, minWidth: CODIGO_WIDTH }}
                  >
                    {row.articuloCodigo}
                  </td>
                  {/* Frozen: Articulo */}
                  <td
                    className={cn(
                      'sticky z-10 bg-background h-9 px-2 border-b whitespace-nowrap',
                      'shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]'
                    )}
                    style={{ left: CODIGO_WIDTH, width: NOMBRE_WIDTH, minWidth: NOMBRE_WIDTH }}
                  >
                    <span className="block max-w-[184px] truncate" title={row.articuloNombre}>
                      {row.articuloNombre}
                    </span>
                  </td>
                  {/* Dynamic deposito cells */}
                  {depositos.map(dep => (
                    <td key={dep.id} className="h-9 px-0 border-b whitespace-nowrap">
                      <InlineEditCell
                        value={row.stock[dep.id] ?? 0}
                        onSave={async (newValue: number) => {
                          await onStockUpdate(row.articuloCodigo, dep.id, newValue)
                        }}
                      />
                    </td>
                  ))}
                  {/* Total */}
                  <td className="h-9 px-2 border-b whitespace-nowrap text-right font-semibold tabular-nums">
                    {row.total}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
