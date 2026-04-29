# Phase 29: Catálogos de Atributos - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 29-catalogos-de-atributos
**Areas discussed:** Schema (Q2), Set de propiedades (Q1), Validación de abrev + colisiones (P-04), UI + create-on-the-fly (Q11 / CAT-02)

---

## Schema: Naming de tabla

| Option | Description | Selected |
|--------|-------------|----------|
| Plural simple: marcas, colores, talles… | Tabla = nombre del set en plural. Limpio y estándar. Riesgo de colisión futura con otro dominio. | |
| Prefijo `propiedad_`: propiedad_marca, propiedad_color… | Agrupa visualmente las tablas en `\dt`. Más verbose. | |
| Prefijo `prop_`: prop_marca, prop_color… | Agrupa visualmente, más corto. Choca visualmente con prop_aux_1..5 vigentes. | ✓ |

**User's choice:** Prefijo `prop_`.
**Notes:** Usuario rechazó explícitamente el término "catálogo" (reservado para "catálogo de proveedores" futuro). Se aceptó el overlap visual temporal con `prop_aux_1..5` hasta su deprecación en Phase 31/37.

---

## Schema: Identificador y FK desde articulos

| Option | Description | Selected |
|--------|-------------|----------|
| `id` (INT) + cache de nombre denorm vía trigger | FK por id. Cache de nombre actualizado por trigger. Estándar relacional + denorm controlado. | ✓ |
| `slug` (TEXT) como FK | FK por slug. Vista cruda legible-ish. Renombre de slug = cascade en hijas. | |
| `nombre` (TEXT) como FK | FK por nombre humano. Vista cruda 100% legible. Caro al renombrar + problemas de case/acentos. | |

**User's choice:** `id` + cache via trigger.
**Notes:** Phase 29 prepara el schema y trigger pero NO conecta FK a articulos (que es Phase 30/31).

---

## Set de propiedades

| Option | Description | Selected |
|--------|-------------|----------|
| 7 clásicas (marca, color, talle, material, presentación, objeto, calificador) | Set ratificado por design-notes y ROADMAP original. | |
| 7 + prop_modelo + prop_medida | Promueve text-libres actuales. Riesgo de over-modeling. | |
| 7 + prop_aplicacion (rubro automotor) | Suma propiedad para template automotor futuro. Anti-prematuro. | |
| **6 (las 7 clásicas menos calificador)** | calificador queda como TEXT libre, no entra a tabla. | ✓ (refinado por usuario) |

**User's choice:** "las 7 clásicas, menos calificador que será un texto libre"
**Notes:** Revisión clave: el composer del SKU (Phase 30) tendrá que distinguir entre propiedades con catálogo (FK lookup → abrev) y propiedades text-libre (slugificación en runtime del valor escrito). Affecta diseño de TemplateBuilder.

---

## Slug vs abreviación

| Option | Description | Selected |
|--------|-------------|----------|
| Solo `abrev`, sin slug | Schema (id, nombre, abrev, activo, timestamps). UI sugiere abrev autogenerada editable. | ✓ |
| Mantener slug Y abrev (ambos) | slug derivado del nombre + abrev manual. Campo doble-mantenido. | |

**User's choice:** Solo abrev.
**Notes:** Usuario aclaró que cuando hablábamos de "slug" en realidad estaba pensando en "abreviación". Repaso conceptual confirmó que slug no tenía aplicación útil en este contexto: FK es por id, URL admin no necesita slug, validación case-insensitive del nombre se resuelve con UNIQUE LOWER(nombre). Schema se simplificó.

---

## Separador del SKU vs guiones en codigo

| Option | Description | Selected |
|--------|-------------|----------|
| A. Strip de guiones del codigo SOLO al componer SKU | codigo intacto en su columna. SKU = stripSep(codigo) + '-' + abrev1… | ✓ |
| B. Cambiar separador a `_` | codigo intacto. SKU = codigo + '_' + abrev. Menos común visualmente. | |
| C. Validar que codigo no contenga el separador | Rechazar nuevos codigos con `-`. Choca con ERP / costumbres usuario. | |
| D. Aceptar SKU opaco (no parseable) | SKU mantiene `-` y codigo con guiones. Pierde self-describing. | |

