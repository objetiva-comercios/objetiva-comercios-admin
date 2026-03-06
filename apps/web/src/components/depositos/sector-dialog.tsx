'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { InventarioSector } from '@/types/inventario'
import { createSector, updateSector } from '@/lib/api.client'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const sectorFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no debe superar los 100 caracteres'),
  columnas: z.string().optional().or(z.literal('')),
})

type SectorFormValues = z.infer<typeof sectorFormSchema>

interface SectorDialogProps {
  depositoId: number
  sector?: InventarioSector
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SectorDialog({
  depositoId,
  sector,
  open,
  onOpenChange,
  onSuccess,
}: SectorDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!sector

  const form = useForm<SectorFormValues>({
    resolver: zodResolver(sectorFormSchema),
    defaultValues: {
      nombre: '',
      columnas: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: sector?.nombre ?? '',
        columnas: sector?.columnas?.join(', ') ?? '',
      })
    }
  }, [open, sector, form])

  async function onSubmit(values: SectorFormValues) {
    setIsLoading(true)
    try {
      const columnas = values.columnas
        ? values.columnas
            .split(',')
            .map(c => c.trim())
            .filter(Boolean)
        : []

      if (isEditing) {
        await updateSector(depositoId, sector.id, {
          nombre: values.nombre,
          columnas,
        })
        toast({ title: 'Sector actualizado correctamente' })
      } else {
        await createSector(depositoId, {
          nombre: values.nombre,
          columnas,
        })
        toast({ title: 'Sector creado correctamente' })
      }
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast({
        title: isEditing ? 'Error al actualizar el sector' : 'Error al crear el sector',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Sector' : 'Nuevo Sector'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Sector A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="columnas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Columnas</FormLabel>
                  <FormControl>
                    <Input placeholder="A, B, C (separadas por coma)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar cambios' : 'Crear sector'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
