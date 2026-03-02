import { useNetworkStatus } from '../hooks/useNetworkStatus'

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  return (
    <div className="w-full bg-yellow-500 text-yellow-950 text-xs font-medium text-center py-1 px-3">
      No connection — showing cached data
    </div>
  )
}
