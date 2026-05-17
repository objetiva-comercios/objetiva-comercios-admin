import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  ClipboardList,
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
    label: 'Panel',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    label: 'Artículos',
    icon: Package,
    href: '/articulos',
  },
  {
    label: 'Compras',
    icon: ShoppingCart,
    href: '/purchases',
  },
  {
    label: 'Ventas',
    icon: ShoppingBag,
    href: '/sales',
  },
  {
    label: 'Pedidos',
    icon: ClipboardList,
    href: '/orders',
  },
  {
    label: 'Configuración',
    icon: Settings,
    href: '/settings',
  },
]
