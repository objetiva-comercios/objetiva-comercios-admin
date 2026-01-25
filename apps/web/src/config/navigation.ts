import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  ClipboardList,
  Warehouse,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export type NavRoute = {
  label: string
  icon: LucideIcon
  href: string
}

export const routes: NavRoute[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    label: 'Articles',
    icon: Package,
    href: '/articles',
  },
  {
    label: 'Purchases',
    icon: ShoppingCart,
    href: '/purchases',
  },
  {
    label: 'Sales',
    icon: ShoppingBag,
    href: '/sales',
  },
  {
    label: 'Orders',
    icon: ClipboardList,
    href: '/orders',
  },
  {
    label: 'Inventory',
    icon: Warehouse,
    href: '/inventory',
  },
  {
    label: 'Settings',
    icon: Settings,
    href: '/settings',
  },
]
