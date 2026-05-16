# Phase 30: Templates + Composición SKU/Nombre - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisiones se capturan en CONTEXT.md — este log preserva las alternativas consideradas.

**Date:** 2026-05-16
**Phase:** 30-templates-composici-n-sku-nombre
**Areas discussed:** Pre-discuss (4 puntos terminológicos), Propiedades custom por template, Schema taxonomía 3 niveles, Template default + composer, Seed + migración legacy

---

## Pre-discuss (clarificaciones terminológicas previas a invocar `/gsd-discuss-phase 30`)

### Rol de `objeto` en el modelo

| Option | Description | Selected |
|--------|-------------|----------|
| SEPARADO de las 6 | objeto vive aparte porque su rol es semántico/clasificatorio | |
| DENTRO de las 6 (sigue Phase 29) | objeto es una de las 6 ya existentes; sin cambio en el set fijo | ✓ |

**User's choice:** DENTRO. **Notes:** "Va dentro, porque podre usar tambien las propiedades para armar dinamicamente el nombre." Confirma que el rol de armar el nombre es funcionalidad del composer, no justifica entidad aparte. Phase 30 D-01 documenta esto.

### Terminología "categoría" vs "propiedad"

| Option | Description | Selected |
|--------|-------------|----------|
| categoría ≠ propiedad | Categoria/sub/N3 = taxonomía jerárquica; aplicación = propiedad custom del rubro | ✓ |
| Son lo mismo (genérico) | Sin distinción taxonomía vs propiedad | |
| Otra interpretación | Lo aclaramos en discuss-phase | |

**User's choice:** categoría ≠ propiedad. **Notes:** Confirma separación clara — taxonomía jerárquica de productos vs descriptor específico del rubro. Phase 30 D-05 (taxonomía) y D-09 (custom slots) reflejan la separación.

### Niveles de jerarquía para categoría

| Option | Description | Selected |
|--------|-------------|----------|
| 2 niveles: categoria → subcategoria | Lo más simple; UI predecible | |
| 3 niveles fijos | categoria → subcategoria → nivel3; vacíos admitidos | ✓ |
| Variable hasta 3 (por rubro) | Configurable según rubro; UX y queries más complejas | |

**User's choice:** 3 niveles fijos. **Notes:** Da espacio sin complejizar UX. La tabla `prop_subcategoria` ya creada el 2026-05-15 tiene FK a `prop_categoria`; agregamos `prop_familia` con FK a `prop_subcategoria`.

### Scope del rediseño UX

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 32 (Variantes UI) lo absorbe | Phase 32 igual toca ArticuloForm; suma rediseño del panel y switches | ✓ |
| Nueva phase intermedia | Phase 30.5 dedicada | |
| Quick task corto plazo | Resolver vía `/gsd-quick` | |
| Después, no ahora | Anotar como todo | |

**User's choice:** Phase 32 absorbe. **Notes:** El rediseño UX queda DIFERIDO a Phase 32 y NO entra a Phase 30 (boundary clara). Documentado en `deferred` section de CONTEXT.

---

## Propiedades custom por template

### Modelo de las 3 propiedades custom

| Option | Description | Selected |
|--------|-------------|----------|
| Slots fijos en articulos + tabla por slot | articulos.custom_1/2/3 TEXT + template referencia 3 tablas existentes (prop_aplicacion, etc) | ✓ |
| Slots fijos + tabla única genérica | 1 tabla prop_custom con campo slot 1-3 + template_id; mezcla dominios | |
| Sin slots fijos: pivot atributo × articulo | Tabla pivot EAV-like; rompe vista cruda elocuente | |
| Cada template tiene sus N tablas independientes | Template automotor crea prop_aplicacion, indumentaria crea prop_temporada | |

**User's choice:** Slots fijos en articulos + tabla por slot. **Notes:** Confirma D-09 — `custom_1/2/3` en `articulos` como TEXT cacheado; template referencia tablas existentes. Anti-EAV y anti-polimorfismo (sigue Phase 29 D-01).

