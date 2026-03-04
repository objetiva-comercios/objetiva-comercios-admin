'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { cn } from '@objetiva/ui/lib/utils'
import { routes } from '@/config/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface MobileNavProps {
  branding?: { companyName: string; logoSquare: string | null }
}

export function MobileNav({ branding }: MobileNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const companyName = branding?.companyName ?? 'Comercio Ejemplo'

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú de navegación</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 bg-background">
        <div className="flex h-full flex-col">
          {/* Logo/Brand Area */}
          <div className="flex h-14 items-center border-b px-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold"
              onClick={() => setOpen(false)}
            >
              {branding?.logoSquare ? (
                <img
                  src={`${API_BASE_URL}/api/uploads/${branding.logoSquare}`}
                  alt={companyName}
                  className="h-8 w-8 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  {companyName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-lg">{companyName}</span>
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
                    onClick={() => setOpen(false)}
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
            <p className="text-xs text-muted-foreground">{companyName} Admin</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
