import { fetchInventarios, fetchDepositos } from '@/lib/api'
import { InventarioList } from '@/components/inventarios/inventario-list'

export default async function InventariosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; limit?: string; estado?: string }>
}) {
  const params = await searchParams

  const [inventarios, depositos] = await Promise.all([
    fetchInventarios({
      page: Number(params.page) || 1,
      limit: Number(params.limit) || 10,
      estado: params.estado,
    }),
    fetchDepositos(),
  ])

  return <InventarioList inventarios={inventarios} depositos={depositos} />
}