**User's choice:** A — strip de guiones del codigo.
**Notes:** Implica revisión de la decisión cerrada #4 del design-notes ("sin variantes: sku=codigo") — pasa a "sin variantes: sku = stripSep(codigo)". Cuestión planteada por el usuario que el research no había anticipado. Affecta cutover de Phase 31 (backfill de sku desde codigo aplica stripSep).

---

## Validación de abrev y cross-prop

| Option | Description | Selected |
|--------|-------------|----------|
| ASCII mayusc/dígitos, 1-8 chars, UNIQUE per tabla | CHECK `^[A-Z0-9]{1,8}$`. Cross-prop NO se valida. | ✓ |
| Misma regla + UNIQUE cross-prop | Trigger valida abrev contra las 6 tablas. Imposibilita 'XL' como talle Y color. | |
| Permisivo: cualquier texto 1-12 chars | Acepta unicode, símbolos. UI normaliza al guardar artículo. | |

**User's choice:** ASCII estricto, sin validación cross-prop.
**Notes:** El SKU es globalmente único por composición ordenada del template; permitimos `XL` como talle y como color simultáneamente. Implicación útil: composer NO necesita slugify para valores de catálogo (ya son ASCII puros), solo para text-libres como `calificador`.

---

## UI: Estructura de rutas

| Option | Description | Selected |
|--------|-------------|----------|
| Una página /propiedades con tabs | 1 entrada en sidebar, 6 tabs. Lazy load por tab. | ✓ |
| Una ruta por propiedad: /propiedades/marcas, /propiedades/colores… | Deep-link directo. 6 entradas en sidebar (o submenú). | |

**User's choice:** Tabs.

---

## UI: Componente

| Option | Description | Selected |
|--------|-------------|----------|
| Genérico: PropiedadTable + PropiedadForm parametrizado | 1 componente + 6 configs (~10 LOC c/u). DRY. | ✓ |
| Uno por propiedad: MarcasTable, ColoresTable… | 6 componentes copia-pega. Anti-DRY innecesario. | |

**User's choice:** Genérico.

---

## CAT-02 / Success Criteria #5: create-on-the-fly desde el form

| Option | Description | Selected |
|--------|-------------|----------|
| Diferir SC#5 a Phase 32 | Phase 29 entrega componente standalone. Phase 32 lo cabla al form rediseñado. | ✓ |
| Phase 29 incluye AtributoSelectField + feature flag en ArticuloForm | Suma alcance + rompe "no toca articulos". | |

**User's choice:** Diferir SC#5 a Phase 32.
**Notes:** Resuelve la tensión detectada entre el roadmap ("Phase 29 self-contained") y el SC#5 ("desde el form"). CAT-02 marca como parcial en Phase 29 (componente listo) y completo en Phase 32 (cableado). El roadmap necesita reflejar este split en la planning de Phase 29 y Phase 32.

---

## Claude's Discretion

- Estructura de carpetas y archivos backend/web
- Detalles de validación frontend (zod schemas, mensajes)
- UX micro: posición de tabs, Sheet vs Dialog para edit
- Algoritmo exacto del auto-suggest de abrev
- Decisión de seedear datos iniciales o arrancar vacío

## Deferred Ideas

- prop_calificador, prop_modelo, prop_medida, prop_aplicacion como tablas
- Auditoría de uso de prop_aux_1..5
- Rename `articulos.adjetivo → calificador`
- Cableado de PropiedadCreateDialog al ArticuloForm (Phase 32)
- FK + trigger conectado desde articulos (Phase 30/31)
- Bulk import CSV/Excel de valores
- Renombre de la fase en el roadmap (opcional)
