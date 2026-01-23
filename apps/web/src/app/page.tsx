import { colors, cn } from '@objetiva/ui'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">
        Objetiva Comercios Admin
      </h1>
      <p className="text-muted-foreground mb-8">
        Web Application - Foundation Ready
      </p>
      <div className="flex gap-4">
        <div
          className={cn(
            "w-16 h-16 rounded-lg",
            "bg-primary"
          )}
          title={`Primary: ${colors.primary.DEFAULT}`}
        />
        <div
          className={cn(
            "w-16 h-16 rounded-lg",
            "bg-secondary"
          )}
          title={`Secondary: ${colors.secondary.DEFAULT}`}
        />
        <div
          className={cn(
            "w-16 h-16 rounded-lg",
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
