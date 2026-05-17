'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@objetiva/ui'

const tabs = [
  { label: 'Visibilidad', href: '/settings/articulos/visibilidad' },
  { label: 'Propiedades', href: '/settings/articulos/propiedades' },
  { label: 'Templates', href: '/settings/articulos/templates' },
] as const

/**
 * Layout interno de /settings/articulos.
 *
 * Estética Tabler: tabs horizontales URL-driven con underline para el activo
 * (NO pills/background). Usa <Link> en lugar del componente Tabs de shadcn
 * porque las tabs son URL-driven (cada tab es una subruta independiente con
 * su propio loading state), no estado interno de componente.
 *
 * El triger activo se detecta con startsWith para soportar subrutas dinámicas
 * como /settings/articulos/templates/[id].
 */
export default function ArticulosSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-medium">Configuración de Artículos</h2>
        <p className="text-sm text-muted-foreground">
          Visibilidad de campos, catálogos de propiedades y templates de composición.
        </p>
      </div>

      <div className="border-b">
        <nav className="-mb-px flex gap-1" aria-label="Secciones de configuración de artículos">
          {tabs.map(tab => {
            const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-sm',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  )
}
