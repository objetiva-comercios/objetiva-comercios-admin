'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { DispositivoMovil } from '@/types/dispositivo'
import { createDispositivo, updateDispositivo } from '@/lib/api.client'
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
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const dispositivoFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no debe superar los 100 caracteres'),
  identificador: z
    .string()
    .min(1, 'El identificador es requerido')
    .max(100, 'El identificador no debe superar los 100 caracteres'),
  descripcion: z.string().optional().or(z.literal('')),
})

type DispositivoFormValues = z.infer<typeof dispositivoFormSchema>

interface DispositivoDialogProps {
  dispositivo?: DispositivoMovil
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DispositivoDialog({
  dispositivo,
  open,
  onOpenChange,
  onSuccess,
}: DispositivoDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!dispositivo

  const form = useForm<DispositivoFormValues>({
    resolver: zodResolver(dispositivoFormSchema),
    defaultValues: {
      nombre: '',
      identificador: '',
      descripcion: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: dispositivo?.nombre ?? '',
        identificador: dispositivo?.identificador ?? '',
        descripcion: dispositivo?.descripcion ?? '',
      })
    }
  }, [open, dispositivo, form])

  async function onSubmit(values: DispositivoFormValues) {
    setIsLoading(true)
    try {
      if (isEditing) {
        await updateDispositivo(dispositivo.id, values)
        toast({ title: 'Dispositivo actualizado correctamente' })
      } else {
        await createDispositivo({
          nombre: values.nombre,
          identificador: values.identificador,
          descripcion: values.descripcion || undefined,
        })
        toast({ title: 'Dispositivo creado correctamente' })
      }
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast({
        title: isEditing ? 'Error al actualizar el dispositivo' : 'Error al crear el dispositivo',
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
          <DialogTitle>{isEditing ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}</DialogTitle>
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
                    <Input placeholder="Celular deposito 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="identificador"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identificador</FormLabel>
                  <FormControl>
                    <Input placeholder="IMEI o identificador unico" {...field} />
                  </FormControl>
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
                      placeholder="Descripcion del dispositivo (opcional)"
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
                {isEditing ? 'Guardar cambios' : 'Crear dispositivo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
