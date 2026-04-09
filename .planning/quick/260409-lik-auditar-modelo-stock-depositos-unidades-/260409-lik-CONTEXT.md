# Quick Task 260409-lik: Auditar modelo stock/depositos/unidades - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Task Boundary

Auditar el modelo de datos stock/depositos/unidades, documentar inconsistencias, y aplicar fixes para unificar el modelo. Migrar datos de articulos.unidades → existencias para el depósito principal.

</domain>

<decisions>
## Implementation Decisions

### Rol de articulos.unidades

- `unidades` será un campo calculado = SUM(existencias.cantidad) consolidado
- No se almacena manualmente, se calcula desde existencias
- `erpUnidades` permanece como dato informativo del ERP (solo lectura)

### Migración de datos

- Ya existe un depósito ("Depósito principal") cargado en producción
- Migrar `articulos.unidades` → `existencias.cantidad` para ese depósito
- Solo migrar artículos donde unidades > 0
- Después de migrar, `unidades` deja de ser un campo manual

### Output esperado

- Documento ANALYSIS.md con estado actual e inconsistencias
- Fixes de código: limpiar campos, unificar modelo, migrar datos

### Claude's Discretion

- Estrategia técnica para campo calculado (trigger, vista, query en servicio)
- Cómo manejar la transición (mantener columna como cache vs eliminar)

</decisions>

<specifics>
## Specific Ideas

- El usuario ya cargó un depósito principal en producción
- Las unidades a migrar vienen del campo `articulos.unidades` (NO `erp_unidades`)
- `erp_unidades` es informativo del sistema de gestión externo

</specifics>
