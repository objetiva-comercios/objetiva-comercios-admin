---
phase: 29-catalogos-de-atributos
reviewed: 2026-04-30T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - .gitignore
  - apps/backend/drizzle/0004_phase29_propiedades.sql
  - apps/backend/drizzle/0005_phase29_cache_trigger.sql
  - apps/backend/drizzle/meta/_journal.json
  - apps/backend/package.json
  - apps/backend/src/app.module.ts
  - apps/backend/src/db/schema.ts
  - apps/backend/src/db/seed-e2e.ts
  - apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts
  - apps/backend/src/modules/propiedades/dto/update-propiedad.dto.ts
  - apps/backend/src/modules/propiedades/propiedades.constants.ts
  - apps/backend/src/modules/propiedades/propiedades.controller.ts
  - apps/backend/src/modules/propiedades/propiedades.module.ts
  - apps/backend/src/modules/propiedades/propiedades.service.ts
  - apps/web/.env.test.example
  - apps/web/package.json
  - apps/web/src/app/(dashboard)/propiedades/page.tsx
  - apps/web/src/components/propiedades/propiedad-create-dialog.test.tsx
  - apps/web/src/components/propiedades/propiedad-create-dialog.tsx
  - apps/web/src/components/propiedades/propiedad-deactivate-dialog.tsx
  - apps/web/src/components/propiedades/propiedad-edit-dialog.tsx
  - apps/web/src/components/propiedades/propiedad-table.tsx
  - apps/web/src/components/propiedades/propiedades-page.tsx
  - apps/web/src/config/navigation.ts
  - apps/web/src/lib/abrev.test.ts
  - apps/web/src/lib/abrev.ts
  - apps/web/src/lib/api.client.ts
  - apps/web/src/types/propiedad.ts
  - apps/web/vitest.config.ts
findings:
  blocker: 2
  warning: 9
  info: 4
  total: 15
status: issues_found
---

# Phase 29: Code Review Report

**Reviewed:** 2026-04-30
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Phase 29 implementa el módulo genérico `Propiedades` (6 catálogos `prop_*`) con buena disciplina general: las queries Drizzle están parametrizadas (no hay riesgo de SQLi), RBAC se aplica correctamente (writes restringidos a `admin` vía `RolesGuard`+`@Roles('admin')`, reads abiertos a admin+viewer por el `CompositeAuthGuard` global), y el helper `handleUniqueViolation` desempaca correctamente `DrizzleQueryError.cause` para detectar SQLSTATE 23505. La tipografía de género (`copyFor`) está aplicada de forma consistente en los 4 componentes web.

Sin embargo, hay **dos defectos BLOCKER** que deben resolverse antes de que el código avance: (1) el journal de migraciones de Drizzle está fuera de sync con el filesystem — la migración existente `0003_add_columna_inv_articulos.sql` no tiene entrada en `_journal.json` y faltan los snapshots `0003/0004/0005`, lo que romperá `drizzle-kit migrate` en cualquier entorno limpio; (2) la `vitest.config.ts` está configurada con `environment: 'node'` pero sin `setupFiles`, mientras que la suite del Dialog se basa en `@testing-library/react` + jsdom y en polyfills (`hasPointerCapture`, `scrollIntoView`) que jsdom no provee por defecto — el test fallará apenas se ejecute.

Además se identifican 9 WARNINGs (entre ellas: el seed E2E mezcla credenciales hardcodeadas en defaults, el bloque SQL del trigger usa `EXECUTE format()` con argumentos del trigger sin validación que es intrínsecamente seguro pero expone un patrón a copiar mal en Phase 30/31, race entre `findOne` y `update` en `toggleActive`, validación inconsistente entre DTOs y schema BD, y mismatch de empty state copy) y 4 INFO menores.

## Critical Issues

### CR-01: Drizzle migration journal está fuera de sync con el filesystem (BLOCKER)

**File:** `apps/backend/drizzle/meta/_journal.json:1-41` y `apps/backend/drizzle/meta/`

**Issue:**
El filesystem contiene 6 SQL files (`0000`..`0005`), pero el `_journal.json` solo lista 5 entries y **omite `0003_add_columna_inv_articulos`** por completo:

- `idx: 3 → "0004_phase29_propiedades"` (debería ser `idx: 3 → "0003_add_columna_inv_articulos"`)
- `idx: 4 → "0005_phase29_cache_trigger"` (debería ser `idx: 4 → "0004_phase29_propiedades"`)
- Falta `idx: 5 → "0005_phase29_cache_trigger"`

