'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

import type { Articulo } from '@/types/articulo'
import { fetchArticuloByCodigoClient, toggleArticuloActivo } from '@/lib/api.client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ArticuloForm } from '@/components/articulos/articulo-form'
import { useToast } from '@/hooks/use-toast'

export default function EditarArticuloPage() {
  const params = useParams<{ codigo: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const codigo = decodeURIComponent(params.codigo)

  const [articulo, setArticulo] = useState<Articulo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  const loadArticulo = useCallback(async () => {
    try {
      const data = await fetchArticuloByCodigoClient(codigo)
      setArticulo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el articulo')
    } finally {
      setLoading(false)
    }
  }, [codigo])

  useEffect(() => {
    loadArticulo()
  }, [loadArticulo])

  async function handleToggle() {
    if (!articulo) return
    setToggling(true)
    try {
      const updated = await toggleArticuloActivo(articulo.codigo)
      setArticulo(updated)
      toast({
        title: updated.activo ? 'Articulo activado' : 'Articulo desactivado',
        description: `"${updated.nombre}" ahora esta ${updated.activo ? 'activo' : 'inactivo'}.`,
      })
    } catch (err) {
      toast({
        title: 'Error al cambiar el estado',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </div>
      </div>
    )
  }

  if (error || !articulo) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/articulos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{error || 'Articulo no encontrado'}</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/articulos">Volver a la lista</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/articulos">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar Articulo: {articulo.nombre}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant={articulo.activo ? 'default' : 'secondary'}>
            {articulo.activo ? 'Activo' : 'Inactivo'}
          </Badge>
          <div className="flex items-center gap-2">
            {toggling && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch checked={articulo.activo} onCheckedChange={handleToggle} disabled={toggling} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl">
        <ArticuloForm mode="edit" articulo={articulo} onSuccess={() => router.push('/articulos')} />
      </div>
    </div>
  )
}
