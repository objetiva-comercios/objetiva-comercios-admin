'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { fetchSettingsClient, updateSettings } from '@/lib/api.client'
import { invalidateArticulosConfig } from '@/hooks/use-articulos-config'
import type { CamposVisibles } from '@/types/articulos-config'
import { DEFAULT_ARTICULOS_CONFIG, CAMPOS_LABELS } from '@/types/articulos-config'

interface ToggleGroupProps {
  title: string
  description: string
  campos: (keyof CamposVisibles)[]
  values: CamposVisibles
  onChange: (campo: keyof CamposVisibles, value: boolean) => void
}

function ToggleGroup({ title, description, campos, values, onChange }: ToggleGroupProps) {
  return (
    <div className="border rounded-sm p-4 space-y-3">
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        {campos.map(campo => (
          <div key={campo} className="flex items-center justify-between py-1">
            <Label htmlFor={campo} className="text-sm font-normal cursor-pointer">
              {CAMPOS_LABELS[campo]}
            </Label>
            <Switch
              id={campo}
              checked={values[campo]}
              onCheckedChange={checked => onChange(campo, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ArticulosSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<CamposVisibles>(DEFAULT_ARTICULOS_CONFIG.camposVisibles)

  useEffect(() => {
    fetchSettingsClient()
      .then(settings => {
        if (settings.articulosConfig?.camposVisibles) {
          setConfig(settings.articulosConfig.camposVisibles)
        }
      })
      .catch(() => {
        toast({
          title: 'Error al cargar configuración',
          variant: 'destructive',
        })
      })
      .finally(() => setLoading(false))
  }, [toast])

  async function handleToggle(campo: keyof CamposVisibles, value: boolean) {
    const previous = config
    const updated = { ...config, [campo]: value }

    // Optimistic update
    setConfig(updated)

    try {
      await updateSettings({ articulosConfig: { camposVisibles: updated } })
      invalidateArticulosConfig()
    } catch {
      // Revert on error
      setConfig(previous)
      toast({
        title: 'Error al guardar',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Artículos</h2>
        <p className="text-muted-foreground">
          Configurá qué campos se muestran en formularios, listados y detalle de artículos.
        </p>
      </div>

      <div className="space-y-4">
        <ToggleGroup
          title="Propiedades físicas"
          description="Características del producto"
          campos={[
            'marca',
            'modelo',
            'talle',
            'color',
            'material',
            'presentacion',
            'medida',
            'objeto',
          ]}
          values={config}
          onChange={handleToggle}
        />

        <ToggleGroup
          title="Identificación adicional"
          description="Códigos opcionales de identificación"
          campos={['sku', 'codigoBarras']}
          values={config}
          onChange={handleToggle}
        />

        <ToggleGroup
          title="Precios"
          description="El precio de venta siempre se muestra"
          campos={['costo']}
          values={config}
          onChange={handleToggle}
        />

        <ToggleGroup
          title="Secciones"
          description="Secciones completas del módulo de artículos"
          campos={['observaciones', 'erp', 'erpUnidades', 'origen']}
          values={config}
          onChange={handleToggle}
        />
      </div>
    </div>
  )
}
