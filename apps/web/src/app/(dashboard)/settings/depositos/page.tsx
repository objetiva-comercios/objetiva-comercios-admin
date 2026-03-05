import { DepositosList } from '@/components/depositos/depositos-list'

export default function DepositosSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Depositos</h2>
        <p className="text-sm text-muted-foreground">Gestion de depositos y almacenes</p>
      </div>
      <DepositosList />
    </div>
  )
}
