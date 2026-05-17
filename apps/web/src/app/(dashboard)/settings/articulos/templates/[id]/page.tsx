'use client'

/**
 * Detalle + edición de atributos de un template (Phase 30, Plan 04).
 *
 * Form simple (D-13: NO drag-drop builder visual). Tabla con una fila por
 * atributo del template; cada fila tiene 4 controles editables:
 *   - ordenNombre (number nullable)
 *   - ordenSku   (number nullable)
 *   - esVariante (switch)
 *   - customSlot (number 1-3 nullable)
 *
 * Guardar → PATCH /templates/:id/atributos (reemplazo completo, transaccional
 * en el backend). NO permite agregar/eliminar filas en Phase 30.
 *
 * Estética Tabler: inputs `h-9`, table `text-sm`, padding consistente.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  fetchTemplate,
  patchTemplateAtributos,
  type ArticulosTemplateWithAtributos,
} from '@/lib/api.client'
import type { TemplateAtributo } from '@objetiva/types'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Loader2, ArrowLeft, Plus, Save } from 'lucide-react'

type DraftAtributo = {
  atributoTipo: string
  /** strings para soportar empty input ⇨ null; se parsean al submit */
  ordenNombre: string
  ordenSku: string
  esVariante: boolean
  customSlot: string
}

function toDraft(a: TemplateAtributo): DraftAtributo {
  return {
    atributoTipo: a.atributoTipo,
    ordenNombre: a.ordenNombre == null ? '' : String(a.ordenNombre),
    ordenSku: a.ordenSku == null ? '' : String(a.ordenSku),
    esVariante: a.esVariante,
    customSlot: a.customSlot == null ? '' : String(a.customSlot),
  }
}

function parseIntOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n)) return null
  return n
}

function draftToAtributo(d: DraftAtributo): TemplateAtributo {
  return {
    atributoTipo: d.atributoTipo,
    ordenNombre: parseIntOrNull(d.ordenNombre),
    ordenSku: parseIntOrNull(d.ordenSku),
    esVariante: d.esVariante,
    customSlot: parseIntOrNull(d.customSlot),
  }
}

function validateDraft(draft: DraftAtributo[]): string | null {
  for (const d of draft) {
    const ordenNombre = parseIntOrNull(d.ordenNombre)
    const ordenSku = parseIntOrNull(d.ordenSku)
    const customSlot = parseIntOrNull(d.customSlot)
    if (ordenNombre != null && ordenNombre < 1)
      return `orden_nombre de ${d.atributoTipo} debe ser ≥ 1 o vacío`
    if (ordenSku != null && ordenSku < 1)
      return `orden_sku de ${d.atributoTipo} debe ser ≥ 1 o vacío`
    if (customSlot != null && (customSlot < 1 || customSlot > 3))
      return `custom_slot de ${d.atributoTipo} debe ser 1, 2, 3 o vacío`
  }
  return null
}

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { toast } = useToast()
  const id = Number.parseInt(params.id, 10)

  const [template, setTemplate] = useState<ArticulosTemplateWithAtributos | null>(null)
  const [draft, setDraft] = useState<DraftAtributo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (Number.isNaN(id)) {
      toast({
        title: 'ID de template inválido',
        variant: 'destructive',
      })
      router.push('/settings/articulos/templates')
      return
    }
    let cancelled = false
    setLoading(true)
    fetchTemplate(id)
      .then(data => {
        if (cancelled) return
        setTemplate(data)
        setDraft(data.atributos.map(toDraft))
      })
      .catch(err => {
        if (cancelled) return
        toast({
          title: 'No se pudo cargar el template',
          description: err instanceof Error ? err.message : 'Error desconocido',
          variant: 'destructive',
        })
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, router, toast])

  const isDirty = useMemo(() => {
    if (!template) return false
    if (template.atributos.length !== draft.length) return true
    return template.atributos.some((a, i) => {
      const d = draft[i]
      if (!d) return true
      const parsed = draftToAtributo(d)
      return (
        parsed.ordenNombre !== a.ordenNombre ||
        parsed.ordenSku !== a.ordenSku ||
        parsed.esVariante !== a.esVariante ||
        parsed.customSlot !== a.customSlot
      )
    })
  }, [template, draft])

  function patchDraft(index: number, patch: Partial<DraftAtributo>) {
    setDraft(prev => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
  }

  async function handleSave() {
    if (!template) return
    const validationError = validateDraft(draft)
    if (validationError) {
      toast({
        title: 'Validación',
        description: validationError,
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const atributos = draft.map(draftToAtributo)
      const updated = await patchTemplateAtributos(template.id, atributos)
      setTemplate({ ...template, atributos: updated })
      setDraft(updated.map(toDraft))
      toast({ title: 'Atributos guardados correctamente' })
    } catch (err) {
      toast({
        title: 'No se pudieron guardar los atributos',
        description: err instanceof Error ? err.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/settings/articulos/templates"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Volver a Templates
        </Link>
      </div>

      <div>
        <h2 className="text-lg font-medium">
          {loading || !template ? <Skeleton className="h-6 w-48 inline-block" /> : template.nombre}
        </h2>
        <p className="text-sm text-muted-foreground">
          Editá los atributos del template. <code className="font-mono">orden_nombre</code> /
          <code className="font-mono"> orden_sku</code> nulos significan que el atributo NO aparece
          en esa composición.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Atributo</TableHead>
              <TableHead className="w-[130px]">Orden nombre</TableHead>
              <TableHead className="w-[130px]">Orden SKU</TableHead>
              <TableHead className="w-[110px]">Es variante</TableHead>
              <TableHead className="w-[130px]">Custom slot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-9 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-9 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-9 w-20" />
                  </TableCell>
                </TableRow>
              ))
            ) : draft.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                  Sin atributos. Agregar/eliminar atributos no está disponible en Phase 30.
                </TableCell>
              </TableRow>
            ) : (
              draft.map((d, i) => (
                <TableRow key={d.atributoTipo}>
                  <TableCell className="font-mono text-sm">{d.atributoTipo}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      className="h-9 text-sm"
                      value={d.ordenNombre}
                      onChange={e => patchDraft(i, { ordenNombre: e.target.value })}
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      className="h-9 text-sm"
                      value={d.ordenSku}
                      onChange={e => patchDraft(i, { ordenSku: e.target.value })}
                      placeholder="—"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={d.esVariante}
                      onCheckedChange={checked => patchDraft(i, { esVariante: checked })}
                      aria-label={`Es variante: ${d.atributoTipo}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={3}
                      className="h-9 text-sm"
                      value={d.customSlot}
                      onChange={e => patchDraft(i, { customSlot: e.target.value })}
                      placeholder="—"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button variant="outline" size="sm" disabled aria-disabled="true">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar atributo
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              Disponible en próxima fase — Phase 30 solo edita atributos existentes del template
              default.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button size="sm" onClick={handleSave} disabled={saving || loading || !isDirty}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