Adicional: `apps/backend/drizzle/meta/` solo tiene `0000_snapshot.json`, `0001_snapshot.json`, `0002_snapshot.json`. **Faltan `0003_snapshot.json`, `0004_snapshot.json` y `0005_snapshot.json`**, que `drizzle-kit` necesita para validar el grafo de migraciones y para regenerar futuros diffs.

Consecuencias:

1. `pnpm db:migrate` en un entorno limpio probablemente saltea la migración `0003` (la real, columna `columna` en `inventarios_articulos`) o aplica las phase29 en orden incorrecto.
2. `pnpm db:generate` (próxima fase) va a producir un diff inconsistente porque no tiene el snapshot 0005 como baseline.
3. Si dos developers regeneran el journal en paralelo (Phase 30/31), van a producir migraciones colisionantes.

**Fix:**
Re-generar el journal y los snapshots desde el snapshot 0002 hacia adelante, ejecutando una vez:

```bash
# Desde apps/backend/, hacer un drop+recreate del journal en orden correcto.
# Si ninguna migración 0003-0005 fue aplicada en producción, lo mas seguro es:
rm drizzle/meta/0003*.json drizzle/meta/0004*.json drizzle/meta/0005*.json 2>/dev/null
# Reconstruir journal manualmente con las 6 entries en orden 0..5
# y luego correr `pnpm db:generate` para que drizzle-kit recalcule snapshots.
```

Si las migraciones ya están aplicadas en algún entorno (verificar `drizzle.__drizzle_migrations`), hay que sincronizar la tabla manualmente. Documentar en `29-SUMMARY.md` qué entornos están afectados antes de tocar prod (regla del repo: `feedback_never_drop_tables.md`).

---

### CR-02: `vitest.config.ts` no tiene jsdom ni setupFiles para los tests RTL (BLOCKER)

**File:** `apps/web/vitest.config.ts:13-17`

**Issue:**
La config global declara `environment: 'node'` y no define `setupFiles`. La suite `propiedad-create-dialog.test.tsx` declara `// @vitest-environment jsdom` localmente, lo que aísla el cambio de environment, pero **no hay polyfills** para los métodos que jsdom no provee y que Radix UI consume al renderizar `Dialog`/`Form`/`Input`:

- `Element.prototype.hasPointerCapture` (Radix 1.1.x lo invoca en `@radix-ui/react-dialog` y `@radix-ui/react-popover`)
- `Element.prototype.scrollIntoView` (también referenciado)
- `ResizeObserver` (algunos sub-componentes de Radix lo usan indirectamente)

Resultado esperado al correr `pnpm --filter @objetiva/web test`:

```
TypeError: target.hasPointerCapture is not a function
  at @radix-ui/react-dialog/dist/index.mjs
```

El segundo test (`it('invoca onCreated...')`) **no va a llegar a ejecutar** `userEvent.type`/`click` porque el render del Dialog rompe primero. Esto significa que el contrato público que el test pretende garantizar (D-19, reuse en Phase 32) **no está realmente verificado** — el test mas bien aporta un falso negativo al CI.

Adicional: el test importa `'@testing-library/jest-dom/vitest'` localmente, pero esto debería estar en un `setupFiles` global para que todos los matchers (`toBeInTheDocument`, etc.) estén disponibles en futuros tests sin re-importar.

**Fix:**
Agregar `setupFiles` en `vitest.config.ts` y crear un setup file con polyfills:

```ts
// apps/web/vitest.config.ts
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

```ts
// apps/web/src/test-setup.ts
import '@testing-library/jest-dom/vitest'

// Polyfills jsdom-missing APIs que Radix UI consume.
if (typeof window !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as never
  }
}
```

Verificar después con `pnpm --filter @objetiva/web test --reporter=verbose` que ambos `it(...)` corren a green.

---

## Warnings

### WR-01: Race condition leve entre `findOne` y `update` en `toggleActive`

**File:** `apps/backend/src/modules/propiedades/propiedades.service.ts:96-109`

**Issue:**
`toggleActive` hace dos roundtrips no transaccionales:

```ts
const existing = await this.findOne(tipo, id)        // roundtrip 1
if (!existing) throw new NotFoundException(...)
const rows = await this.drizzle.db
  .update(table)
  .set({ activo: !existing.activo, ... })
  .where(eq(table.id, id))
  .returning()                                       // roundtrip 2
