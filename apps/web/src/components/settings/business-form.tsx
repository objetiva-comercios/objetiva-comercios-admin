'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

const businessFormSchema = z.object({
  company_name: z
    .string()
    .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres')
    .max(100, 'El nombre de la empresa no debe superar los 100 caracteres'),
  address: z
    .string()
    .max(200, 'La dirección no debe superar los 200 caracteres')
    .optional()
    .or(z.literal('')),
  tax_id: z
    .string()
    .max(30, 'El CUIT no debe superar los 30 caracteres')
    .optional()
    .or(z.literal('')),
})

type BusinessFormValues = z.infer<typeof businessFormSchema>

interface BusinessFormProps {
  initialValues: {
    company_name: string
    address: string
    tax_id: string
  }
}

export function BusinessForm({ initialValues }: BusinessFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      company_name: initialValues.company_name || '',
      address: initialValues.address || '',
      tax_id: initialValues.tax_id || '',
    },
  })

  async function onSubmit(values: BusinessFormValues) {
    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.updateUser({
        data: {
          business: values,
        },
      })

      if (error) {
        throw error
      }

      toast({
        title: 'Configuración del negocio actualizada',
        description: 'La información del negocio se guardó correctamente.',
      })

      router.refresh()
    } catch (error) {
      console.error('Error updating business settings:', error)
      toast({
        title: 'Error al guardar la configuración',
        description: 'Ocurrió un error al guardar la información del negocio.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la empresa</FormLabel>
              <FormControl>
                <Input placeholder="Mi Empresa S.R.L." {...field} />
              </FormControl>
              <FormDescription>La razón social de tu negocio u organización.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input placeholder="Av. Corrientes 1234, CABA" {...field} />
              </FormControl>
              <FormDescription>
                La dirección de tu negocio para facturas y correspondencia.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tax_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CUIT</FormLabel>
              <FormControl>
                <Input placeholder="XX-XXXXXXXX-X" {...field} />
              </FormControl>
              <FormDescription>El número de CUIT de tu negocio (opcional).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </form>
    </Form>
  )
}
