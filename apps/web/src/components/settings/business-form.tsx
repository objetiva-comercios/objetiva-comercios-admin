'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { updateSettings, uploadLogo, deleteLogo } from '@/lib/api.client'
import type { BusinessSettings } from '@/types/settings'
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
import { Loader2, Upload, Trash2 } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const businessFormSchema = z.object({
  companyName: z
    .string()
    .min(2, 'El nombre de la empresa debe tener al menos 2 caracteres')
    .max(100, 'El nombre de la empresa no debe superar los 100 caracteres'),
  address: z
    .string()
    .max(200, 'La dirección no debe superar los 200 caracteres')
    .optional()
    .or(z.literal('')),
  taxId: z
    .string()
    .max(30, 'El CUIT no debe superar los 30 caracteres')
    .optional()
    .or(z.literal('')),
})

type BusinessFormValues = z.infer<typeof businessFormSchema>

const ACCEPT = '.png,.jpg,.jpeg,.webp,.svg'

interface BusinessFormProps {
  initialValues: BusinessSettings
}

export function BusinessForm({ initialValues }: BusinessFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState(initialValues)
  const [uploadingSquare, setUploadingSquare] = useState(false)
  const [uploadingRect, setUploadingRect] = useState(false)
  const squareInputRef = useRef<HTMLInputElement>(null)
  const rectInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: {
      companyName: initialValues.companyName || '',
      address: initialValues.address || '',
      taxId: initialValues.taxId || '',
    },
  })

  async function onSubmit(values: BusinessFormValues) {
    setIsLoading(true)
    try {
      const updated = await updateSettings(values)
      setSettings(updated)
      toast({
        title: 'Configuración del negocio actualizada',
        description: 'La información del negocio se guardó correctamente.',
      })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error al guardar la configuración',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpload(type: 'square' | 'rectangular', file: File) {
    const setUploading = type === 'square' ? setUploadingSquare : setUploadingRect
    setUploading(true)
    try {
      const updated = await uploadLogo(type, file)
      setSettings(updated)
      toast({ title: 'Logo actualizado correctamente.' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error al subir el logo.',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteLogo(type: 'square' | 'rectangular') {
    try {
      const updated = await deleteLogo(type)
      setSettings(updated)
      toast({ title: 'Logo eliminado.' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error al eliminar el logo.',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      })
    }
  }

  function logoUrl(filename: string | null) {
    if (!filename) return null
    return `${API_BASE_URL}/api/uploads/${filename}`
  }

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="companyName"
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
            name="taxId"
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

      {/* Logo Upload Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium mb-4">Logos</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Square Logo */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Logo cuadrado (isotipo)</p>
            <p className="text-xs text-muted-foreground">
              Se usa en el sidebar y como avatar. Recomendado: 128x128px.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 overflow-hidden">
                {settings.logoSquare ? (
                  <img
                    src={logoUrl(settings.logoSquare)!}
                    alt="Logo cuadrado"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">
                    {settings.companyName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={squareInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload('square', file)
                    e.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingSquare}
                  onClick={() => squareInputRef.current?.click()}
                >
                  {uploadingSquare ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Subir
                </Button>
                {settings.logoSquare && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteLogo('square')}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Rectangular Logo */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Logo rectangular</p>
            <p className="text-xs text-muted-foreground">
              Se usa en login y comprobantes. Recomendado: 256x80px.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-64 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50 overflow-hidden">
                {settings.logoRectangular ? (
                  <img
                    src={logoUrl(settings.logoRectangular)!}
                    alt="Logo rectangular"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">Sin logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={rectInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleUpload('rectangular', file)
                    e.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingRect}
                  onClick={() => rectInputRef.current?.click()}
                >
                  {uploadingRect ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Subir
                </Button>
                {settings.logoRectangular && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteLogo('rectangular')}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
