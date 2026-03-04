import { SettingsNav } from '@/components/settings/settings-nav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Administrá tu cuenta y las preferencias de la aplicación.
        </p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="lg:w-64 shrink-0">
          <SettingsNav />
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
