# Configuración de visibilidad de campos de artículos

## Contexto

El módulo de artículos tiene propiedades que no aplican a todos los tipos de negocio (talle, color, material, etc.). Se necesita una sección en configuración para habilitar/deshabilitar qué campos se muestran en la UI.

## Decisiones clave

- La config se almacena como columna JSONB `articulos_config` en la tabla existente `business_settings`
- Ocultar un campo solo lo esconde de la UI, nunca borra datos
- Campos siempre visibles (sin toggle): código, nombre, precio de venta, estado
- Ocultar `costo` también oculta el hero stat card de costo en el sheet de detalle
- `erp: false` oculta la sección ERP completa en form/sheet Y la columna `erpCodigo` en la tabla
- `origen: false` oculta la sección Origen completa en form/sheet
- SKU y código de barras se ocultan dentro de la sección Identificación existente (no se reestructura el form)
- El PATCH siempre recibe el objeto `camposVisibles` completo (no parciales), evitando deep merge

## Modelo de datos

Nueva columna en `business_settings`:

```sql
articulos_config JSONB DEFAULT '{
  "camposVisibles": {
    "marca": true,
    "modelo": true,
    "talle": false,
    "color": false,
    "material": false,
    "presentacion": true,
    "medida": true,
    "sku": true,
    "codigoBarras": true,
    "costo": true,
    "observaciones": true,
    "erp": true,
    "origen": true
  }
}'
```

### Tipo TypeScript

```typescript
interface CamposVisibles {
  // Propiedades físicas
  marca: boolean
  modelo: boolean
  talle: boolean
  color: boolean
  material: boolean
  presentacion: boolean
  medida: boolean
  // Identificación adicional
  sku: boolean
  codigoBarras: boolean
  // Precios
  costo: boolean
  // Secciones
  observaciones: boolean
  erp: boolean
  origen: boolean
}

interface ArticulosConfig {
  camposVisibles: CamposVisibles
}
```

### Defaults compartidos

Exportar un objeto `DEFAULT_ARTICULOS_CONFIG` desde un archivo compartido para usar tanto en el schema Drizzle como en el fallback del hook frontend:

```typescript
export const DEFAULT_ARTICULOS_CONFIG: ArticulosConfig = {
  camposVisibles: {
    marca: true,
    modelo: true,
    talle: false,
    color: false,
    material: false,
    presentacion: true,
    medida: true,
    sku: true,
    codigoBarras: true,
    costo: true,
    observaciones: true,
    erp: true,
    origen: true,
  },
}
```

## Backend

### Schema Drizzle

Agregar a `business_settings` en `apps/backend/src/db/schema.ts`:

```typescript
articulosConfig: jsonb('articulos_config').$type<ArticulosConfig>().default(DEFAULT_ARTICULOS_CONFIG),
```

### Migración

Incluir `UPDATE business_settings SET articulos_config = '<defaults>' WHERE articulos_config IS NULL` para el row existente.

### DTO

Crear DTOs con `class-validator` para validación nested:

```typescript
class CamposVisiblesDto {
  @IsBoolean() marca: boolean
  @IsBoolean() modelo: boolean
  @IsBoolean() talle: boolean
  @IsBoolean() color: boolean
  @IsBoolean() material: boolean
  @IsBoolean() presentacion: boolean
  @IsBoolean() medida: boolean
  @IsBoolean() sku: boolean
  @IsBoolean() codigoBarras: boolean
  @IsBoolean() costo: boolean
  @IsBoolean() observaciones: boolean
  @IsBoolean() erp: boolean
  @IsBoolean() origen: boolean
}

class ArticulosConfigDto {
  @ValidateNested()
  @Type(() => CamposVisiblesDto)
  camposVisibles: CamposVisiblesDto
}
```

Extender `UpdateSettingsDto` con:

```typescript
@IsOptional()
@ValidateNested()
@Type(() => ArticulosConfigDto)
articulosConfig?: ArticulosConfigDto
```

### Controller/Service

El GET ya devuelve todo el row. El PATCH usa spread directo, lo cual funciona porque `articulosConfig` se envía siempre completo (no parcial), así que el spread reemplaza todo el objeto JSONB correctamente.

## Frontend

### Tipo `BusinessSettings`

Actualizar `apps/web/src/types/settings.ts` para incluir `articulosConfig`:

```typescript
export interface BusinessSettings {
  id: number
  companyName: string
  address: string | null
  taxId: string | null
  logoSquare: string | null
  logoRectangular: string | null
  articulosConfig: ArticulosConfig | null
}
```

### Nueva página: `/settings/articulos`

Agregar item "Artículos" con icono `Package` (lucide-react) a `settings-nav.tsx`.

Crear `apps/web/src/app/(dashboard)/settings/articulos/page.tsx`.

Layout: 4 cards con toggles (Switch de shadcn):

1. **Propiedades físicas** — marca, modelo, talle, color, material, presentación, medida
2. **Identificación adicional** — SKU, código de barras
3. **Precios** — costo
4. **Secciones** — observaciones, ERP, origen

Cada toggle muestra el nombre del campo y su estado. Botón guardar al final que hace PATCH a `/api/settings`.

### Fetch client-side de settings

Agregar `fetchSettingsClient()` a `apps/web/src/lib/api.client.ts` (análogo al server-side `fetchSettings()` que ya existe en `api.ts`). Usar SWR para cache y deduplicación de requests.

### Hook: `useArticulosConfig()`

Ubicación: `apps/web/src/hooks/use-articulos-config.ts`

Usa SWR internamente (via `fetchSettingsClient`) para cache. Si `articulosConfig` es `null`, devuelve `DEFAULT_ARTICULOS_CONFIG` como fallback.

Expone:

- `camposVisibles`: el objeto con los booleanos
- `isCampoVisible(campo: keyof CamposVisibles): boolean`: helper tipado
- `isLoading`: estado de carga

### Consumidores

El hook se usa en estos componentes para ocultar condicionalmente campos/columnas/secciones:

- `articulo-form.tsx` — oculta inputs de campos deshabilitados
- `articulo-sheet.tsx` — oculta campos en el detalle y hero stat card de costo
- `articulos-columns.tsx` — excluye columnas deshabilitadas de la tabla (incluyendo `erpCodigo` cuando `erp: false`)
- `[codigo]/editar/page.tsx` — misma lógica que el form

## Valores por defecto

Para este negocio específico, talle, color y material arrancan deshabilitados (`false`). El resto arranca habilitado (`true`). Estos defaults se aplican en:

1. Schema de la DB (default de columna)
2. Migración (UPDATE para rows existentes)
3. Hook frontend (fallback cuando `articulosConfig` es `null`)

## Fuera de alcance

- Configuración por usuario (es a nivel negocio)
- Campos custom/dinámicos
- Reordenamiento de campos
