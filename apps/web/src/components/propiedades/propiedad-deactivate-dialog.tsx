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
import type { Propiedad } from '@/types/propiedad'

export interface PropiedadDeactivateDialogProps {
  propiedad: Propiedad
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function PropiedadDeactivateDialog({
  propiedad,
  open,
  onOpenChange,
  onConfirm,
}: PropiedadDeactivateDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Desactivar &lsquo;{propiedad.nombre}&rsquo;
          </AlertDialogTitle>
          <AlertDialogDescription>
            Vas a desactivar &lsquo;{propiedad.nombre}&rsquo;. Los artículos
            existentes que la usan no se modifican. ¿Confirmás?
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