### Mapping slot → tabla (POR TEMPLATE vs GLOBAL)

| Option | Description | Selected |
|--------|-------------|----------|
| POR TEMPLATE | Template "automotor" mapea custom_1→prop_aplicacion; indumentaria mapea custom_1→prop_temporada. Sin FK estructural desde articulos. | ✓ |
| GLOBAL: 3 tablas fijas comunes | prop_custom_a/b/c iguales para todos los rubros; permite FK pero pierde semántica por rubro | |
| Híbrido: 1 tabla genérica con campo categoria | Viola D-01 (no polimorfismo) | |

**User's choice:** POR TEMPLATE. **Notes:** Trade-off conocido: no hay FK estructural desde `articulos.custom_*`. Validación a nivel app. Consistente con Phase 29 D-02 (cache TEXT + trigger sin FK fuente hasta Phase 31). Documentado en D-10.

### Tablas custom a crear en Phase 30

| Option | Description | Selected |
|--------|-------------|----------|
| prop_aplicacion | Para automotor — qué vehículo/uso aplica el repuesto | ✓ |
| prop_lado | Izq/der/centro/N/A | (no respondido — implícitamente NO) |
| prop_anio_desde / prop_anio_hasta | Rango de año de aplicación; complejo, mejor TEXT libre | (no respondido) |
| Ninguna otra | Solo prop_aplicacion ahora, anti-prematuro | (implícito por respuesta final) |

**User's choice:** "usaremos la tabla aplicacion" (solo `prop_aplicacion`). **Notes:** Anti-prematuro, alineado con Phase 29 D-09. Los slots `custom_2` y `custom_3` quedan reservados sin tabla mapeada. Documentado en D-11.

---

## Schema taxonomía 3 niveles

### Nombre del 3er nivel jerárquico

| Option | Description | Selected |
|--------|-------------|----------|
| familia | categoria → subcategoria → familia. Convención retail más común | ✓ |
| linea | Más formal/comercial; encaja en cosmética, indumentaria | |
| nivel3 (genérico) | Sin pretender semántica; más feo en UI | |
| tipo | Más corto; choca con `objeto` que también es "tipo" | |

**User's choice:** familia. **Notes:** Suena natural en es-MX para autopartes. Documentado en D-06.

### Qué hacer con rubro/subrubro/adjetivo legacy

| Option | Description | Selected |
|--------|-------------|----------|
| Drop ya en Phase 30 | 0 datos perdidos (verificado: vacíos en 101.021 articulos); schema limpio día 1 | ✓ |
| Diferir drop a Phase 37 (tech debt) | Hygiene "una cosa por phase"; ruido en Phase 32 | |
| Renombrar uno: adjetivo → calificador | Mantener adjetivo como calificador TEXT libre; drop rubro/subrubro | |

**User's choice:** Drop ya en Phase 30. **Notes:** Reemplaza la decisión de Phase 31 D-10 y Phase 37 tech-debt. Documentado en D-03.

---

## Template default + composer

### Receta del NOMBRE auto

| Option | Description | Selected |
|--------|-------------|----------|
| objeto + marca + modelo + medida + aplicacion | "Amortiguador Sachs C24-A 345mm Fiat Cronos 1.3" — clasificador → marca → modelo → medida → uso | ✓ |
| objeto + marca + aplicacion + modelo + medida | Privilegia contexto de uso antes del modelo del repuesto | |
| objeto + categoria + marca + modelo + aplicacion | Incluye categoría; redundante con navegación pero ayuda en full-text search | |
| Lo decido en TemplateBuilder UI | Template default vacío; configurar a posteriori | |

**User's choice:** objeto + marca + modelo + medida + aplicacion. **Notes:** Categoria/subcategoria/familia NO entran al nombre (son taxonomía, no descriptor). Documentado en D-14.

