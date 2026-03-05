// Dashboard types
export interface DashboardStats {
  totalArticulos: number
  activeArticulos: number
  totalOrders: number
  totalRevenue: number
  totalSales: number
  pendingOrders: number
  lowStockCount: number
  todaySales: number
  todayRevenue: number
  weekSales: number
  weekRevenue: number
}

export interface LowStockItem {
  articuloCodigo: string
  articuloNombre: string
  totalCantidad: number
  minStockMinimo: number
}

export interface RecentOrder {
  id: number
  orderNumber: string
  customerName: string
  total: number
  status: 'pending' | 'processing' | 'delivered' | 'cancelled'
  createdAt: string
}

export interface DashboardResponse {
  stats: DashboardStats
  purchases: {
    pendingOrders: number
    pendingValue: number
  }
  lowStockItems: LowStockItem[]
  recentOrders: RecentOrder[]
}

// Articulo types
export interface Articulo {
  codigo: string
  nombre: string
  sku: string | null
  codigoBarras: string | null
  observaciones: string | null
  marca: string | null
  modelo: string | null
  talle: string | null
  color: string | null
  material: string | null
  presentacion: string | null
  medida: string | null
  precio: string | null
  costo: string | null
  imagenesProducto: string[]
  imagenesEtiqueta: string[]
  etiquetasOcr: string[]
  jsonArticulo: unknown | null
  erpId: string | null
  erpCodigo: string | null
  erpNombre: string | null
  erpPrecio: string | null
  erpCosto: string | null
  erpUnidades: number | null
  erpDatos: unknown | null
  erpSincronizado: boolean | null
  erpFechaSync: string | null
  originSource: string | null
  originSyncId: string | null
  originSyncedAt: string | null
  activo: boolean
  createdAt: string
  updatedAt: string
}

// Order types
export interface OrderItem {
  id: number
  articuloCodigo: string
  articuloNombre: string
  quantity: number
  price: number
}

export interface Order {
  id: number
  orderNumber: string
  customerName: string
  customerEmail: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  shippingAddress: string
  createdAt: string
  updatedAt: string
}

// Sale types
export interface SaleItem {
  id: number
  articuloCodigo: string
  articuloNombre: string
  quantity: number
  price: number
  subtotal: number
}

export interface Sale {
  id: number
  saleNumber: string
  customerName: string
  items: SaleItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit'
  status: 'completed' | 'refunded' | 'partial_refund'
  createdAt: string
}

// Purchase types
export interface PurchaseItem {
  id: number
  articuloCodigo: string
  articuloNombre: string
  quantity: number
  unitCost: number
  subtotal: number
}

export interface Purchase {
  id: number
  purchaseNumber: string
  supplierName: string
  supplierContact: string
  items: PurchaseItem[]
  subtotal: number
  tax: number
  shipping: number
  total: number
  status: 'draft' | 'ordered' | 'received' | 'cancelled'
  expectedDelivery: string
  receivedAt: string | null
  notes: string
  createdAt: string
}
