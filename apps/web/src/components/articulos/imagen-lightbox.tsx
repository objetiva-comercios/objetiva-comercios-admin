'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface ImagenLightboxProps {
  images: string[] // detail URLs (non-null only, already filtered)
  initialIndex: number // which image to show first
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImagenLightbox({ images, initialIndex, open, onOpenChange }: ImagenLightboxProps) {
  const [current, setCurrent] = useState(initialIndex)

  // Sync current to initialIndex when lightbox opens
  useEffect(() => {
    if (open) {
      setCurrent(initialIndex)
    }
  }, [open, initialIndex])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        setCurrent(prev => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        setCurrent(prev => Math.min(images.length - 1, prev + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, images.length])

  if (images.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 bg-black/95 border-none">
        {/* Visually hidden title for accessibility (Radix requires DialogTitle) */}
        <DialogTitle className="sr-only">Vista previa de imagen</DialogTitle>

        {/* Image container */}
        <div className="relative flex items-center justify-center min-h-[300px]">
          <img
            src={API_BASE_URL + images[current]}
            className="max-h-[80vh] w-auto mx-auto object-contain"
            alt=""
          />

          {/* Left arrow */}
          <button
            onClick={() => setCurrent(prev => Math.max(0, prev - 1))}
            disabled={current === 0}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Imagen anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Right arrow */}
          <button
            onClick={() => setCurrent(prev => Math.min(images.length - 1, prev + 1))}
            disabled={current === images.length - 1}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            aria-label="Imagen siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Position indicator */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/80 text-sm bg-black/40 px-3 py-1 rounded-full">
              {current + 1} / {images.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
