export interface OrderItem {
  id: number
  // Phase 31 Deploy 3 (contract): articuloCodigo eliminado, solo articuloSku
  articuloSku: string
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
