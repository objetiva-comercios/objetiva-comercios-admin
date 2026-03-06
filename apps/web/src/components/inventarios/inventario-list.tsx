'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Inventario } from '@/types/inventario'
import type { Deposito } from '@/types/deposito'
import { InventarioDialog } from '@/components/inventarios/inventario-dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const ESTADO_BADGE_MAP: Record<
  Inventario['estado'],
  {
    variant: 'secondary' | 'default' | 'outline' | 'destructive'
    label: string
    className?: string
  }
> = {
  pendiente: { variant: 'secondary', label: 'Pendiente' },
  en_curso: { variant: 'default', label: 'En Curso' },
  finalizado: {
    variant: 'outline',
    label: 'Finalizado',
    className: 'text-green-600 border-green-300',
  },
  cancelado: { variant: 'destructive', label: 'Cancelado' },
}

interface InventarioListProps {
  inventarios: PaginatedResponse<Inventario>
  depositos: Deposito[]
}

export function InventarioList({ inventarios, depositos }: InventarioListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dialogOpen, setDialogOpen] = useState(false)

  const currentPage = inventarios.meta.page
  const totalPages = inventarios.meta.totalPages
  const currentEstado = searchParams.get('estado') || ''

  const updateSearchParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      if (key !== 'page') {
        params.delete('page')
      }
      router.push(`/articulos/inventarios?${params.toString()}`)
    },
    [router, searchParams]
  )

  function handleEstadoChange(value: string) {
    updateSearchParam('estado', value === 'todos' ? '' : value)
  }

  function handlePageChange(page: number) {
    updateSearchParam('page', page.toString())
  }

  function handleDialogSuccess() {
    setDialogOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Select value={currentEstado || 'todos'} onValueChange={handleEstadoChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_curso">En Curso</SelectItem>
              <SelectItem value="finalizado">Finalizado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Inventario
        </Button>
      </div>

      {inventarios.data.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No se encontraron inventarios. Crea uno para empezar.
        </div>
      ) : (
        <div className="rounded-sm border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Deposito</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Articulos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventarios.data.map(inventario => {
                const badgeConfig = ESTADO_BADGE_MAP[inventario.estado]
                return (
                  <TableRow key={inventario.id}>
                    <TableCell className="text-sm">
                      <Link
                        href={`/articulos/inventarios/${inventario.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inventario.nombre}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inventario.fecha).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inventario.depositoNombre || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badgeConfig.variant} className={badgeConfig.className}>
                        {badgeConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {inventario.totalArticulos ?? 0}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Pagina {currentPage} de {totalPages} ({inventarios.meta.total} registros)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <InventarioDialog
        depositos={depositos}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </>
  )
}
