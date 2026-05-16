// Helpers de formato de fecha deterministicos (sin dependency de timezone del entorno).
// Resuelven hydration mismatch React #425 que aparece cuando server (Docker UTC) y
// client (browser local del usuario) usan toLocaleDateString con valores distintos.

/**
 * Formatea una fecha ISO como DD/MM/YYYY usando solo la parte de fecha del string.
 * Acepta string ISO, Date, null o undefined. Retorna '—' para valores nulos.
 * No depende del timezone del entorno — extrae directamente la parte YYYY-MM-DD del ISO.
 */
export function formatDateES(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const iso = typeof value === 'string' ? value : value.toISOString()
  // Extraer parte de fecha "YYYY-MM-DD" del ISO sin involucrar Date object
  const datePart = iso.split('T')[0]
  const parts = datePart.split('-')
  if (parts.length !== 3) return iso // fallback si formato no es ISO
  const [y, m, d] = parts
  return `${d}/${m}/${y}`
}

/**
 * Formatea una fecha ISO como DD/MM/YYYY HH:MM en UTC.
 * Determinista — siempre muestra el timestamp en UTC, indiferente al timezone del entorno.
 * Acepta string ISO, Date, null o undefined. Retorna '—' para valores nulos.
 */
export function formatDateTimeES(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const iso = typeof value === 'string' ? value : value.toISOString()
  // Match "YYYY-MM-DDTHH:MM" (acepta tanto con Z como sin Z, con o sin segundos)
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return formatDateES(iso)
  const [, y, m, d, hh, mm] = match
  return `${d}/${m}/${y} ${hh}:${mm}`
}
