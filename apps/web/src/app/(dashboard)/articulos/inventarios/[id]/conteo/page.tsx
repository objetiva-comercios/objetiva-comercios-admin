import { fetchInventario } from '@/lib/api'
import { ConteoTable } from '@/components/inventarios/conteo-table'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ConteoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params
  const id = Number(idParam)
  if (isNaN(id)) notFound()

  const inventario = await fetchInventario(id)

  const isReadOnly = inventario.estado === 'finalizado' || inventario.estado === 'cancelado'

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/articulos/inventarios/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          &larr; Volver al detalle
        </Link>
        <h2 className="text-xl font-bold">{inventario.nombre}</h2>
        <p className="text-sm text-muted-foreground">
          Conteo de inventario &mdash; {inventario.depositoNombre} &mdash; Estado:{' '}
          {inventario.estado}
        </p>
      </div>

      {isReadOnly && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Este inventario esta {inventario.estado === 'finalizado' ? 'finalizado' : 'cancelado'}.
          Los conteos son de solo lectura.
        </div>
      )}

      <ConteoTable inventarioId={id} estado={inventario.estado} />
    </div>
  )
}
