'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h3 className="text-lg font-semibold">Unable to load dashboard</h3>
      <p className="text-muted-foreground text-sm">Something went wrong. Please try again.</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
