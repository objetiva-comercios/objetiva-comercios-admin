---
phase: quick-260410-ifc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/components/articulos/articulos-columns.tsx
  - apps/web/src/components/articulos/articulo-sheet.tsx
autonomous: true
requirements: [IMG-LIST-ICONS, IMG-DETAIL-SLOTS]

must_haves:
  truths:
    - "En la lista de articulos, cada fila muestra iconos Image y Tag con conteo de imagenes producto y etiqueta"
    - "Iconos sin imagenes se muestran grises con punto medio en lugar de numero"
    - "El panel detalle muestra fila unica de 9 slots: 6 producto + separador + 3 etiqueta"
    - "Slots vacios muestran borde dashed con icono ImageIcon al 30-40% opacity"
    - "Slots con imagen muestran thumbnail 48x48 clickeable que abre lightbox"
    - "Labels 'Producto' y 'Etiqueta' aparecen arriba de cada grupo en detalle"
  artifacts:
    - path: "apps/web/src/components/articulos/articulos-columns.tsx"
      provides: "Columna de iconos imagenes entre nombre y marca"
    - path: "apps/web/src/components/articulos/articulo-sheet.tsx"
      provides: "Seccion imagenes rediseñada con 9 slots en fila unica"
  key_links:
    - from: "articulos-columns.tsx"
      to: "Articulo.imagenesProducto/imagenesEtiqueta"
      via: "row.original para acceder a arrays de imagenes"
      pattern: "row\\.original\\.imagenes"
    - from: "articulo-sheet.tsx"
      to: "imagen-lightbox.tsx"
      via: "openLightbox con todas las imagenes no-null"
      pattern: "setLightbox"
---

<objective>
Rediseñar la representacion visual de imagenes de articulos en vista de lista (iconos con conteo) y panel detalle (fila de 9 slots con placeholders unificados).

Purpose: Dar visibilidad inmediata del estado de imagenes en la lista y unificar el layout del detalle con la referencia de edicion (6 producto + 3 etiqueta).
Output: Columna de iconos en tabla de articulos + seccion imagenes rediseñada en sheet de detalle.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/src/components/articulos/articulos-columns.tsx
@apps/web/src/components/articulos/articulo-sheet.tsx
@apps/web/src/components/articulos/imagen-lightbox.tsx
@apps/web/src/types/articulo.ts

<interfaces>
<!-- Articulo type ya tiene los campos necesarios -->
From apps/web/src/types/articulo.ts:
```typescript
export interface Articulo {
  imagenesProducto: (string | null)[]  // 6 slots, null = vacio
  imagenesEtiqueta: (string | null)[]  // 3 slots, null = vacio
  // ... otros campos
}
```

From apps/web/src/components/articulos/imagen-lightbox.tsx:
```typescript
interface ImagenLightboxProps {
  images: string[]        // detail URLs (non-null only)
  initialIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

<!-- El endpoint GET /api/articulos ya devuelve imagenesProducto e imagenesEtiqueta en cada articulo de la lista (usa .select() sin columnas especificas = retorna todo). No hace falta cambiar el backend. -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Agregar columna de iconos de imagenes en lista de articulos</name>
  <files>apps/web/src/components/articulos/articulos-columns.tsx</files>
  <action>
Agregar una nueva columna entre "nombre" y "marca" en el array de columnas retornado por getColumns().

La columna debe:
- id: 'imagenes' (no accessorKey, se usa row.original)
- header: cadena vacia o icono sutil (sin texto de header para no ocupar espacio)
- enableSorting: false, enableHiding: false
- cell: renderizar dos iconos compactos lado a lado usando row.original

Logica del cell:
```
const productoCount = row.original.imagenesProducto.filter(u => u != null).length
const etiquetaCount = row.original.imagenesEtiqueta.filter(u => u != null).length
```

Renderizar como un div flex con gap-2 items-center:
- Icono `Image` (lucide-react) de 3.5x3.5 (h-3.5 w-3.5):
  - Con imagenes: color text-muted-foreground + span con productoCount en text-xs
  - Sin imagenes: color text-muted-foreground/30 + span con "·" en text-xs text-muted-foreground/30
- Icono `Tag` (lucide-react) de 3.5x3.5:
  - Misma logica: con etiquetaCount > 0 muestra numero, sino "·" gris

Importar Image y Tag de lucide-react (agregar al import existente).

La columna completa debe ser compacta — no mas de ~80px de ancho implicito. No agregar header text.
  </action>
  <verify>
    <automated>cd /home/sanchez/proyectos/objetiva-comercios-admin && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>La tabla de articulos muestra iconos Image y Tag con conteo numerico cuando hay imagenes, o iconos grises con punto medio cuando no hay.</done>
</task>

<task type="auto">
  <name>Task 2: Rediseñar seccion imagenes del panel detalle con 9 slots en fila unica</name>
  <files>apps/web/src/components/articulos/articulo-sheet.tsx</files>
  <action>
Reemplazar completamente la seccion de imagenes del sheet (lineas ~195-266 aprox, el bloque IIFE que renderiza imagenes) por un nuevo layout unificado.

Importar `Tag` de lucide-react (ImageIcon ya esta importado).

El nuevo layout SIEMPRE muestra los 9 slots (sin condicion hasAnyImages):

```
<div>
  <SectionHeader title="Imagenes" />
  <div className="mt-2 flex items-start gap-4">
    {/* Grupo Producto */}
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">Producto</p>
      <div className="flex gap-1">
        {[0,1,2,3,4,5].map(i => renderSlot('producto', i, articulo.imagenesProducto[i]))}
      </div>
    </div>
    {/* Separador vertical */}
    <div className="w-px bg-border self-stretch mt-4" />
    {/* Grupo Etiqueta */}
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">Etiqueta</p>
      <div className="flex gap-1">
        {[0,1,2].map(i => renderSlot('etiqueta', i, articulo.imagenesEtiqueta[i]))}
      </div>
    </div>
  </div>
