'use client'

import { useEffect, useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { fetchPropiedades } from '@/lib/api.client'
import { useToast } from '@/hooks/use-toast'
import { PropiedadTable } from './propiedad-table'
import { PROP_TIPOS, PROP_LABELS, type Propiedad, type PropTipo } from '@/types/propiedad'

/**
 * Página cliente con 8 tabs (Phase 30):
 * Marcas, Colores, Talles, Materiales, Presentaciones, Objetos,
 * **Familias** (con extra col + select de subcategoría), **Aplicaciones**.
 *
 * Cada `<TabsContent>` solo monta su `<PropiedadTable>` cuando coincide con
 * el `value` activo de Radix Tabs (lazy mount automático), por lo que solo
 * el tab activo dispara el fetch de datos.
 *
 * **PITFALL-9** (Phase 30 RESEARCH): el tab `familia` necesita mostrar una
 * columna extra "Subcategoría" + un select de subcategoría en el dialog de
 * create. Para eso se cargan las subcategorías activas una vez y se pasan a
 * `<PropiedadTable extraColumns=… createDialogExtras=…>`. El resto de los
 * tabs queda con render idéntico al de Phase 29 (backward-compat).
 */
export function PropiedadesPage() {
  const [activeTab, setActiveTab] = useState<PropTipo>('marca')

  return (
    <Tabs value={activeTab} onValueChange={v => setActiveTab(v as PropTipo)} className="w-full">
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
          {tipo === 'familia' ? <FamiliasTab /> : <PropiedadTable propTipo={tipo} />}
        </TabsContent>
      ))}
    </Tabs>
  )
}

/**
 * Variante del tab `familia`:
 *  - Carga subcategorías activas para mostrar el nombre legible en una
 *    columna extra (el backend devuelve `subcategoriaId: number`, no hace JOIN).
 *  - Monta un `<Select>` de subcategoría en el dialog de create + valida que
 *    se seleccione antes de submit + agrega `parentId` al body POST.
 *
 * Decisión Q3 RESOLVED (CONTEXT.md): solo se listan subcategorías ACTIVAS.
 */
function FamiliasTab() {
  const { toast } = useToast()
  const [subcategorias, setSubcategorias] = useState<Propiedad[]>([])
  const [loadingSub, setLoadingSub] = useState(true)
  const [parentId, setParentId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingSub(true)
    // Phase 30: `subcategoria` no está en `PROP_TIPOS` del frontend (no tiene
    // tab visible — solo se consume para poblar el select del dialog de Familias).
    // El backend sí la expone vía el endpoint dinámico desde Plan 30-04.
    fetchPropiedades('subcategoria' as PropTipo, { activo: true })
      .then(data => {
        if (cancelled) return
        setSubcategorias(data)
      })
      .catch(err => {
        if (cancelled) return
        toast({
          title: 'No se pudieron cargar las subcategorías',
          description: err instanceof Error ? err.message : 'Error desconocido',
          variant: 'destructive',
        })
      })
      .finally(() => {
        if (cancelled) return
        setLoadingSub(false)
      })
    return () => {
      cancelled = true
    }
  }, [toast])

  const subcategoriaLookup = useMemo(() => {
    const map: Record<number, string> = {}
    for (const s of subcategorias) map[s.id] = s.nombre
    return map
  }, [subcategorias])

  // Reset del parentId cuando se recargan las subcategorías (paranoid).
  useEffect(() => {
    setParentId(null)
  }, [subcategorias])

  return (
    <PropiedadTable
      propTipo="familia"
      extraColumns={[
        {
          header: 'Subcategoría',
          className: 'w-[180px]',
          cell: row => {
            const id = row.subcategoriaId
            if (id == null) return <span className="text-muted-foreground">—</span>
            const name = subcategoriaLookup[id]
            return name ?? <span className="text-muted-foreground">#{id}</span>
          },
        },
      ]}
      createDialogExtras={{
        extraFields: (
          <div className="space-y-2">
            <Label htmlFor="familia-subcategoria-select" className="text-sm">
              Subcategoría
            </Label>
            <Select
              value={parentId != null ? String(parentId) : undefined}
              onValueChange={v => setParentId(Number(v))}
              disabled={loadingSub || subcategorias.length === 0}
            >
              <SelectTrigger id="familia-subcategoria-select" className="h-9">
                <SelectValue
                  placeholder={
                    loadingSub
                      ? 'Cargando subcategorías…'
                      : subcategorias.length === 0
                        ? 'No hay subcategorías activas'
                        : 'Seleccioná una subcategoría'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subcategorias.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              La familia se asocia a una subcategoría existente.
            </p>
          </div>
        ),
        buildExtraPayload: () => ({ parentId }),
        validateExtra: () => (parentId == null ? 'Seleccioná una subcategoría' : null),
      }}
    />
  )
}
