import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { BottomTabs } from './BottomTabs'
import { DrawerNav } from './DrawerNav'

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader onMenuOpen={() => setDrawerOpen(true)} />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomTabs />
      <DrawerNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
