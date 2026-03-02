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
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must not exceed 100 characters'),
  address: z
    .string()
    .max(200, 'Address must not exceed 200 characters')
    .optional()
    .or(z.literal('')),
  tax_id: z.string().max(30, 'Tax ID must not exceed 30 characters').optional().or(z.literal('')),
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
        title: 'Business settings updated',
        description: 'Your business information has been saved successfully.',
      })

      router.refresh()
    } catch (error) {
      console.error('Error updating business settings:', error)
      toast({
        title: 'Failed to save settings',
        description: 'An error occurred while saving your business information.',
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
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} />
              </FormControl>
              <FormDescription>The legal name of your business or organization.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St, City, State" {...field} />
              </FormControl>
              <FormDescription>
                Your business address for invoices and correspondence.
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
              <FormLabel>Tax ID</FormLabel>
              <FormControl>
                <Input placeholder="XX-XXXXXXX" {...field} />
              </FormControl>
              <FormDescription>Your business tax identification number (optional).</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
