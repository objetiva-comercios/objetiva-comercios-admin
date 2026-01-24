export interface PaginatedMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export class PaginatedResponseDto<T> {
  data: T[]
  meta: PaginatedMeta

  constructor(data: T[], meta: PaginatedMeta) {
    this.data = data
    this.meta = meta
  }
}

export function paginate<T>(
  items: T[],
  query: { page?: number; limit?: number }
): PaginatedResponseDto<T> {
  const page = query.page ?? 1
  const limit = query.limit ?? 20

  // Calculate pagination
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const data = items.slice(startIndex, endIndex)

  // Calculate total pages
  const total = items.length
  const totalPages = Math.ceil(total / limit)

  return new PaginatedResponseDto(data, {
    total,
    page,
    limit,
    totalPages,
  })
}
