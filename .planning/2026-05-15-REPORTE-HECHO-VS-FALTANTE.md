# Reporte hecho-vs-faltante — 2026-05-15

Auditoría desatendida tras la reconstrucción post-incidente (data wipe del 2026-05-01 + bug schema drift articulos detectado y fixeado 2026-05-15). Combina inspección documental (`.planning/`), verificación del codebase (backend + frontend + DB) y walkthrough exhaustivo del admin web vía playwright-cli sobre `http://erp.sanchezrepuestos.com.ar`.

## TL;DR

- **Phase 29 (Catálogos de Atributos)**: 100% construida, deployada, smoke OK con UI + 6 tabs CRUD.
- **Phase 38 (Reconciliar drift DB)**: PAUSED. Su scope original quedó superado por el restore selectivo (quick task 260502-tqf) + el fix del schema drift articulos (commit e5358502).
- **Phases 30-37**: NO INICIADAS. Sin CONTEXT.md ni PLAN files. Toda la mecánica de variantes, templates, PK swap, stock UI, migración histórica y tech-debt está pendiente.
- **Admin web**: 22 páginas frontend existen y todas cargan con 200 / 0 errores 500 en backend. **No hay features completamente rotas funcionalmente.** Hay 2 páginas con errores JS de hidratación (React #425) que NO bloquean uso.
- **Datos en prod**: 101.021 articulos / 27.737 unidades / 7.873 existencias / 7.745 items contados en "Primer inventario" Finalizado. Todo data restaurada está visible y operativa.
- **Lo que falta reconstruir**: no es código perdido sino **funcionalidades nunca construidas** (Phases 30-37) + 2 cleanups menores.

---

## 1. Estado real vs declarado del milestone v1.3

### 1.1 Resumen ejecutivo del progreso

| # | Phase | Goal abreviado | Declarado en ROADMAP | Estado real | Construido? |
|---|-------|----------------|----------------------|-------------|-------------|
| 29 | catalogos-de-atributos | 6 tablas FK prop_* + ABM web con CRUD | done | 6/6 plans, SUMMARY firmado | **SÍ** completo |
| 30 | templates-composicion | `composeSku()` + `composeNombre()` por rubro | planned | sin CONTEXT.md | **NO** |
| 31 | pk-swap-codigo→sku | SKU como PK, codigo como agrupador | planned | sin CONTEXT.md | **NO** |
| 32 | variantes-ui | Split ArticuloForm en Modelo + Variante | planned | sin CONTEXT.md | **NO** |
| 33 | cascade-engine-audit | Regeneración masiva + idempotencia | planned | sin CONTEXT.md | **NO** |
| 34 | stock-schema | Rename `columna→ubicacion`, sectores M:N | planned | sin CONTEXT.md | **NO** |
| 35 | stock-ui | Filtros + pivot table + dashboard | planned | sin CONTEXT.md | **NO** |
| 36 | migracion-historica | Poblar `ubicacion` desde sanchez dump | planned | sin CONTEXT.md | **NO** |
| 37 | tech-debt-v13 | `numeric(10,2)` monetarios + drift TS↔DB | planned | sin CONTEXT.md | **NO** |
| 38 | reconciliar-drift-db | Resincronizar `__drizzle_migrations` | reactiva, agregada 2026-05-01 | 1/6 plans, scope superado | **PARCIAL / DESACTUALIZADO** |

### 1.2 Reinterpretación del estado de Phase 38

Phase 38 fue añadida el 2026-05-01 para reconciliar el `_journal.json` desincronizado vs `__drizzle_migrations` en DB. Su CONTEXT.md asumía un drift del tipo "5 vs 6 entries". Pero los hechos del 2026-05-02 (data wipe detectado en pre-flight) y 2026-05-15 (schema drift articulos detectado) hicieron que su scope original quedara superado por las quick tasks que resolvieron los problemas reales. **El drift residual hoy es:**

- `_journal.json` tiene 6 entries (0000, 0001, 0002, 0004, 0005, 0006); le falta entry 0003. (Antes del 2026-05-15 le faltaba también 0006.)
- `__drizzle_migrations` en DB también tiene 6 entries; alineado con `_journal.json`.
- Archivo `0003_add_columna_inv_articulos.sql` existe en filesystem y la columna `columna` está en DB (aplicada manualmente), pero no figura en journal ni en `__drizzle_migrations`. **Drift cosmético no bloqueante.**

Decisión recomendada para Phase 38: **abortar y archivar** con una nota corta que explique el contexto. El "drift residual" del journal es cosmético; ningún query falla. Cualquier `pnpm db:generate` futuro podría enumerar `0003` como faltante — si pasa, agregar entry idéntica a las otras y seguir.

### 1.3 Phases 30-37: completamente sin arrancar

Ninguna tiene `NN-CONTEXT.md`, ningún PLAN, ningún SUMMARY. La idea de "reconstruir lo que se perdió" no aplica acá: **no había nada construido aún**. Estos son trabajos futuros.

---

## 2. Inventario de lo construido (Phase 29 + sustrato anterior)

### 2.1 Tablas DB (29 totales)

| Tabla | Cols | Status | Origen | Filas en prod |
|---|---|---|---|---|
| articulos | 52 | OK (post-fix categoria/subcat) | Pre-v1.3 + Phase 29 + commit e5358502 | 101.021 |
| existencias | 6 | OK | 260409-lik + restore | 7.873 |
| inventarios | 8 | OK | restore | 1 (Primer inventario) |
| inventarios_articulos | 10 | OK (sector_id huérfana) | restore | 7.745 |
| inventario_sectores | 6 | OK | restore | 1 |
| depositos | 7 | OK | restore | 1 (Principal) |
| dispositivos_moviles | 7 | OK | restore | 10 |
| business_settings | 9 | OK | restore | 1 |
| orders / order_items | 12 / 8 | OK, vacías | restore schema-only | 0 / 0 |
| sales / sale_items | 12 / 8 | OK, vacías | restore schema-only | 0 / 0 |
| purchases / purchase_items | 15 / 8 | OK, vacías | restore schema-only | 0 / 0 |
| api_keys | 7 | OK, vacía | restore schema-only | 0 |
| webhooks / webhook_deliveries | 9 / 11 | OK, vacías | restore schema-only | 0 / 0 |
| prop_marca, prop_color, prop_talle, prop_material, prop_presentacion, prop_objeto | 6 c/u | OK, vacías | Phase 29 | 0 c/u |
| **prop_categoria, prop_subcategoria** | 6 / 7 | **OK, nuevas** | commit e5358502 (2026-05-15) | 0 / 0 |
| comprobantes_cabecera/detalle/pagos | 33/29/28 | Legacy ERP, intactas | pre-v1.0 | 0 / 0 / 0 |
| _prisma_migrations | 8 | Legacy ORM, intacta | pre-Drizzle | varios |

### 2.2 Backend NestJS — 13 módulos con controllers

`api-keys`, `articulos` (+ `articulos-imagenes`), `dashboard`, `depositos`, `dispositivos`, `existencias`, `inventarios`, `orders`, `propiedades`, `purchases`, `sales`, `settings`, `webhooks`.

Verificado: cada módulo tiene su `*.controller.ts` con decoradores REST. JWT guard activo en `apps/backend/src/common/guards/jwt-auth.guard.ts`. Todos los endpoints respondieron 200 durante el walkthrough.

### 2.3 Frontend Next.js — 22 páginas

| Página | Status | Notas |
|---|---|---|
| `/(auth)/login` | OK | Form funcional, login exitoso con email/password |
| `/(auth)/signup` | NO PROBADO (no se quiere crear cuenta) | Existe el archivo |
| `/dashboard` | OK | 5 KPIs leen DB real (101.021 articulos), "Sin pedidos recientes" empty state |
| `/articulos` (listado) | OK | Tabla con datos reales paginada, 12 columnas, filtros, búsqueda, "Nuevo Articulo" |
| `/articulos/nuevo` | OK | Form mínimo: Codigo, Nombre, Tipo/Objeto, Marca, Modelo, Presentacion, Medida, Precio, Observaciones |
| `/articulos/[codigo]/editar` | OK | Form completo + imágenes (carga con suspense, ~1-2s) |
| `/articulos/existencias` | OK | KPIs: 101.021 articulos / 27.737 unidades / 7.873 con unidades / 0 bajo mínimo / 0 sin unidades. Tabla con datos. |
| `/articulos/inventarios` | OK (10 errores JS hydration #425, no bloqueantes) | "Primer inventario" visible, Finalizado, 7745 articulos |
| `/articulos/inventarios/[id]` | OK (11 errores JS hydration) | Detalle: fecha 31/12/2025, depósito Principal, 7745, sector "Rulemanes" |
| `/articulos/inventarios/[id]/conteo` | OK | Read-only porque inventario está Finalizado |
| `/propiedades` | OK | 6 tabs (Marcas/Colores/Talles/Materiales/Presentaciones/Objetos), todas vacías, empty state correcto con género gramatical fixed |
| `/purchases` | OK, tabla vacía | Cols: N° compra, Proveedor, Articulos, Total, Estado, Entrega, Fecha |
| `/sales` | OK, tabla vacía | Cols: N° venta, Cliente, Articulos, Total, Pago, Estado, Fecha |
| `/orders` | OK, tabla vacía | Cols: N° pedido, Cliente, Articulos, Total, Estado, Fecha |
| `/settings` | OK | Redirect a `/settings/profile` |
| `/settings/profile` | OK | Email/Nombre del usuario; Email disabled (correcto) |
| `/settings/business` | OK | "Comercio Ejemplo" cargado (de business_settings) |
| `/settings/articulos` | OK | Switches: 8 propiedades + SKU/Codigo barras + Costo + Observaciones/ERP/Unidades/Origen |
| `/settings/depositos` | OK | 1 fila "Principal", 7873 articulos / 27737 unidades, botones Editar/Desactivar |
| `/settings/dispositivos` | OK | 10 dispositivos: Adrian, Alberto, Cristian, Desconocido(...), etc., todos Activos |
| `/settings/appearance` | OK (11 errores JS hydration) | Sección "Tema" |
| `/settings/api-keys` | OK | Empty state "No hay API keys activas" |
| `/settings/webhooks` | OK | Empty state "No hay webhooks configurados" + botón Nuevo Webhook |

### 2.4 Auditoría columna-a-columna schema TS vs DB

Ejecutada hoy. Resultado: **24 tablas declaradas en schema TS, todas en match perfecto con la DB**. La única "zombie" en DB sin contraparte en TS es `inventarios_articulos.sector_id` (residual de quick task 260429-rec — documentada). **Drift cero.**

---

## 3. Lo que el admin sí funciona end-to-end (verificado en vivo)

1. **Auth**: login con Supabase JWT, redirección al dashboard, rol admin reconocido.
2. **Catálogo de articulos**: lectura paginada de 101k items con filtros activo/inactivo/todos + búsqueda.
3. **Vista detalle de articulo**: sheet con precio, stock, imágenes producto/etiqueta (multi-slot), propiedades, stock por depósito, datos crudos, link a editar.
4. **Edición de articulo**: form con identificación, precios, imágenes con upload, secciones colapsables ERP/Origen, botones Guardar/Desactivar.
5. **Creación de articulo**: form mínimo solo con campos visibles (responde a `business_settings.articulos_config`).
6. **Existencias**: 5 KPIs en vivo, tabla con datos.
7. **Inventarios**: listado + detalle (incluyendo sectores y columnas físicas) + página de conteo (read-only para inventarios finalizados).
8. **Propiedades (Phase 29)**: 6 tabs con CRUD ready (botón "Nuevo X" con género correcto), tabla con ID/Nombre/Abrev/Estado, switch "Mostrar inactivos", empty states correctos.
9. **Settings completo**:
   - Profile (lectura/edición de nombre)
   - Business (form completo)
   - Articulos (toggles de campos visibles, leídos de `business_settings.articulos_config`)
   - Depositos (CRUD con métricas)
   - Dispositivos (CRUD con 10 dispositivos pre-cargados)
   - Appearance (cambio de tema)
   - API Keys (estado vacío con CTA)
   - Webhooks (estado vacío con CTA)
10. **Dashboard**: 5 KPI cards leyendo DB real + sección de tendencia de ventas + alertas de bajo mínimo + pedidos recientes.

---

## 4. Lo que no funciona / falta (clasificado por severidad)

### 4.1 BUGS de bajo impacto (no bloquean uso)

| Ubicación | Síntoma | Severidad | Análisis |
|---|---|---|---|
| `/articulos/inventarios` y `/articulos/inventarios/[id]` | 10-11 errores JS console (React #425 hydration mismatch) | LOW | No bloquean funcionalidad; el contenido se renderiza igual. Probable cause: fechas o números formateados con locale diferente server vs client. Fix posible en una quick task de ~30 min. |
| `/settings/appearance` | 11 errores JS console (React #425) | LOW | Mismo patrón. |
| `/articulos/[codigo]/editar` console | 1 error: `Failed to load resource: ERR_NAME_NOT_RESOLVED @ http://erp.sanchezrepuestos.com.arnull/` | LOW-MED | Algún `${BASE}${env.PATH_NULO}` que arma URL inválida. Probable un fetch sin guard de env var. No bloquea el render pero llena la consola. |
| Drizzle journal | Entry `0003_add_columna_inv_articulos` faltante en `_journal.json` y `__drizzle_migrations` (DB ya tiene la columna aplicada manualmente) | LOW | Cosmético. Próximo `db:generate` puede regenerar; chequear que no remueva la columna. |

### 4.2 Pending Actions explícitas no cerradas (de SUMMARYs previos)

| Origen | Pending | Estado |
|---|---|---|
| 29-06 SUMMARY | Cleanup E2E test rows (`E2EMarca…`, `Shimano_…`) | NO HECHO. SQL manual de DELETE. Pero las prop_* están vacías hoy, así que probablemente ya se limpió o nunca se creó. |
| 29-06 SUMMARY | Confirmar que toggle activo solo via DropdownMenu (sin Switch en Edit) es deseado | Decisión UX abierta. |
| 260502-tqf SUMMARY | #2 Decidir destino de Phase 38 | **PENDIENTE** (mi recomendación: abortar y archivar) |
| 260502-tqf SUMMARY | #3 Forensics del data wipe Apr 30→May 1 | **PENDIENTE**. 14 días después, bash history probablemente rotado. Probabilidad baja de identificar la causa raíz. Recomiendo cerrarlo como "no determinable". |

### 4.3 Code review findings de Phase 29 (29-REVIEW.md) — todavía no atendidos

- 2 BLOCKERs: (a) Drizzle journal drift; (b) `vitest.config.ts` sin jsdom + setupFiles para RTL tests.
- 9 WARNINGs: race condition `toggleActive`, DTO `abrev` no normaliza uppercase, seed E2E hardcodea password, trigger SQL sin documentación `%I` vs `%s`, copywriting frágil de género, etc.
- 4 INFOs menores.

Ninguno bloquea producción. Deberían atenderse antes de empezar Phase 32 (que reutilizará el componente PropiedadCreateDialog y los servicios de propiedades).

### 4.4 Features declaradas en docs y diferidas (NO son bugs, son trabajo futuro intencional)

| Origen | Feature | Diferida a |
|---|---|---|
| 29-CONTEXT D-19 | Create-on-the-fly de prop_* desde ArticuloForm (cablear `PropiedadCreateDialog`) | Phase 32 |
| 29-CONTEXT D-09 | `prop_modelo`, `prop_medida`, `prop_aplicacion` | Future |
| 29-CONTEXT D-10 | Deprecación `prop_aux_1..5` en `articulos` | Phase 31 / 37 |
| 30-ROADMAP | Templates de composición `composeSku()` / `composeNombre()` | Phase 30 |
| 31-ROADMAP | PK swap `codigo` → `sku` | Phase 31 |
| 32-ROADMAP | Variantes UI: split ArticuloForm en Modelo + Variante | Phase 32 |
| 33-ROADMAP | Cascade engine (regeneración masiva idempotente) | Phase 33 |
| 34-ROADMAP | Stock schema: `columna→ubicacion`, sectores M:N | Phase 34 |
| 35-ROADMAP | Stock UI: pivot table + dashboard de filtros | Phase 35 |
| 36-ROADMAP | Migración histórica de stock desde dump | Phase 36 |
| 37-ROADMAP | Tech debt: `numeric(10,2)` monetarios + cleanup drift | Phase 37 |

### 4.5 Brechas observables en el ArticuloForm vs Phase 29

El form de `/articulos/nuevo` muestra Marca, Modelo, Presentación, Medida como **simples inputs de texto**, NO como dropdowns con autocomplete contra las `prop_*` tables. Esto es **intencional** según D-19 (cablear en Phase 32) pero amerita resaltar: el usuario hoy puede escribir "shimano" como marca y queda como TEXT libre, sin vincular a `prop_marca` aún. El esquema FK existe, pero el wiring UX está pendiente.

Además, el form **no muestra** las recién agregadas `categoria` y `subcategoria` (commit e5358502 de hoy), ni `rubro/subrubro/adjetivo`. Eso es coherente con que el ArticuloForm actual es una versión simplificada y las propiedades de "Classification" requieren el catálogo prop_categoria/prop_subcategoria + cableado UX (todavía pendiente).

---

## 5. Contraste documentación vs realidad — señales de incoherencia

### 5.1 Coincidencias (lo bueno)

- **ROADMAP v1.3 → estado real**: las phases declaradas como `done` (29) están done. Las declaradas como `planned` (30-37) están sin arrancar. No hay "ghost work" — todo lo declarado como construido se encuentra construido.
- **Phase 29 success criteria**: 5/5 SC del CONTEXT.md están visibles en el admin. El único marcado como DIFERIDO (SC#5 create-on-the-fly) sigue diferido a Phase 32, como planeado.
- **Quick tasks v1.3 con commits**: las 18 quick tasks listadas en STATE.md tienen commit hash; verificadas en `git log` existen. No hay quick tasks "fantasma".

### 5.2 Discrepancias detectadas

- **Drizzle journal vs filesystem vs DB**: `_journal.json` no menciona migration `0003_add_columna_inv_articulos.sql` aunque la columna `columna` ya existe en `inventarios_articulos` (aplicada manualmente el 2026-04-29). Inconsistencia de tracking, **no funcional**.
- **Phase 38 CONTEXT.md está fundacionalmente desfasada**: asumía drift "journal-only" cuando el problema real era data wipe + schema drift, ambos resueltos por quick tasks 260502-tqf y commit e5358502 fuera del scope de Phase 38.
- **`inventarios_articulos.sector_id`**: columna existe en DB sin estar en schema TS. Residual de 260429-rec (reemplazada por `columna`). No rompe queries (Drizzle ignora columnas no declaradas), pero **es deuda técnica**.
- **El SUMMARY de 260502-tqf declaró "drift residual conocido" mencionando 3 ítems**: 1) journal drift, 2) sector_id huérfana, 3) inventario_sectores.columnas tipo mismatch. **Omitió** el drift de `articulos.categoria`/`subcategoria`. Bug encontrado hoy al hacer smoke y corregido (migration 0006).
- **Phase 29 REVIEW.md identifica 15 hallazgos** (2 BLOCKER + 9 WARNING + 4 INFO); ninguno tiene commit posterior atribuible. **No fueron atendidos**.

### 5.3 Phase 38 contiene archivos huérfanos (descubierto en este reporte)

`.planning/phases/38-reconciliar-drift-sistemico-de-db-de-produccion/` tiene:
- `38-CONTEXT.md` (asume el drift incorrecto)
- `38-DISCUSSION-LOG.md`
- `38-RESEARCH.md`
- `38-VALIDATION.md`
- `38-01-PLAN.md` + `38-01-SUMMARY.md` (Task 1 ejecutada, Task 2-6 pending)
- `38-05-PLAN.md` (¡no `38-02`, `38-03`, `38-04`!)

El hecho de que exista `38-05-PLAN.md` sin sus predecesores sugiere que se planificó un plan "futuro" sin haber ejecutado los anteriores. Esto refuerza la recomendación de **abortar y archivar Phase 38**.

---

## 6. Recomendaciones priorizadas

### 6.1 Urgentes (próxima sesión)

1. **Decidir destino de Phase 38** — sugerencia: abortarla y archivarla con un commit que documente que su scope fue superado por las quick tasks 260502-tqf + e5358502. STATE.md y ROADMAP.md deben reflejarlo.
2. **Atender los 2 BLOCKERs de 29-REVIEW.md** antes de pasar a Phase 30:
   - Drizzle journal sincronización (`0003` huérfano).
   - `vitest.config.ts` con jsdom + setupFiles RTL.

### 6.2 Medias (en cualquier momento)

3. **Crear quick task para fix de hydration #425** en `/articulos/inventarios/*` y `/settings/appearance`. ~30 min.
4. **Fix del error `ERR_NAME_NOT_RESOLVED` en `/articulos/[codigo]/editar`**. Buscar el `${BASE}${env.PATH_NULL}` y guardearlo. ~15 min.
5. **Cleanup `inventarios_articulos.sector_id`** (drop column). Quick task simple.

### 6.3 Estratégicas (cuando se decida continuar v1.3)

6. **Arrancar Phase 30** con `/gsd:discuss-phase 30` cerrando Q4, Q6 abiertas en design notes.
7. **Direccionar los 9 WARNINGs de Phase 29** antes o durante Phase 32 (donde se reutilizará el componente PropiedadCreateDialog).
8. **Decidir si Phases 30-37 siguen siendo el orden correcto** dado que la realidad operativa cambió post-incidente. Quizá Phase 32 (variantes UI) sea más valioso a corto plazo que Phase 30 (templates), porque destraba que ArticuloForm pueda usar las prop_* tables.

### 6.4 Cierre de loop

9. **Forensics del data wipe (260502-tqf #3)**: marcar como "no determinable" (14 días después, bash history rotado). No vale más tiempo.
10. **Confirmar smoke con vos en persona**: ya cargué `objetiva-smoke` session con el browser headless, podrías recorrerlo headed (`playwright-cli -s=objetiva-smoke show`) para validar lo que reporté visualmente.

---

## 7. Métricas de la sesión 2026-05-15

- **Páginas frontend probadas**: 22 / 23 existentes (solo se omitió `/(auth)/signup`).
- **Endpoints `/api/*` ejercitados** (vía network capture): `/api/settings`, `/api/articulos`, `/api/articulos/BI062-40`, /api/inventarios (a través de páginas).
- **HTTP 500s**: 0.
- **HTTP 200s**: 100% de las requests al backend.
- **Errores console totales**: 33 (10 + 11 + 11 + 1) — todos no bloqueantes; 32 son hydration #425, 1 es URL malformada.
- **Tablas DB verificadas**: 29 (24 declaradas en TS + 5 legacy/system).
- **Drift schema TS vs DB**: 0 (post-fix de hoy).
- **Filas de datos en prod**: 101.021 articulos + 27.737 unidades + 7.873 existencias + 7.745 inventarios_articulos + 10 dispositivos + 1 deposito + 1 inventario + 1 business_settings = **117.660 filas operativas**.

---

## 8. Conclusión

**El sistema NO necesita reconstrucción.** Necesita:

- **Cerrar** 4 pending actions explícitas (decidir Phase 38, atender review de Phase 29, fix de hydration, cleanup sector_id).
- **Atender** la deuda técnica acumulada de Phase 29 antes de Phase 32.
- **Decidir** la secuencia para el resto de v1.3 (Phases 30-37).

Lo que se construyó hasta hoy es sólido: 1 phase done, infraestructura completa de catálogos, 22 páginas funcionales, datos restaurados intactos, schema 100% alineado. El admin web ya entrega valor end-to-end (gestión de inventarios, catálogo de articulos, configuración del negocio) — no es un esqueleto sin contenido.

Lo que falta no es código perdido sino **fases nunca arrancadas** del milestone v1.3. Reconstruir ese trabajo es construirlo por primera vez, no recuperarlo.

---

_Generado: 2026-05-15 ~21:00 (sesión post-restore + post-fix schema drift). Walkthrough con `objetiva-smoke` playwright-cli session. HEAD del repo: `9fd85eb6`._
