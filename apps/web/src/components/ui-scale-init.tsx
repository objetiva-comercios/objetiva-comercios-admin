'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'ui-scale'
const DEFAULT_SCALE = 90

export function UiScaleInit() {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    const value = stored ? parseInt(stored, 10) : DEFAULT_SCALE
    document.documentElement.style.fontSize = `${value}%`
  }, [])

  return null
}
