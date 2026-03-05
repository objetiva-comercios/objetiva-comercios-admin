'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { Deposito } from '@/types/deposito'
import { createDeposito, updateDeposito } from '@/lib/api.client'
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

const depositoFormSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(100, 'El nombre no debe superar los 100 caracteres'),
  direccion: z
    .string()
    .max(255, 'La direccion no debe superar los 255 caracteres')
    .optional()
    .or(z.literal('')),
  descripcion: z.string().optional().or(z.literal('')),
})

type DepositoFormValues = z.infer<typeof depositoFormSchema>

interface DepositoDialogProps {
  deposito?: Deposito
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function DepositoDialog({ deposito, open, onOpenChange, onSuccess }: DepositoDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const isEditing = !!deposito

  const form = useForm<DepositoFormValues>({
    resolver: zodResolver(depositoFormSchema),
    defaultValues: {
      nombre: '',
      direccion: '',
      descripcion: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        nombre: deposito?.nombre ?? '',
        direccion: deposito?.direccion ?? '',
        descripcion: deposito?.descripcion ?? '',
      })
    }
  }, [open, deposito, form])

  async function onSubmit(values: DepositoFormValues) {
    setIsLoading(true)
    try {
      if (isEditing) {
        await updateDeposito(deposito.id, values)
        toast({ title: 'Deposito actualizado correctamente' })
      } else {
        await createDeposito({
          nombre: values.nombre,
          direccion: values.direccion || undefined,
          descripcion: values.descripcion || undefined,
        })
        toast({ title: 'Deposito creado correctamente' })
      }
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast({
        title: isEditing ? 'Error al actualizar el deposito' : 'Error al crear el deposito',
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
          <DialogTitle>{isEditing ? 'Editar Deposito' : 'Nuevo Deposito'}</DialogTitle>
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
                    <Input placeholder="Deposito principal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direccion</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Corrientes 1234, CABA" {...field} />
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
                      placeholder="Descripcion del deposito (opcional)"
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
                {isEditing ? 'Guardar cambios' : 'Crear deposito'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
