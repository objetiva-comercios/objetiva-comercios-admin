import { fetchDepositos } from '@/lib/api'
import { fetchExistencias, fetchExistenciasKpi } from '@/lib/api'
import { ExistenciasClient } from './existencias-client'

export default async function ExistenciasPage() {
  const depositos = await fetchDepositos()
  const activeDepositos = depositos.filter(d => d.activo)

  let initialData = null
  let initialKpi = null

  if (activeDepositos.length > 0) {
    const [existencias, kpi] = await Promise.all([
      fetchExistencias({ depositoId: activeDepositos[0].id, page: 1, limit: 20 }),
      fetchExistenciasKpi(),
    ])
    initialData = existencias
    initialKpi = kpi
  }

  return (
    <ExistenciasClient
      depositos={activeDepositos}
      initialData={initialData}
      initialKpi={initialKpi}
    />
  )
}
