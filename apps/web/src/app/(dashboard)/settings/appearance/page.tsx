'use client'

import { useTheme } from 'next-themes'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Monitor, Moon, Sun } from 'lucide-react'

export default function AppearancePage() {
  const { theme, setTheme } = useTheme()

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
    </div>
  )
}
