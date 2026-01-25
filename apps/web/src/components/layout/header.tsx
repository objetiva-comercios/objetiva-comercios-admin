import { MobileNav } from './mobile-nav'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

interface HeaderProps {
  user: {
    email: string
    name?: string
    avatar_url?: string
  }
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Mobile Navigation Trigger */}
      <MobileNav />

      {/* Breadcrumb/Title Area (placeholder for now) */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu user={user} />
      </div>
    </header>
  )
}
