import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'

const PATH_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/articles': 'Articles',
  '/orders': 'Orders',
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/purchases': 'Purchases',
  '/profile': 'Profile',
  '/settings': 'Settings',
}

interface AppHeaderProps {
  onMenuOpen: () => void
}

export function AppHeader({ onMenuOpen }: AppHeaderProps) {
  const location = useLocation()
  const title = PATH_TITLES[location.pathname] ?? 'Objetiva Comercios'

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center h-14 px-4 gap-3">
        <button
          onClick={onMenuOpen}
          aria-label="Open menu"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 text-foreground"
        >
          <Menu size={24} />
        </button>
        <h1 className="font-semibold text-lg text-foreground flex-1">{title}</h1>
      </div>
    </header>
  )
}
