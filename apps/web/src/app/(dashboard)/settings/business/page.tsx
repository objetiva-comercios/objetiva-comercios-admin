'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

export default function BusinessPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Business Settings</h2>
        <p className="text-muted-foreground">
          Configure your business information and preferences.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Business settings will be connected to the database in Phase 5. Changes made here are not
          persisted yet.
        </AlertDescription>
      </Alert>

      <div className="rounded-lg border p-6">
        <form className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name</Label>
            <Input
              id="business-name"
              placeholder="My Business"
              defaultValue="Objetiva Comercios"
              disabled
            />
            <p className="text-sm text-muted-foreground">
              The name of your business or organization.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select defaultValue="usd" disabled>
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD - US Dollar</SelectItem>
                <SelectItem value="eur">EUR - Euro</SelectItem>
                <SelectItem value="gbp">GBP - British Pound</SelectItem>
                <SelectItem value="jpy">JPY - Japanese Yen</SelectItem>
                <SelectItem value="ars">ARS - Argentine Peso</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              The currency used for all monetary values.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select defaultValue="utc" disabled>
              <SelectTrigger id="timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utc">UTC - Coordinated Universal Time</SelectItem>
                <SelectItem value="america/new_york">America/New York (EST/EDT)</SelectItem>
                <SelectItem value="america/los_angeles">America/Los Angeles (PST/PDT)</SelectItem>
                <SelectItem value="america/chicago">America/Chicago (CST/CDT)</SelectItem>
                <SelectItem value="america/argentina/buenos_aires">
                  America/Argentina/Buenos Aires
                </SelectItem>
                <SelectItem value="europe/london">Europe/London (GMT/BST)</SelectItem>
                <SelectItem value="europe/paris">Europe/Paris (CET/CEST)</SelectItem>
                <SelectItem value="asia/tokyo">Asia/Tokyo (JST)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Your business timezone for reports and timestamps.
            </p>
          </div>

          <div className="flex justify-end">
            <Button type="button" disabled>
              Save changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
