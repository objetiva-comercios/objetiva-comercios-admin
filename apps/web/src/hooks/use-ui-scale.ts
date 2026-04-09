'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ui-scale'
const DEFAULT_SCALE = 90
const MIN_SCALE = 80
const MAX_SCALE = 100

export function useUiScale() {
  const [scale, setScaleState] = useState<number>(DEFAULT_SCALE)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const value = stored ? parseInt(stored, 10) : DEFAULT_SCALE
    const clamped = Math.min(Math.max(value, MIN_SCALE), MAX_SCALE)
    setScaleState(clamped)
    document.documentElement.style.fontSize = `${clamped}%`
  }, [])

  function updateScale(value: number) {
    const clamped = Math.min(Math.max(value, MIN_SCALE), MAX_SCALE)
    setScaleState(clamped)
    localStorage.setItem(STORAGE_KEY, String(clamped))
    document.documentElement.style.fontSize = `${clamped}%`
  }

  return { scale, setScale: updateScale }
}
