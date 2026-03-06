import { fetchDispositivos } from '@/lib/api'
import { DispositivosList } from '@/components/dispositivos/dispositivos-list'

export default async function DispositivosPage() {
  const dispositivos = await fetchDispositivos()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Dispositivos</h2>
        <p className="text-sm text-muted-foreground">
          Gestiona los dispositivos moviles para conteo de inventario
        </p>
      </div>
      <DispositivosList dispositivos={dispositivos} />
    </div>
  )
}
