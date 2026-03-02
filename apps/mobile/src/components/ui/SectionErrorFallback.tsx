import { useEffect } from 'react'

interface SectionErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function SectionErrorFallback({ error, resetErrorBoundary }: SectionErrorFallbackProps) {
  useEffect(() => {
    console.error('[Section Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
      <p className="text-sm text-muted-foreground">Unable to load this section.</p>
      <button className="text-primary text-sm underline" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  )
}