### Composición del SKU del template default

| Option | Description | Selected |
|--------|-------------|----------|
| Ninguno por ahora — sku = stripSep(codigo) | Autopartes 99% sin variantes; cada repuesto tiene código único | ✓ |
| Talle + color como variante | Caso clásico Phase 29 D-13; útil para indumentaria | |
| Solo aplicacion como variante | Va contra semántica (aplicacion es N:M, no variante) | |
| Lo decido en TemplateBuilder UI | Template default sin variantes; admin configura a posteriori | |

**User's choice:** Ninguno — sku = stripSep(codigo). **Notes:** Mecánica de variantes existe en schema (Phase 29 D-13) pero el template default no la activa. Documentado en D-15.

---

## Seed + migración legacy

### Seed inicial de los catálogos

| Option | Description | Selected |
|--------|-------------|----------|
| Vacío + admin pobla via UI | Consistente con Phase 29; cero supuestos sobre rubro | ✓ |
| Seed hardcoded mínimo | categoria=['Repuestos','Herramientas',...], marca=['Sin marca','Genérica'] | |
| Yo te paso las listas iniciales (CSV/JSON) | Usuario aporta listas reales | |
| Diferir seed a después de Phase 30 | Solo schema; seed aparte | |

**User's choice:** Vacío + admin pobla via UI. **Notes:** Legacy DB `admin_base_sanchez` también vacía en columnas categoría/propiedades (0 distinct values en objetos, rubros, marcas, etc.), por lo que no hay fuente automática disponible. Admin pobla manualmente cuando crea articulos.

### prop_aux_1..5 en articulos

| Option | Description | Selected |
|--------|-------------|----------|
| Sí, drop ya | 0 datos perdidos; reemplazo conceptual claro con custom_1/2/3 | ✓ |
| Mantener — diferir a Phase 37 | Hygiene "una cosa por phase"; ruido en Phase 32 | |

**User's choice:** Sí, drop ya. **Notes:** Reemplaza Phase 29 D-10. Documentado junto con rubro/subrubro/adjetivo en D-03.

---

## Claude's Discretion

- Naming exacto de tablas/columnas (`custom_1` vs `custom_slot_1`) — convención repo manda.
- Forma exacta de la migration drop (orden de DROPs, transacción única, naming del archivo `.sql`) — planner/executor deciden.
- Si el template default se inserta como SQL seed inline en la migration o como `seed-templates.ts` — planner decide.
- Estructura interna del backend para el composer (carpeta `templates/`, `composer/`, utils) — planner decide.

## Deferred Ideas

- **TemplateBuilder UI visual (drag-drop)** — template default vía seed SQL en Phase 30. Edición visual a futuro si aparece el caso de uso.
- **`prop_modelo`, `prop_medida`** — siguen TEXT libre (Phase 29 D-09).
- **`prop_lado`, `prop_anio`** — Phase 30 solo crea `prop_aplicacion`. Si se necesitan, se agregan en phase posterior aprovechando los slots `custom_2`/`custom_3` reservados.
- **Calificador / adjetivo libre** — descartado del modelo (D-04). Si emerge necesidad de descriptor ad-hoc, evaluar `articulos.calificador TEXT` independiente.
- **Cableado del `ArticuloForm` con autocomplete a `prop_*`** — Phase 32 (absorbe rediseño UX).
- **Rediseño UX de `/propiedades` + simplificación de switches en `/settings/articulos`** — Phase 32.
- **Trigger AFTER UPDATE en `prop_*` que sincroniza `articulos.<prop>`** — Phase 31 (PK swap) lo conecta cuando exista FK fuente.
- **Vehículos compatibles / fitment** — Q3 del milestone, fuera de v1.3.
- **Migración masiva de articulos a categorías/familias** — fuera de scope (101.021 articulos vacíos en columnas de clasificación; cuando se necesite poblar, será trabajo aparte).
