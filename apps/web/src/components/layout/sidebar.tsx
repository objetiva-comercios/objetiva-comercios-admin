'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@objetiva/ui/lib/utils'
import { routes } from '@/config/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn('flex h-screen w-64 flex-col border-r bg-background', className)}>
      {/* Logo/Brand Area */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            O
          </div>
          <span className="text-lg">Objetiva</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {routes.map(route => {
            const Icon = route.icon
            const isActive = pathname === route.href || pathname.startsWith(`${route.href}/`)

            return (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{route.label}</span>
              </Link>
            )
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">Objetiva Comercios Admin</p>
      </div>
    </div>
  )
}
