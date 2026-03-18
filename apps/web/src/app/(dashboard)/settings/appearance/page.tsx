'use client'

import { useTheme } from 'next-themes'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useUiScale } from '@/hooks/use-ui-scale'
import { cn } from '@/lib/utils'

export default function AppearancePage() {
  const { theme, setTheme } = useTheme()
  const { scale, setScale } = useUiScale()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Apariencia</h2>
        <p className="text-muted-foreground">Personalizá la apariencia de la aplicación.</p>
      </div>

      <div className="rounded-lg border p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Tema</h3>
            <p className="text-sm text-muted-foreground">Seleccioná el tema para la aplicación.</p>
          </div>

          <RadioGroup value={theme} onValueChange={setTheme} className="grid gap-4">
            <div className="flex items-center space-x-4 rounded-lg border p-4 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex items-center gap-3 cursor-pointer flex-1">
                <Sun className="h-5 w-5" />
                <div>
                  <div className="font-medium">Claro</div>
                  <div className="text-sm text-muted-foreground">Tema en modo claro</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-4 rounded-lg border p-4 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex items-center gap-3 cursor-pointer flex-1">
                <Moon className="h-5 w-5" />
                <div>
                  <div className="font-medium">Oscuro</div>
                  <div className="text-sm text-muted-foreground">Tema en modo oscuro</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-4 rounded-lg border p-4 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex items-center gap-3 cursor-pointer flex-1">
                <Monitor className="h-5 w-5" />
                <div>
                  <div className="font-medium">Sistema</div>
                  <div className="text-sm text-muted-foreground">
                    Usar la configuración de tema del sistema
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <div className="rounded-lg border p-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Escala de interfaz</h3>
            <p className="text-sm text-muted-foreground">
              Ajustá el tamaño general de la interfaz.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[80, 85, 90, 95, 100].map(value => (
              <button
                key={value}
                onClick={() => setScale(value)}
                className={cn(
                  'inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                  scale === value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {value}%
              </button>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Escala actual: {scale}%. El valor por defecto es 90%.
          </p>
        </div>
      </div>
    </div>
  )
}
