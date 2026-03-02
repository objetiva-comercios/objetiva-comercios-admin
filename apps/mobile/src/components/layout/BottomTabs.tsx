import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ClipboardList, Warehouse } from 'lucide-react'

const tabs = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/articles', label: 'Articles', icon: Package },
  { to: '/orders', label: 'Orders', icon: ClipboardList },
  { to: '/inventory', label: 'Inventory', icon: Warehouse },
]

export function BottomTabs() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-background border-t border-border pb-safe">
      <div className="flex">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px]',
                isActive ? 'text-primary' : 'text-muted-foreground',
              ].join(' ')
            }
          >
            <Icon size={22} />
            <span className="text-xs">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
