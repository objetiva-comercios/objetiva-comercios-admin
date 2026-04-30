/**
 * Sugerencia automatica de `abrev` desde un nombre de propiedad.
 *
 * Reglas (Pattern 6 - .planning/phases/29-catalogos-de-atributos/29-RESEARCH.md
 * lineas 937-983):
 *  1. Trim y NFD normalize
 *  2. Strip diacriticos (combining marks block U+0300..U+036F)
 *  3. Uppercase
 *  4. Quedarse solo con [A-Z0-9]
 *  5. Tomar las primeras `takeChars` (default 4)
 *  6. Cap a 8 (defense-in-depth - el regex CHECK del DB ya garantiza 1..8)
 *
 * NOTA: el usuario puede editar libremente; la sugerencia es solo guia visual.
 *
 * Usado por:
 *  - apps/web/src/components/propiedades/PropiedadCreateDialog.tsx (Plan 05)
 *
 * @param nombre - String del nombre del que sugerir abrev.
 * @param takeChars - Cantidad de chars iniciales a tomar (default 4).
 */

// Combining Diacritical Marks block U+0300..U+036F.
// IMPORTANTE: este regex se construye desde escapes Unicode literales
// ("\\u0300" / "\\u036F" tras parseo TS) en lugar de caracteres invisibles
// pegados directamente en el source. Los chars del bloque "Combining Marks"
// son invisibles cuando van literales y rompen linters/diff tooling. La
// forma escapada produce el mismo regex en runtime pero es portable y
// CI-friendly.
const DIACRITICS_RE = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  'g'
)

export function suggestAbrev(nombre: string, takeChars = 4): string {
  return (nombre ?? '')
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, takeChars)
    .slice(0, 8) // hard cap defense-in-depth
}
