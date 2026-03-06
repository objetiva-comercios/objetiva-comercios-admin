'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Inventario, InventarioSector } from '@/types/inventario'
import { transitionInventarioEstado } from '@/lib/api.client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Play, CheckCircle, XCircle, ClipboardList, Loader2 } from 'lucide-react'

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

interface InventarioDetailProps {
  inventario: Inventario
  sectores: InventarioSector[]
}

export function InventarioDetail({ inventario, sectores }: InventarioDetailProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const badgeConfig = ESTADO_BADGE_MAP[inventario.estado]
  const isEditable = inventario.estado === 'pendiente' || inventario.estado === 'en_curso'

  async function handleTransition(estado: string) {
    setIsTransitioning(true)
    try {
      await transitionInventarioEstado(inventario.id, estado)
      const labels: Record<string, string> = {
        en_curso: 'Conteo iniciado',
        finalizado: 'Inventario finalizado',
        cancelado: 'Inventario cancelado',
      }
      toast({ title: labels[estado] || 'Estado actualizado' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error al cambiar estado',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsTransitioning(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/articulos/inventarios"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a inventarios
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{inventario.nombre}</h2>
            <Badge variant={badgeConfig.variant} className={badgeConfig.className}>
              {badgeConfig.label}
            </Badge>
          </div>
          {inventario.descripcion && (
            <p className="text-sm text-muted-foreground">{inventario.descripcion}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {inventario.estado === 'pendiente' && (
            <Button
              size="sm"
              disabled={isTransitioning}
              onClick={() => handleTransition('en_curso')}
            >
              {isTransitioning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Iniciar Conteo
            </Button>
          )}

          {inventario.estado === 'en_curso' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={isTransitioning}>
                  {isTransitioning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Finalizar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalizar inventario</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta accion bloqueara los conteos como solo lectura. No se podran agregar ni
                    modificar articulos. Continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleTransition('finalizado')}>
                    Finalizar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {isEditable && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isTransitioning}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar inventario</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta accion cancelara el inventario y no se podra revertir. Todos los conteos
                    registrados se mantendran pero no se podran modificar. Continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Volver</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => handleTransition('cancelado')}
                  >
                    Cancelar inventario
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Info grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informacion del Inventario</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-muted-foreground">Fecha</dt>
              <dd>{new Date(inventario.fecha).toLocaleDateString('es-MX')}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Deposito</dt>
              <dd>{inventario.depositoNombre || '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Articulos contados</dt>
              <dd>{inventario.totalArticulos ?? 0}</dd>
            </div>
            <div>
              <dt className="font-medium text-muted-foreground">Creado</dt>
              <dd>{new Date(inventario.createdAt).toLocaleDateString('es-MX')}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Sectores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sectores del Deposito</CardTitle>
        </CardHeader>
        <CardContent>
          {sectores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin sectores configurados</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sectores.map(sector => (
                <div key={sector.id} className="rounded-sm border p-3">
                  <p className="text-sm font-medium">{sector.nombre}</p>
                  {sector.columnas.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Columnas: {sector.columnas.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action bar - link to counting page */}
      {isEditable && (
        <div className="flex justify-end">
          <Button asChild>
            <Link href={`/articulos/inventarios/${inventario.id}/conteo`}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Ir al Conteo
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
