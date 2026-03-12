'use client'

import type { Articulo } from '@/types/articulo'
import { ImagenSlot } from '@/components/articulos/imagen-slot'

const MAX_SLOTS: Record<'etiqueta' | 'producto', number> = {
  etiqueta: 3,
  producto: 6,
}

const TITLES: Record<'etiqueta' | 'producto', string> = {
  etiqueta: 'Imagenes Etiquetas',
  producto: 'Imagenes Producto',
}

interface ImagenSlotGridProps {
  tipo: 'etiqueta' | 'producto'
  urls: (string | null)[]
  articuloCodigo: string
  onUpdated: (articulo: Articulo) => void
  onPreview: (index: number) => void
}

export function ImagenSlotGrid({
  tipo,
  urls,
  articuloCodigo,
  onUpdated,
  onPreview,
}: ImagenSlotGridProps) {
  const count = MAX_SLOTS[tipo]
  const title = TITLES[tipo]

  return (
    <div className="border rounded-sm p-4 space-y-3">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <ImagenSlot
            key={index}
            tipo={tipo}
            slot={index + 1}
            url={urls[index] ?? null}
            articuloCodigo={articuloCodigo}
            onUpdated={onUpdated}
            onPreview={() => onPreview(index)}
          />
        ))}
      </div>
    </div>
  )
}
