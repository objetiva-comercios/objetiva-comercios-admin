'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function ArticlesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Articles Error]', error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h3 className="text-lg font-semibold">No se pudieron cargar los artículos</h3>
      <p className="text-muted-foreground text-sm">Algo salió mal. Por favor, intentá de nuevo.</p>
      <Button variant="outline" onClick={reset}>
        Intentar de nuevo
      </Button>
    </div>
  )
}
