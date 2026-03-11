# Configuración de visibilidad de campos de artículos

## Contexto

El módulo de artículos tiene propiedades que no aplican a todos los tipos de negocio (talle, color, material, etc.). Se necesita una sección en configuración para habilitar/deshabilitar qué campos se muestran en la UI.

## Decisiones clave

- La config se almacena como columna JSONB `articulos_config` en la tabla existente `business_settings`
- Ocultar un campo solo lo esconde de la UI, nunca borra datos
- Campos siempre visibles (sin toggle): código, nombre, precio de venta, estado

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
interface ArticulosConfig {
  camposVisibles: {
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
}
```

## Backend

### Schema Drizzle

Agregar a `business_settings` en `apps/backend/src/db/schema.ts`:

```typescript
articulosConfig: jsonb('articulos_config').$type<ArticulosConfig>().default({
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
  }
}),
```

### DTO

Extender `UpdateSettingsDto` para aceptar `articulosConfig` con validación de estructura.

### Controller/Service

El GET ya devuelve todo el row. El PATCH ya acepta parciales. Solo necesita que el DTO acepte el nuevo campo.

## Frontend

### Nueva página: `/settings/articulos`

Agregar item "Artículos" a `settings-nav.tsx` y crear `apps/web/src/app/(dashboard)/settings/articulos/page.tsx`.

Layout: 4 cards con toggles (Switch de shadcn):

1. **Propiedades físicas** — marca, modelo, talle, color, material, presentación, medida
2. **Identificación adicional** — SKU, código de barras
3. **Precios** — costo
4. **Secciones** — observaciones, ERP, origen

Cada toggle muestra el nombre del campo y su estado. Botón guardar al final que hace PATCH a `/api/settings`.

### Hook: `useArticulosConfig()`

Ubicación: `apps/web/src/hooks/use-articulos-config.ts`

Lee `articulosConfig` desde los settings del negocio. Expone:

- `camposVisibles`: el objeto con los booleanos
- `isCampoVisible(campo: string): boolean`: helper para chequear un campo
- `isLoading`: estado de carga

### Consumidores

El hook se usa en estos componentes para ocultar condicionalmente campos/columnas/secciones:

- `articulo-form.tsx` — oculta inputs de campos deshabilitados
- `articulo-sheet.tsx` — oculta campos en el detalle
- `articulos-columns.tsx` — excluye columnas deshabilitadas de la tabla
- `[codigo]/editar/page.tsx` — misma lógica que el form

## Valores por defecto

Para este negocio específico, talle, color y material arrancan deshabilitados (`false`). El resto arranca habilitado (`true`). Estos defaults se aplican tanto en el schema de la DB como cuando el frontend no encuentra config.

## Fuera de alcance

- Configuración por usuario (es a nivel negocio)
- Campos custom/dinámicos
- Reordenamiento de campos
