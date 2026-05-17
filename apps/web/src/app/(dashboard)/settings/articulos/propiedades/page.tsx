import { PropiedadesPage } from '@/components/propiedades/propiedades-page'

/**
 * Subruta de /settings/articulos. El layout padre ya renderiza el header
 * ("Configuración de Artículos") y las tabs de sección; aquí montamos
 * directamente la página con los 8 catálogos de propiedades.
 */
export default function PropiedadesRoute() {
  return <PropiedadesPage />
}
