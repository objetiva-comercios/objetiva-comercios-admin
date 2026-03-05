'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ArticuloForm } from '@/components/articulos/articulo-form'

export default function NuevoArticuloPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/articulos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo Articulo</h1>
      </div>

      <div className="mx-auto max-w-2xl">
        <ArticuloForm mode="create" onSuccess={() => router.push('/articulos')} />
      </div>
    </div>
  )
}