</div>
```

Definir la funcion renderSlot dentro del componente (antes del return):
```
function renderSlot(tipo: 'producto' | 'etiqueta', index: number, url: string | null | undefined) {
  const hasImage = url != null
  if (hasImage) {
    return (
      <button
        key={`${tipo}-${index}`}
        onClick={() => openLightboxForType(tipo, url)}
        className="w-12 h-12 rounded-sm overflow-hidden cursor-pointer border border-border hover:opacity-80 transition-opacity flex-shrink-0"
      >
        <img
          src={API_BASE_URL + getThumbUrl(url)}
          className="w-full h-full object-cover"
          alt=""
        />
      </button>
    )
  }
  return (
    <div
      key={`${tipo}-${index}`}
      className="w-12 h-12 rounded-sm border-2 border-dashed border-muted-foreground/20 flex items-center justify-center flex-shrink-0"
    >
      <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
    </div>
  )
}
```

Actualizar openLightboxForType para que funcione como secuencia unificada en el lightbox:
- Cambiar la funcion para que al abrir el lightbox combine TODAS las imagenes no-null de producto + etiqueta en una sola secuencia
- El indice inicial se calcula sumando: si es tipo 'producto', el indice dentro de las no-null de producto; si es 'etiqueta', cuenta total de no-null producto + indice dentro de no-null etiqueta

Nueva implementacion de openLightboxForType:
```
function openLightboxForType(tipo: 'etiqueta' | 'producto', clickedUrl: string) {
  if (!articulo) return
  const productoUrls = articulo.imagenesProducto.filter((u): u is string => u != null)
  const etiquetaUrls = articulo.imagenesEtiqueta.filter((u): u is string => u != null)
  const allImages = [...productoUrls, ...etiquetaUrls]
  const clickedIndex = allImages.indexOf(clickedUrl)
  setLightbox({ images: allImages, initialIndex: Math.max(0, clickedIndex) })
}
```

Esto unifica la navegacion del lightbox: producto y etiqueta como una sola secuencia con flechas.
  </action>
  <verify>
    <automated>cd /home/sanchez/proyectos/objetiva-comercios-admin && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20</automated>
  </verify>
  <done>El panel detalle muestra fila unica de 9 slots (6 producto + separador vertical + 3 etiqueta), con labels por grupo, placeholders dashed para vacios, thumbnails 48x48 para llenos, y lightbox unificado al hacer click.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

No trust boundaries crossed — cambios puramente de presentacion en frontend. Los datos de imagenes ya se reciben del backend validado.

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-ifc-01 | I (Information Disclosure) | thumbnail URLs | accept | URLs ya son publicas via API existente, no cambia el modelo de acceso |
</threat_model>

<verification>
1. TypeScript compila sin errores: `npx tsc --noEmit --project apps/web/tsconfig.json`
2. Verificacion visual: abrir lista de articulos, confirmar iconos Image/Tag con conteos
3. Verificacion visual: abrir panel detalle de un articulo con imagenes, confirmar 9 slots en fila
4. Verificacion visual: abrir panel detalle de un articulo sin imagenes, confirmar 9 placeholders dashed
5. Click en thumbnail del detalle abre lightbox con navegacion unificada
</verification>

<success_criteria>
- Lista de articulos muestra columna compacta de iconos entre nombre y marca
- Iconos con imagenes muestran conteo numerico, sin imagenes muestran punto medio gris
- Panel detalle siempre muestra 9 slots (6+3) con separador vertical
- Placeholders vacios tienen borde dashed e icono al 30% opacity
- Thumbnails son 48x48 (w-12 h-12) con click que abre lightbox
- Lightbox navega producto + etiqueta como secuencia unica
</success_criteria>

<output>
After completion, create `.planning/quick/260410-ifc-redise-o-de-im-genes-de-art-culos-iconos/260410-ifc-SUMMARY.md`
</output>
