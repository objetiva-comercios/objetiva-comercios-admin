'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react'

import type { Articulo } from '@/types/articulo'
import { fetchArticuloByCodigoClient, toggleArticuloActivo } from '@/lib/api.client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ArticuloForm } from '@/components/articulos/articulo-form'
import { useToast } from '@/hooks/use-toast'

function ImagePlaceholderGrid({ title, count }: { title: string; count: number }) {
  return (
    <div className="border rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </h3>
        <Button variant="ghost" size="sm" className="h-7 text-xs" disabled>
          <ImagePlus className="mr-1 h-3.5 w-3.5" />
          Subir
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm bg-muted flex items-center justify-center"
          >
            <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
          </div>
        ))}
      </div>
      <div className="border-2 border-dashed rounded-sm p-4 text-center">
        <p className="text-xs text-muted-foreground">Arrastra imagenes o hace click para subir</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Disponible proximamente</p>
      </div>
    </div>
  )
}

export default function EditarArticuloPage() {
  const params = useParams<{ codigo: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const codigo = decodeURIComponent(params.codigo)

  const [articulo, setArticulo] = useState<Articulo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showToggleDialog, setShowToggleDialog] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

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

  async function handleConfirmToggle() {
    if (!articulo) return
    setShowToggleDialog(false)
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
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
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
    <>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background border-b -mx-6 px-6 py-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/articulos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <h1 className="text-lg font-semibold tracking-tight truncate max-w-[300px]">
              Editar: {articulo.nombre}
            </h1>
            <Badge variant={articulo.activo ? 'default' : 'secondary'} className="shrink-0">
              {articulo.activo ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={articulo.activo ? 'destructive' : 'outline'}
              size="sm"
              className="h-8 text-sm"
              onClick={() => setShowToggleDialog(true)}
            >
              {articulo.activo ? 'Desactivar' : 'Reactivar'}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 text-sm"
              form="articulo-edit-form"
              disabled={formLoading}
            >
              {formLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Guardar
            </Button>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Form */}
        <div>
          <ArticuloForm
            mode="edit"
            articulo={articulo}
            onSuccess={() => router.push('/articulos')}
            showSubmitButton={false}
            onLoadingChange={setFormLoading}
            formId="articulo-edit-form"
          />
        </div>

        {/* Right: Image placeholders */}
        <div className="space-y-4">
          <ImagePlaceholderGrid title="Imagenes Producto" count={6} />
          <ImagePlaceholderGrid title="Imagenes Etiquetas" count={3} />
        </div>
      </div>

      <AlertDialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {articulo.activo ? '¿Desactivar articulo?' : '¿Reactivar articulo?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {articulo.activo
                ? `"${articulo.nombre}" no aparecera en la lista principal.`
                : `"${articulo.nombre}" volvera a aparecer en la lista.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmToggle}>
              {articulo.activo ? 'Desactivar' : 'Reactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
