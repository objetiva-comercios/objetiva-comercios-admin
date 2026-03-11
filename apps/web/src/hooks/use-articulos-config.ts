'use client'

import { useEffect, useState } from 'react'
import { fetchSettingsClient } from '@/lib/api.client'
import type { CamposVisibles } from '@/types/articulos-config'
import { DEFAULT_ARTICULOS_CONFIG } from '@/types/articulos-config'

// Module-level cache to avoid re-fetching across components
let cachedConfig: CamposVisibles | null = null
let fetchPromise: Promise<CamposVisibles> | null = null

function fetchConfig(): Promise<CamposVisibles> {
  if (cachedConfig) return Promise.resolve(cachedConfig)
  if (fetchPromise) return fetchPromise

  fetchPromise = fetchSettingsClient()
    .then(settings => {
      const config =
        settings.articulosConfig?.camposVisibles ?? DEFAULT_ARTICULOS_CONFIG.camposVisibles
      cachedConfig = config
      return config
    })
    .catch(() => {
      return DEFAULT_ARTICULOS_CONFIG.camposVisibles
    })
    .finally(() => {
      fetchPromise = null
    })

  return fetchPromise
}

/** Invalidate cache (call after saving config) */
export function invalidateArticulosConfig() {
  cachedConfig = null
}

export function useArticulosConfig() {
  const [camposVisibles, setCamposVisibles] = useState<CamposVisibles>(
    cachedConfig ?? DEFAULT_ARTICULOS_CONFIG.camposVisibles
  )
  const [isLoading, setIsLoading] = useState(!cachedConfig)

  useEffect(() => {
    let cancelled = false
    fetchConfig().then(config => {
      if (!cancelled) {
        setCamposVisibles(config)
        setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function isCampoVisible(campo: keyof CamposVisibles): boolean {
    return camposVisibles[campo]
  }

  return { camposVisibles, isCampoVisible, isLoading }
}
