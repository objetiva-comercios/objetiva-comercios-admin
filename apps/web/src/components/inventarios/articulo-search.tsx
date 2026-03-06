'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2Icon, SearchIcon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { fetchArticulosClient } from '@/lib/api.client'
import { addInventarioArticulo } from '@/lib/api.client'
import type { Articulo } from '@/types/articulo'

interface ArticuloSearchProps {
  inventarioId: number
  existingCodigos: Set<string>
  onArticuloAdded: () => void
  disabled?: boolean
}

export function ArticuloSearch({
  inventarioId,
  existingCodigos,
  onArticuloAdded,
  disabled,
}: ArticuloSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Articulo[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([])
        setOpen(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetchArticulosClient({ search: q, limit: 10 })
        const filtered = res.data.filter(a => !existingCodigos.has(a.codigo))
        setResults(filtered)
        setOpen(filtered.length > 0)
      } catch {
        setResults([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    },
    [existingCodigos]
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = async (articulo: Articulo) => {
    setAdding(true)
    try {
      await addInventarioArticulo(inventarioId, {
        articuloCodigo: articulo.codigo,
        cantidadContada: 0,
      })
      toast({ title: 'Articulo agregado', description: articulo.nombre })
      setQuery('')
      setResults([])
      setOpen(false)
      onArticuloAdded()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido'
      if (
        message.includes('409') ||
        message.toLowerCase().includes('already') ||
        message.toLowerCase().includes('existe') ||
        message.toLowerCase().includes('duplicate')
      ) {
        toast({
          title: 'Articulo ya existe en este conteo',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error al agregar articulo',
          description: message,
          variant: 'destructive',
        })
      }
    } finally {
      setAdding(false)
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar articulo por codigo, nombre o SKU..."
          disabled={disabled || adding}
          className="h-8 pl-8 text-sm"
        />
        {(loading || adding) && (
          <Loader2Icon className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-60 overflow-y-auto py-1">
            {results.map(articulo => (
              <li key={articulo.codigo}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted/50 disabled:opacity-50"
                  onClick={() => handleSelect(articulo)}
                  disabled={adding}
                >
                  <span className="font-medium">{articulo.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    {articulo.codigo}
                    {articulo.sku ? ` - SKU: ${articulo.sku}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
