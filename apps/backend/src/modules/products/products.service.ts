import { Injectable } from '@nestjs/common'
import { Product } from '../../data/types'
import { seedAll } from '../../data/seed'
import { PaginatedResponseDto, paginate } from '../../common/dto/paginated-response.dto'
import { ProductQueryDto } from './dto/product-query.dto'

@Injectable()
export class ProductsService {
  private products: Product[]

  constructor() {
    // Initialize once at startup
    const { products } = seedAll()
    this.products = products
  }

  findAll(query: ProductQueryDto): PaginatedResponseDto<Product> {
    let filtered = [...this.products]

    // Text search (name, description, sku)
    if (query.search) {
      const search = query.search.toLowerCase()
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search)
      )
    }

    // Filter by category
    if (query.category) {
      filtered = filtered.filter(p => p.category === query.category)
    }

    // Filter by status
    if (query.status) {
      filtered = filtered.filter(p => p.status === query.status)
    }

    // Filter by price range
    if (query.minPrice !== undefined) {
      filtered = filtered.filter(p => p.price >= query.minPrice!)
    }
    if (query.maxPrice !== undefined) {
      filtered = filtered.filter(p => p.price <= query.maxPrice!)
    }

    // Sorting
    if (query.sort) {
      const descending = query.sort.startsWith('-')
      const field = descending ? query.sort.slice(1) : query.sort
      filtered.sort((a, b) => {
        const aVal = a[field as keyof Product]
        const bVal = b[field as keyof Product]
        if (aVal < bVal) return descending ? 1 : -1
        if (aVal > bVal) return descending ? -1 : 1
        return 0
      })
    }

    // Paginate using helper from common/dto
    return paginate(filtered, query)
  }

  findOne(id: number): Product | null {
    return this.products.find(p => p.id === id) || null
  }

  getCategories(): string[] {
    return [...new Set(this.products.map(p => p.category))].sort()
  }
}
