import { NavLink, useNavigate } from 'react-router-dom'
import { ShoppingBag, ShoppingCart, UserCircle, Settings, LogOut } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const navItems = [
  { to: '/sales', label: 'Sales', icon: ShoppingBag },
  { to: '/purchases', label: 'Purchases', icon: ShoppingCart },
  { to: '/profile', label: 'Profile', icon: UserCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
]

interface DrawerNavProps {
  open: boolean
  onClose: () => void
}

export function DrawerNav({ open, onClose }: DrawerNavProps) {
  const navigate = useNavigate()

  async function handleLogout() {
    onClose()
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Backdrop overlay */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden="true" />
      )}

      {/* Drawer panel */}
      <div
        className={[
          'fixed left-0 top-0 bottom-0 z-50 w-72 bg-background flex flex-col',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Branding */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-border">
          <div className="w-9 h-9 bg-primary rounded-lg flex-shrink-0" />
          <span className="font-semibold text-base text-foreground">Objetiva Comercios</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium min-h-[44px]',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                ].join(' ')
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Divider + Logout */}
        <div className="border-t border-border px-3 py-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 min-h-[44px]"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  )
}
