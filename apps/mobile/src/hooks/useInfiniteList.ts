import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchWithAuth, type PaginatedResponse } from '../lib/api'

const PAGE_SIZE = 20

export function useInfiniteList<T>(
  endpoint: string,
  params: Record<string, string> = {},
  options?: { enabled?: boolean }
) {
  return useInfiniteQuery<PaginatedResponse<T>>({
    queryKey: [endpoint, params],
    queryFn: ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({
        page: String(pageParam),
        limit: String(PAGE_SIZE),
        ...params,
      })
      return fetchWithAuth<PaginatedResponse<T>>(`${endpoint}?${qs}`)
    },
    initialPageParam: 1,
    getNextPageParam: lastPage =>
      lastPage.meta.page < lastPage.meta.totalPages ? lastPage.meta.page + 1 : undefined,
    enabled: options?.enabled ?? true,
  })
}
