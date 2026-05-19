'use client'

import { useRef, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'

import type { Articulo } from '@/types/articulo'
import { uploadArticuloImagen, deleteArticuloImagen } from '@/lib/api.client'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function getThumbUrl(url: string): string {
  return url.replace('_detail.webp', '_thumb.webp')
}

function isValidImageUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && url.length > 0 && url.toLowerCase() !== 'null'
}

const SLOT_LABELS: Record<'etiqueta' | 'producto', Record<number, string>> = {
  etiqueta: {
    1: 'Etiqueta 1',
    2: 'Etiqueta 2',
    3: 'Etiqueta 3',
  },
  producto: {
    1: 'Producto 1',
    2: 'Producto 2',
    3: 'Producto 3',
    4: 'Producto 4',
    5: 'Producto 5',
    6: 'Producto 6',
  },
}

interface ImagenSlotProps {
  tipo: 'etiqueta' | 'producto'
  slot: number
  url: string | null
  // Phase 31 Deploy 2: prop renombrada de articuloCodigo a articuloSku
  articuloSku: string
  onUpdated: (articulo: Articulo) => void
  onPreview: () => void
}

export function ImagenSlot({
  tipo,
  slot,
  url,
  articuloSku,
  onUpdated,
  onPreview,
}: ImagenSlotProps) {
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const label = SLOT_LABELS[tipo][slot] ?? `${tipo} ${slot}`

  async function uploadFile(file: File | undefined) {
    if (!file) return
    setIsUploading(true)
    try {
      // Phase 31 Deploy 2: usar articuloSku en lugar de articuloCodigo
      const result = await uploadArticuloImagen(articuloSku, tipo, slot, file)
      onUpdated(result)
      toast({ title: 'Imagen subida', description: `${label} actualizada correctamente.` })
    } catch (err) {
      toast({
        title: 'Error al subir imagen',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    try {
      // Phase 31 Deploy 2: usar articuloSku en lugar de articuloCodigo
      const result = await deleteArticuloImagen(articuloSku, tipo, slot)
      onUpdated(result)
      toast({ title: 'Imagen eliminada', description: `${label} eliminada correctamente.` })
    } catch (err) {
      toast({
        title: 'Error al eliminar imagen',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDraggingOver(false)
    uploadFile(e.dataTransfer.files[0])
  }

  function handleClick() {
    if (!isUploading) {
      inputRef.current?.click()
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
    // Reset value to allow re-selecting the same file
    e.target.value = ''
  }

  const baseClass =
    'relative aspect-square rounded-sm border-2 border-dashed transition-colors overflow-hidden'

  if (isUploading) {
    return (
      <div className={`${baseClass} border-muted-foreground/30`}>
        <Skeleton className="absolute inset-0 rounded-sm" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (isValidImageUrl(url)) {
    return (
      <div
        className={`${baseClass} border-transparent cursor-pointer group`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={onPreview}
      >
        <img
          src={`${API_BASE_URL}${getThumbUrl(url)}`}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Label overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1.5 py-0.5">
          <span className="text-[10px] text-white">{label}</span>
        </div>
        {/* Delete button */}
        <button
          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          onClick={handleDelete}
          type="button"
          aria-label={`Eliminar ${label}`}
        >
          <X className="h-3 w-3 text-white" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>
    )
  }

  return (
    <div
      className={`${baseClass} cursor-pointer flex flex-col items-center justify-center gap-1 ${
        isDraggingOver
          ? 'border-primary bg-primary/10'
          : 'border-muted-foreground/30 hover:border-muted-foreground/60 hover:bg-muted/30'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <Plus className="h-4 w-4 text-muted-foreground/60" />
      <span className="text-[10px] text-muted-foreground/60 text-center leading-tight px-1">
        {label}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  )
}
