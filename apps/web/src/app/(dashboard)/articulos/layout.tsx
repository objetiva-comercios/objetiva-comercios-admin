'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Listado', href: '/articulos' },
  { label: 'Existencias', href: '/articulos/existencias' },
  { label: 'Inventarios', href: '/articulos/inventarios' },
]

export default function ArticulosLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/articulos') {
      return pathname === '/articulos'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Articulos</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu catalogo de articulos e inventario.
        </p>
      </div>
      <div className="flex gap-4 border-b">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'border-b-2 pb-2 text-sm transition-colors',
              isActive(tab.href)
                ? 'border-primary font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  )
}