return rows[0]                                        // ← undefined si fila desaparece entre 1 y 2
```

Si entre el `findOne` y el `update` otra request borra la fila (improbable, no hay DELETE en este modulo, pero un `truncate` admin desde CLI lo logra), `rows[0]` queda `undefined` y el controller devuelve `200` con `null` al cliente, que en el frontend rompe el toast (`toast({ title: \`${c.singular} ${c.desactivada}\` })`aún muestra mensaje de éxito aunque la operación fue no-op). Además, el toggle no es atómico — bajo carga concurrente dos toggles seguidos pueden ambos leer`activo=true`y ambos setearlo a`false` (idempotente en este caso, pero el patrón es frágil).

**Fix:**
Hacer el toggle atómico en una sola query (Postgres soporta `NOT activo` directamente en el SET) y validar el resultado:

```ts
async toggleActive(tipo: PropTipo, id: number) {
  const table = this.tableFor(tipo)
  const rows = await this.drizzle.db
    .update(table)
    .set({ activo: sql`NOT ${table.activo}`, updatedAt: new Date() })
    .where(eq(table.id, id))
    .returning()
  if (!rows[0]) {
    const label = PROP_LABELS[tipo].singular
    throw new NotFoundException(`${capitalize(label)} con ID ${id} no encontrada`)
  }
  return rows[0]
}
```

(Importar `sql` desde `drizzle-orm`.) Esto elimina la race y reduce a 1 roundtrip.

---

### WR-02: DTO `CreatePropiedadDto` no recorta ni normaliza `abrev` antes de `@Matches`

**File:** `apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts:11-15` y `update-propiedad.dto.ts:14-18`

**Issue:**
El DTO recorta `nombre` con `@Transform(value.trim())`, pero `abrev` no recibe trim ni `toUpperCase()`. Un cliente que mande `" SHI "` o `"shi"` recibirá un 400 de `@Matches`, lo cual es correcto desde el punto de vista de seguridad (whitelist), pero la UI ya hace `e.target.value.toUpperCase()` en el frontend (`propiedad-create-dialog.tsx:173`, `propiedad-edit-dialog.tsx:138`) — por consistencia y robustez ante clientes API directos (script, postman, móvil futura), el DTO debería normalizar antes de validar:

```ts
@IsString()
@Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
@Matches(/^[A-Z0-9]{1,8}$/, { message: '...' })
abrev!: string
```

Sin esto, "shi" del cliente da 400 con un mensaje técnico de regex en lugar de auto-corregirse a "SHI" — degrada UX si alguien usa el endpoint directamente.

**Fix:** agregar `@Transform` con `.trim().toUpperCase()` a `abrev` en ambos DTOs (create y update).

---

### WR-03: `seed-e2e.ts` hardcodea password placeholder que puede crear cuenta admin viable

**File:** `apps/backend/src/db/seed-e2e.ts:36-38`

**Issue:**
El seed expone:

```ts
const password = process.env.E2E_ADMIN_PASSWORD ?? 'e2e-admin-pwd-CHANGE-ME'
```

Si alguien corre `E2E_SEED=true pnpm db:seed:e2e` apuntando accidentalmente a una DB Supabase de producción **sin** setear `E2E_ADMIN_PASSWORD`, queda creado un usuario `e2e-admin@test.local` con role=admin y password `e2e-admin-pwd-CHANGE-ME` — credenciales conocidas y commiteadas. Esto es un riesgo serio de pivoting.

El comentario aclara "El password real NO se commitea" pero el fallback default ESTÁ en source.

**Fix:**
Hacer el password obligatorio explícitamente:

```ts
const password = process.env.E2E_ADMIN_PASSWORD
if (!password) {
  throw new Error('[seed-e2e] E2E_ADMIN_PASSWORD debe estar definido en .env.test')
}
```

Y agregar un guard secundario que verifique que la URL contiene `localhost` o `db.supabase.co` con un project_ref de testing, no el de producción:

```ts
if (!process.env.E2E_ALLOW_REMOTE && !url.includes('localhost') && !url.includes('127.0.0.1')) {
  throw new Error('[seed-e2e] Refusing to seed against non-local DB without E2E_ALLOW_REMOTE=true')
}
```

---

### WR-04: Trigger SQL preparado usa `EXECUTE format(... %I, TG_ARGV[0])` correctamente, pero no documenta por qué `%I` es seguro

**File:** `apps/backend/drizzle/0005_phase29_cache_trigger.sql:23-29`

**Issue:**
El bloque comentado usa `%I` para los identificadores de columna pasados via `TG_ARGV[0]/[1]`, lo cual **es seguro contra SQLi** (Postgres `format` con `%I` quote-encloses identifiers, no concatena texto). Como el trigger se va a copiar/pegar a Phase 30/31, conviene documentar explícitamente esto para evitar que alguien lo refactorice a `%s` o concat de strings y abra una vulnerabilidad. El comentario actual menciona "denorm trigger" y "no-op safe to re-run" pero no dice nada del rationale de `%I`.

Riesgo concreto: en Phase 30/31, alguien que toque el trigger podría reemplazar `format('UPDATE articulos SET %I = $1 WHERE %I = $2', ...)` por una concatenación de strings tipo `'UPDATE articulos SET ' || TG_ARGV[0] || ' = $1 ...'` y abrir SQLi si los `TG_ARGV` quedan controlables.

**Fix:**
Agregar comentario inline al function body explicando la garantía:

```sql
CREATE OR REPLACE FUNCTION cache_nombre_prop()
RETURNS TRIGGER AS $$
BEGIN
  -- SEGURIDAD: %I (identifier-quote) vs %s (raw string). Los TG_ARGV vienen de la
  -- definicion CREATE TRIGGER (estatica, controlada por dev), pero usamos %I como
  -- defense-in-depth — no refactorizar a concat de texto.
  IF NEW.nombre IS DISTINCT FROM OLD.nombre THEN
    EXECUTE format('UPDATE articulos SET %I = $1 WHERE %I = $2', TG_ARGV[0], TG_ARGV[1])
      USING NEW.nombre, NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### WR-05: Empty state en `propiedad-table.tsx` arma frase con concatenación frágil de copyFor

**File:** `apps/web/src/components/propiedades/propiedad-table.tsx:178-188`

**Issue:**
El JSX:

```tsx
Sin {c.pluralLower}. Usá el botón {c.nuevo}{' '}
{c.singularLower} para agregar {c.articulo}{' '}
{c.primera}.
```

Para `tipo="marca"` (femenino) renderiza: `Sin marcas. Usá el botón Nueva marca para agregar la primera.` ✅

Para `tipo="objeto"` (masculino) renderiza: `Sin objetos. Usá el botón Nuevo objeto para agregar el primero.` ✅

Para `tipo="color"` (masculino) renderiza: `Sin colores. Usá el botón Nuevo color para agregar el primero.` ✅

Funciona, pero `c.primera` está nombrado mal — no es siempre "primera" (femenino), también devuelve "primero". Para alguien leyendo `propiedad-table.tsx` aislado, la línea `agregar {c.articulo} {c.primera}` se lee como "agregar la primera" siempre. El nombre `primera` engaña; debería llamarse `primeraOPrimero` o más simple `primero` en el record para no inducir a error.

Adicional menor: `c.singular` está capitalizado ('Marca'), pero en la frase del empty state se quiere lowercase ("agregar la primera marca" funciona, "agregar la primera Marca" no). El código lo evita pero solo porque el empty state no incluye `c.singular` — si alguien lo agrega va a renderizar capitalizado en mitad de oración.

**Fix:**
Renombrar `primera → primeroOPrimera` en `copyFor` (o más limpio, dejar `primera` para género femenino y agregar `primero` para masculino, pero exponer ambos como dos claves distintas y elegir en el JSX):

```ts
// types/propiedad.ts copyFor:
ordinalPrimero: f ? 'primera' : 'primero',
```

Y usar `c.ordinalPrimero` en el empty state. La key actual es ambigua.

---

### WR-06: Doble `.slice()` en `suggestAbrev` puede confundir — el segundo slice nunca acota más

**File:** `apps/web/src/lib/abrev.ts:34-42`

**Issue:**

```ts
.slice(0, takeChars)
.slice(0, 8) // hard cap defense-in-depth
```

Si `takeChars > 8` (e.g., 20), el primer slice toma 20 chars y el segundo recorta a 8 — funciona. Pero si `takeChars=4` (default), el primer slice limita a 4 y el segundo es no-op. Esto es correcto pero el comentario "hard cap defense-in-depth" sugiere que hay un escenario donde el primer slice no protege — y de hecho, **el primer slice ya impide superar `takeChars`**, así que el cap a 8 sólo funciona cuando alguien pasa `takeChars > 8`. Para defense-in-depth real frente a un input gigante, el patrón debería ser:

```ts
const cap = Math.min(takeChars, 8)
return ...slice(0, cap)
```

O reordenar:

```ts
.slice(0, 8)            // cap absoluto primero
.slice(0, takeChars)    // luego el override del usuario
```

El test `expect(suggestAbrev('Abcdefghijklmnop', 20)).toHaveLength(8)` pasa con la implementación actual, pero el orden actual es contraintuitivo cuando se lee.

**Fix:** Reordenar a `.slice(0, 8).slice(0, takeChars)` (más limpio: cap primero, override después) o usar `Math.min`. No es un bug, pero es un olor.

---

### WR-07: `PropiedadCreateDialog` mapea errores del backend a campos por substring matching

**File:** `apps/web/src/components/propiedades/propiedad-create-dialog.tsx:113-126` y `propiedad-edit-dialog.tsx:85-98`

**Issue:**

```ts
const lower = message.toLowerCase()
if (lower.includes('nombre')) {
  form.setError('nombre', { message })
} else if (lower.includes('abreviación') || lower.includes('abrev')) {
  form.setError('abrev', { message })
}
```

Esto acopla la UI a la wording exacta del backend. Si el mensaje del backend cambia (e.g., a inglés, o a "duplicate value violates...") el error queda en el toast genérico. Más grave: si el backend manda `"Ya existe una marca con el nombre 'TestBrand'"`, el lower contiene "nombre", lo que es lo correcto. Pero si manda el fallback genérico `"Conflicto de unicidad en marcas"`, va al toast — OK. Si manda `"La abreviación 'TEST' ya existe en marcas"`, lower contiene "abreviación" — correcto.

El problema es que `nombre` ES un substring común y puede colisionar. Por ejemplo, un futuro mensaje "El nombre de la abreviación es inválido" mapeará a `nombre` cuando debería ser `abrev`. Frágil.

**Fix:**
El backend debería retornar un código de error estructurado o usar el campo `errors` de NestJS, e.g.:

```ts
throw new ConflictException({
  message: `Ya existe una ${label.singular} con el nombre "${dto.nombre}"`,
  field: 'nombre',
})
```

Y el cliente leería `body.field` directo. Si no se quiere refactor, al menos chequear `nombre` PRIMERO solo si la palabra completa aparece (regex `\bnombre\b`).

---

### WR-08: `assertValidTipo` lanza `NotFoundException` (404) en el controller, pero `tableFor` lanza `BadRequestException` (400) en el service para el mismo caso

**File:** `apps/backend/src/modules/propiedades/propiedades.controller.ts:85-89` y `propiedades.service.ts:27-33`

**Issue:**
Inconsistencia de respuesta HTTP para "tipo inválido":

- Si el request es `GET /api/propiedades/foo` → controller lanza `NotFoundException` → 404
- Si el service se llama desde otro módulo (Phase 32 reuse) con `tipo='foo'` → service lanza `BadRequestException` → 400

`tableFor` en realidad nunca debería ser alcanzable porque el controller hace `assertValidTipo` antes — pero esa garantía depende del controller. Si en Phase 30/31 alguien llama `propiedadesService.findAll('xxx' as PropTipo)` desde otro service (cast forzado), el caller recibe 400 mientras que la API HTTP retorna 404. Confuso.

Decidir un único contrato. Opciones:

a) Tipo inválido → siempre 400 (es un error de cliente, no recurso ausente). Cambiar el controller a `BadRequestException`.
b) Tipo inválido → siempre 404 (recurso `propiedades/foo` no existe). Cambiar el service a `NotFoundException`.

(a) es la convención Nest más común. El comentario del controller `Valida el URL param 'tipo' contra PROP_TIPOS, narrowing a PropTipo` sugiere que la intent es realmente "input inválido" → 400.

**Fix:** Cambiar a `BadRequestException` en el controller para alinear con el service:

```ts
private assertValidTipo(tipo: string): asserts tipo is PropTipo {
  if (!(PROP_TIPOS as readonly string[]).includes(tipo)) {
    throw new BadRequestException(`Tipo de propiedad inválido: ${tipo}`)
  }
}
```

---

### WR-09: `findAll` con `?activo=` (string vacío) rutea al default `true` silenciosamente

**File:** `apps/backend/src/modules/propiedades/propiedades.controller.ts:30-44`

**Issue:**

```ts
let activoFilter: boolean | undefined
if (activo === undefined) activoFilter = true
else if (activo === 'all') activoFilter = undefined
else if (activo === 'true') activoFilter = true
else if (activo === 'false') activoFilter = false
else activoFilter = true // ← cualquier valor desconocido (incluye '')
```

Si un cliente manda `?activo=` (vacío), `?activo=1`, `?activo=yes` — todos caen al fallback "default seguro" `true`. El comentario describe esto como "default seguro". Pero un cliente que no entendió la API puede creer que está obteniendo todo (inactivos+activos) y solo recibe activos, sin error. Eso es UX/correctness frágil — silenciar input mal-formado es la misma raíz de bugs que el WR-07.

**Fix:**
Lanzar `BadRequestException` para valores no en la lista admitida:

```ts
const VALID_ACTIVO = ['true', 'false', 'all'] as const
if (activo !== undefined && !(VALID_ACTIVO as readonly string[]).includes(activo)) {
  throw new BadRequestException(
    `Query param 'activo' debe ser 'true', 'false' o 'all' (recibido: '${activo}')`
  )
}
```

---

## Info

### IN-01: Migration SQL no incluye `IF NOT EXISTS` — re-runs fallarán

**File:** `apps/backend/drizzle/0004_phase29_propiedades.sql:1-78`

**Issue:**
Drizzle-kit no genera `CREATE TABLE IF NOT EXISTS` por default. Si por alguna razón hay que re-correr la migración manualmente (e.g., recovery parcial, fallo a mitad), va a fallar con `relation "prop_color" already exists`. Esto es estándar con drizzle-kit y no es un defect de esta phase, solo un info para el playbook de incidentes.

**Fix:** No es necesario ahora. Documentar en `29-VALIDATION.md` que la migración no es idempotente y requiere `DROP CASCADE` antes de re-correr en dev.

---

### IN-02: `propiedad-deactivate-dialog` permite `propTipo` opcional para back-compat, pero no hay caller histórico

**File:** `apps/web/src/components/propiedades/propiedad-deactivate-dialog.tsx:18,31-32`

**Issue:**

```ts
propTipo?: PropTipo
// ...
const pronombre = propTipo ? copyFor(propTipo).pronombre : 'la'
```

El comentario dice "para back-compat; sin él asumimos femenino (default histórico)". Pero esta phase es nueva — no hay back-compat real. El optional + el default `'la'` solo introduce una ruta donde la UI muestra "que la usan" para un objeto masculino si alguien olvida pasar el prop.

**Fix:** Hacer `propTipo` requerido. Es un componente nuevo con un solo callsite (`propiedad-table.tsx:271`).

---

### IN-03: `PropiedadEditDialog.onSuccess` se invoca después de cerrar el dialog, lo que dispara `loadData()` con dialog cerrado — orden invertido vs. `onCreated`

**File:** `apps/web/src/components/propiedades/propiedad-edit-dialog.tsx:82-84` vs. `propiedad-create-dialog.tsx:110-112`

**Issue:**
Edit:

```ts
toast({ title: ... })
onOpenChange(false)
onSuccess()
```

Create:

```ts
toast({ title: ... })
onCreated?.(created)
onOpenChange(false)
```

Los órdenes son inconsistentes. No hay bug funcional (los handlers de la tabla son idempotentes), pero hace más difícil razonar. Estandarizar a uno solo. Convención más común: invocar callback antes de cerrar para que el parent vea el dato fresco antes del unmount.

**Fix:** Cambiar Edit a:

```ts
toast({ title: ... })
onSuccess()
onOpenChange(false)
```

---

### IN-04: `seed-e2e.ts` usa `crypt(${password}, gen_salt('bf'))` — depende de extensión `pgcrypto` que no se valida

**File:** `apps/backend/src/db/seed-e2e.ts:78`

**Issue:**
La query usa `crypt()` y `gen_salt('bf')` que requieren `CREATE EXTENSION pgcrypto`. En projects Supabase nuevos `pgcrypto` viene habilitado, pero si alguien corre el seed contra un Postgres local sin la extensión, falla con error críptico de función no encontrada.

**Fix:** No es bloqueante para Supabase; documentar la dependencia en el comentario del archivo:

```ts
/**
 * REQUIERE: extension `pgcrypto` (default en Supabase). Si la DB local no la
 * tiene, ejecutar primero: CREATE EXTENSION IF NOT EXISTS pgcrypto;
 */
```

---

_Reviewed: 2026-04-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
