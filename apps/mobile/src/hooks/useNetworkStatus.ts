import { useEffect, useState } from 'react'
import { Network } from '@capacitor/network'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true) // optimistic default

  useEffect(() => {
    let handleRef: { remove: () => void } | null = null

    // Get initial connectivity status
    Network.getStatus().then(status => {
      setIsOnline(status.connected)
    })

    // Subscribe to connectivity changes
    const listenerPromise = Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected)
    })

    listenerPromise.then(handle => {
      handleRef = handle
    })

    return () => {
      if (handleRef) {
        handleRef.remove()
      }
    }
  }, [])

  return { isOnline }
}
