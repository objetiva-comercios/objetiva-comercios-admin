import {
  LayoutDashboard,
  Package,
  Tags,
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
    label: 'Propiedades',
    icon: Tags,
    href: '/propiedades',
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
