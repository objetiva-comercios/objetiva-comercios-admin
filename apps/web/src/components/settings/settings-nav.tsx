'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@objetiva/ui'
import { User, Building2, Palette } from 'lucide-react'

const settingsNavItems = [
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: User,
    description: 'Manage your personal information',
  },
  {
    title: 'Business',
    href: '/settings/business',
    icon: Building2,
    description: 'Configure business settings',
  },
  {
    title: 'Appearance',
    href: '/settings/appearance',
    icon: Palette,
    description: 'Customize theme and display',
  },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {settingsNavItems.map(item => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-0.5">
              <div>{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.description}</div>
            </div>
          </Link>
        )
      })}
    </nav>
  )
}
