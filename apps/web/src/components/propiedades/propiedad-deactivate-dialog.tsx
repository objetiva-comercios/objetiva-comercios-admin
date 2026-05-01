'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Propiedad, PropTipo } from '@/types/propiedad'
import { copyFor } from '@/types/propiedad'

export interface PropiedadDeactivateDialogProps {
  propiedad: Propiedad
  propTipo: PropTipo
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function PropiedadDeactivateDialog({
  propiedad,
  propTipo,
  open,
  onOpenChange,
  onConfirm,
}: PropiedadDeactivateDialogProps) {
  const pronombre = copyFor(propTipo).pronombre
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desactivar &lsquo;{propiedad.nombre}&rsquo;</AlertDialogTitle>
          <AlertDialogDescription>
            Vas a desactivar &lsquo;{propiedad.nombre}&rsquo;. Los artículos existentes que{' '}
            {pronombre} usan no se modifican. ¿Confirmás?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Desactivar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
