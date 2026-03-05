'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2Icon } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface InlineEditCellProps {
  value: number
  onSave: (newValue: number) => Promise<void>
  className?: string
}

export function InlineEditCell({ value, onSave, className }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    setEditValue(String(value))
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const handleSave = async () => {
    const parsed = parseInt(editValue, 10)
    if (isNaN(parsed) || parsed < 0) {
      setEditValue(String(value))
      setEditing(false)
      return
    }
    if (parsed === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(parsed)
      toast({ title: 'Stock actualizado' })
      setEditing(false)
    } catch (error) {
      toast({
        title: 'Error al actualizar stock',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
      setEditValue(String(value))
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(String(value))
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  if (editing) {
    return (
      <div className="relative">
        <Input
          ref={inputRef}
          type="number"
          min={0}
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCancel}
          disabled={saving}
          className={cn('h-7 w-20 text-sm', saving && 'opacity-50', className)}
        />
        {saving && (
          <Loader2Icon className="absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn('cursor-pointer rounded px-2 py-1 hover:bg-muted/50 tabular-nums', className)}
    >
      {value}
    </div>
  )
}
