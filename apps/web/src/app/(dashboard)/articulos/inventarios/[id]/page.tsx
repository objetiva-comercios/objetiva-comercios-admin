import { fetchInventario, fetchSectores } from '@/lib/api'
import { InventarioDetail } from '@/components/inventarios/inventario-detail'
import { notFound } from 'next/navigation'

export default async function InventarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idParam } = await params
  const id = Number(idParam)
  if (isNaN(id)) notFound()

  const inventario = await fetchInventario(id)
  const sectores = await fetchSectores(inventario.depositoId)

  return <InventarioDetail inventario={inventario} sectores={sectores} />
}
