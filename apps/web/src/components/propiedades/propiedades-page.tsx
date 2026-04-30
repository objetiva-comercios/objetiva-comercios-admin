'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PropiedadTable } from './propiedad-table'
import { PROP_TIPOS, PROP_LABELS, type PropTipo } from '@/types/propiedad'

/**
 * Página cliente con 6 tabs (Marcas, Colores, Talles, Materiales,
 * Presentaciones, Objetos). Cada `<TabsContent>` solo monta su
 * `<PropiedadTable>` cuando coincide con el `value` activo de Radix Tabs
 * (lazy mount automático), por lo que solo el tab activo dispara el fetch
 * de datos.
 */
export function PropiedadesPage() {
  const [activeTab, setActiveTab] = useState<PropTipo>('marca')

  return (
    <Tabs
      value={activeTab}
      onValueChange={v => setActiveTab(v as PropTipo)}
      className="w-full"
    >
      <TabsList className="w-full justify-start">
        {PROP_TIPOS.map(tipo => (
          <TabsTrigger key={tipo} value={tipo}>
            {PROP_LABELS[tipo].plural}
          </TabsTrigger>
        ))}
      </TabsList>
      {PROP_TIPOS.map(tipo => (
        <TabsContent key={tipo} value={tipo} className="mt-4">
          {/* Radix monta esto solo cuando value === activeTab — lazy automático. */}
          <PropiedadTable propTipo={tipo} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
