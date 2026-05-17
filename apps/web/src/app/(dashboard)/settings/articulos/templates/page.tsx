'use client'

/**
 * Lista de templates de artículos (Phase 30, Plan 04).
 *
 * Decisión D-13 (CONTEXT.md): NO se ofrece create/delete de templates desde
 * la UI en Phase 30 — el template `default` semilla basta. El botón "Nuevo
 * template" se renderiza disabled con tooltip. Creación queda diferida a una
 * fase futura (probablemente Phase 32 o intermedia).
 *
 * Estética Tabler aplicada: padding `py-4`, gap `gap-4`, table cells `text-sm`,
 * border-radius `md` en card y tabla, buttons `h-9`. NO drag-drop builder.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchTemplates, type ArticulosTemplate } from '@/lib/api.client'
import { useToast } from '@/hooks/use-toast'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Pencil } from 'lucide-react'

export default function TemplatesPage() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<ArticulosTemplate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchTemplates({ activo: 'all' })
      .then(data => {
        if (cancelled) return
        setTemplates(data)
      })
      .catch(err => {
        if (cancelled) return
        toast({
          title: 'No se pudieron cargar los templates',
          description: err instanceof Error ? err.message : 'Error desconocido',
          variant: 'destructive',
        })
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [toast])

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Plantillas de composición SKU/Nombre para artículos. Phase 30 entrega solo el template{' '}
          <code className="font-mono">default</code>; la creación de templates adicionales queda
          diferida.
        </p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {/* span requerido porque el button está disabled — disabled bloquea pointer events */}
              <span tabIndex={0}>
                <Button size="sm" disabled aria-disabled="true">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo template
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Disponible en próxima fase — Phase 30 entrega solo el template default.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">ID</TableHead>
              <TableHead className="w-[180px]">Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[80px]">Estado</TableHead>
              <TableHead className="w-[100px] text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-64" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  Sin templates. El template `default` debería estar disponible tras aplicar la
                  migración 0008.
                </TableCell>
              </TableRow>
            ) : (
              templates.map(t => (
                <TableRow key={t.id} className={t.activo ? '' : 'text-muted-foreground'}>
                  <TableCell className="font-mono text-sm text-muted-foreground">{t.id}</TableCell>
                  <TableCell className="font-medium text-sm">{t.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.descripcion ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={t.activo ? 'default' : 'secondary'}
                      className="px-1.5 py-0 text-[11px]"
                    >
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/settings/articulos/templates/${t.id}`}>
                      <Button variant="ghost" size="sm" className="h-8">
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
