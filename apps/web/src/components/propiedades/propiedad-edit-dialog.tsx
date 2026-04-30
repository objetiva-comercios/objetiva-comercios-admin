'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { updatePropiedad } from '@/lib/api.client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { PROP_LABELS, copyFor, type Propiedad, type PropTipo } from '@/types/propiedad'

const schema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es requerido')
    .max(255, 'Máximo 255 caracteres'),
  abrev: z
    .string()
    .regex(
      /^[A-Z0-9]{1,8}$/,
      'La abreviación debe tener 1 a 8 caracteres en mayúsculas o dígitos'
    ),
})
type FormValues = z.infer<typeof schema>

export interface PropiedadEditDialogProps {
  propTipo: PropTipo
  propiedad: Propiedad
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function PropiedadEditDialog({
  propTipo,
  propiedad,
  open,
  onOpenChange,
  onSuccess,
}: PropiedadEditDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const label = PROP_LABELS[propTipo]
  const c = copyFor(propTipo)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nombre: propiedad.nombre, abrev: propiedad.abrev },
  })

  // Reset con valores frescos cada vez que se reabre el dialog o cambia la fila.
  useEffect(() => {
    if (open) {
      form.reset({ nombre: propiedad.nombre, abrev: propiedad.abrev })
    }
  }, [open, propiedad, form])

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      await updatePropiedad(propTipo, propiedad.id, values)
      toast({ title: `${c.singular} ${c.actualizada} correctamente` })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      const lower = message.toLowerCase()
      if (lower.includes('nombre')) {
        form.setError('nombre', { message })
      } else if (lower.includes('abreviación') || lower.includes('abrev')) {
        form.setError('abrev', { message })
      } else {
        toast({
          title: 'No se pudieron guardar los cambios',
          description: message,
          variant: 'destructive',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {label.singular}</DialogTitle>
          <DialogDescription className="text-xs">
            Modificá nombre o abreviación. Para activar/desactivar usá las
            acciones de la fila.
          </DialogDescription>
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="abrev"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Abreviación</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={e => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    1-8 caracteres, solo mayúsculas y dígitos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
