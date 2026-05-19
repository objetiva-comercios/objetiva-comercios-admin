export interface OrderItem {
  id: number
  articuloCodigo: string
  // Phase 31 Deploy 2: articuloSku coexiste con articuloCodigo hasta Deploy 3
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
