import { useEffect, useRef, useState } from 'react'
import { cn } from '@objetiva/ui'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [dragDelta, setDragDelta] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const touchStartY = useRef<number | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  // Reset drag state when sheet opens/closes
  useEffect(() => {
    if (!open) {
      setDragDelta(0)
      setIsDragging(false)
      touchStartY.current = null
    }
  }, [open])

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY.current === null) return
    const delta = e.touches[0].clientY - touchStartY.current
    // Only allow downward drag
    if (delta > 0) {
      setDragDelta(delta)
    }
  }

  function handleTouchEnd() {
    setIsDragging(false)
    if (dragDelta > 100) {
      onClose()
    } else {
      setDragDelta(0)
    }
    touchStartY.current = null
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-label="Close sheet" />

      {/* Sheet panel */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto',
          !isDragging && 'transition-transform duration-300'
        )}
        style={{
          transform: open ? `translateY(${dragDelta}px)` : 'translateY(100%)',
        }}
      >
        {/* Drag handle area */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-4 py-3 border-b border-border font-semibold text-lg text-foreground">
            {title}
          </div>
        )}

        {/* Content */}
        <div className="px-4 py-4 pb-safe">{children}</div>
      </div>
    </>
  )
}
