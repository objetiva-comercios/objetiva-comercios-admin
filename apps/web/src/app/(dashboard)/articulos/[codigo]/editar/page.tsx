'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

import type { Articulo } from '@/types/articulo'
import { fetchArticuloByCodigoClient, toggleArticuloActivo, deleteArticulo } from '@/lib/api.client'
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
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ArticuloForm } from '@/components/articulos/articulo-form'
import { ImagenSlotGrid } from '@/components/articulos/imagen-slot-grid'
import { ImagenLightbox } from '@/components/articulos/imagen-lightbox'
import { useToast } from '@/hooks/use-toast'

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
  const [lightbox, setLightbox] = useState<{ images: string[]; initialIndex: number } | null>(null)

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
      if (articulo.activo) {
        await deleteArticulo(articulo.codigo)
        toast({
          title: 'Articulo desactivado',
          description: `"${articulo.nombre}" fue desactivado.`,
        })
        router.push('/articulos')
      } else {
        const updated = await toggleArticuloActivo(articulo.codigo)
        setArticulo(updated)
        toast({ title: 'Articulo reactivado', description: `"${articulo.nombre}" fue reactivado.` })
      }
    } catch (err) {
      toast({
        title: 'Error al cambiar el estado',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    }
  }

  function openLightbox(tipo: 'etiqueta' | 'producto', slotIndex: number) {
    if (!articulo) return
    const urls = tipo === 'producto' ? articulo.imagenesProducto : articulo.imagenesEtiqueta
    const nonNullUrls = urls.filter((u): u is string => u != null)
    const url = urls[slotIndex]
    if (!url) return
    const indexInFiltered = nonNullUrls.indexOf(url)
    setLightbox({ images: nonNullUrls, initialIndex: Math.max(0, indexInFiltered) })
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
            <Button variant="outline" size="sm" asChild className="h-8 text-sm shrink-0">
              <Link href="/articulos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <h1 className="text-lg font-semibold tracking-tight">Editar: {articulo.nombre}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
            onToggleActivo={() => setShowToggleDialog(true)}
            isActivo={articulo.activo}
          />
        </div>

        {/* Right: Image grids */}
        <div className="space-y-4">
          <ImagenSlotGrid
            tipo="producto"
            urls={articulo.imagenesProducto}
            articuloCodigo={articulo.codigo}
            onUpdated={setArticulo}
            onPreview={index => openLightbox('producto', index)}
          />
          <ImagenSlotGrid
            tipo="etiqueta"
            urls={articulo.imagenesEtiqueta}
            articuloCodigo={articulo.codigo}
            onUpdated={setArticulo}
            onPreview={index => openLightbox('etiqueta', index)}
          />
        </div>
      </div>

      <ImagenLightbox
        images={lightbox?.images ?? []}
        initialIndex={lightbox?.initialIndex ?? 0}
        open={lightbox !== null}
        onOpenChange={open => {
          if (!open) setLightbox(null)
        }}
      />

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
