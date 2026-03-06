'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { Inventario } from '@/types/inventario'
import type { Deposito } from '@/types/deposito'
import { createInventario, updateInventario } from '@/lib/api.client'
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
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const inventarioFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no debe superar los 100 caracteres'),
  fecha: z.string().min(1, 'La fecha es requerida'),
  depositoId: z.string().min(1, 'El deposito es requerido'),
  descripcion: z.string().optional().or(z.literal('')),
})

type InventarioFormValues = z.infer<typeof inventarioFormSchema>

interface InventarioDialogProps {
  inventario?: Inventario
  depositos: Deposito[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function InventarioDialog({
  inventario,
  depositos,
  open,
  onOpenChange,
  onSuccess,
}: InventarioDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!inventario

  const activeDepositos = depositos.filter(d => d.activo)

  const form = useForm<InventarioFormValues>({
    resolver: zodResolver(inventarioFormSchema),
    defaultValues: {
      nombre: '',
      fecha: new Date().toISOString().split('T')[0],
      depositoId: '',
      descripcion: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: inventario?.nombre ?? '',
        fecha: inventario?.fecha?.split('T')[0] ?? new Date().toISOString().split('T')[0],
        depositoId: inventario?.depositoId?.toString() ?? '',
        descripcion: inventario?.descripcion ?? '',
      })
    }
  }, [open, inventario, form])

  async function onSubmit(values: InventarioFormValues) {
    setIsLoading(true)
    try {
      if (isEditing) {
        await updateInventario(inventario.id, {
          nombre: values.nombre,
          descripcion: values.descripcion || undefined,
        })
        toast({ title: 'Inventario actualizado correctamente' })
      } else {
        await createInventario({
          nombre: values.nombre,
          fecha: values.fecha,
          depositoId: Number(values.depositoId),
          descripcion: values.descripcion || undefined,
        })
        toast({ title: 'Inventario creado correctamente' })
      }
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast({
        title: isEditing ? 'Error al actualizar el inventario' : 'Error al crear el inventario',
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
          <DialogTitle>{isEditing ? 'Editar Inventario' : 'Nuevo Inventario'}</DialogTitle>
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
                    <Input placeholder="Inventario mensual marzo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fecha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isEditing} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depositoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposito</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar deposito" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeDepositos.map(deposito => (
                        <SelectItem key={deposito.id} value={deposito.id.toString()}>
                          {deposito.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripcion del inventario (opcional)"
                      rows={3}
                      {...field}
                    />
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
                {isEditing ? 'Guardar cambios' : 'Crear inventario'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
