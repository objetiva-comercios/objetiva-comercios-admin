import { colors, cn } from '@objetiva/ui'

function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <h1 className="text-3xl font-bold mb-4 text-foreground">
        Objetiva Comercios Mobile
      </h1>
      <p className="text-muted-foreground mb-8">
        Mobile Application - Foundation Ready
      </p>
      <div className="flex gap-4">
        <div
          className={cn(
            "w-14 h-14 rounded-lg",
            "bg-primary"
          )}
          title={`Primary: ${colors.primary.DEFAULT}`}
        />
        <div
          className={cn(
            "w-14 h-14 rounded-lg",
            "bg-secondary"
          )}
          title={`Secondary: ${colors.secondary.DEFAULT}`}
        />
        <div
          className={cn(
            "w-14 h-14 rounded-lg",
            "bg-destructive"
          )}
          title={`Destructive: ${colors.destructive.DEFAULT}`}
        />
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Design tokens imported from @objetiva/ui
      </p>
    </main>
  )
}

export default App
