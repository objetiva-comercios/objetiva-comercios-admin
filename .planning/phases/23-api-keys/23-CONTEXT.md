# Phase 23: API Keys - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Administradores pueden crear y gestionar API keys para que sistemas externos se autentiquen via Bearer token sin depender de Supabase Auth. Incluye: tabla DB, CRUD backend, CompositeAuthGuard, y UI en Settings. Los webhooks son Phase 24.

</domain>

<decisions>
## Implementation Decisions

### Formato y seguridad de la key

- Formato con prefijo: `obj_sk_` + random (largo total ~40 chars). Estilo Stripe.
- En la tabla se muestra solo `obj_sk_...xxxx` (últimos 4 chars)
- Almacenamiento: hash SHA-256 en DB. La key completa se muestra UNA vez al crear.
- Sin expiración — válidas hasta revocación manual
- Sin límite de cantidad de keys activas

### Rol y permisos

- Toda API key tiene rol `admin` implícito — no configurable por key
- Solo usuarios con rol admin (JWT) pueden crear y revocar keys
- Viewers no ven la sección "API Keys" en Settings (oculta completamente)
- Identidad del request: `userId = 'apikey:{nombre}'`, email vacío, role = 'admin'
- Las rutas CRUD de api-keys solo aceptan JWT de Supabase (no API key) — evita escalación si una key se compromete

### UI en Settings

- Nueva sección "API Keys" en sidebar de Settings (7mo item), solo visible para admins
- Lista de keys: tabla compacta con columnas Nombre, Key (prefijo), Creada, Último uso, Acción (Revocar)
- Crear key: Dialog modal con campo nombre → al confirmar, segundo Dialog muestra key completa con botón copiar + warning "No se mostrará de nuevo"
- Revocar key: AlertDialog con nombre de la key: "¿Revocar 'X'? Los sistemas que usen esta key dejarán de funcionar inmediatamente"
- Keys revocadas: soft-delete (revokedAt timestamp), ocultas de la tabla — solo se muestran activas

### Comportamiento del guard

- CompositeAuthGuard reemplaza JwtAuthGuard como guard global
- Flujo: intenta JWT primero → si falla, busca API key hasheada en DB → si ambas fallan, 401
- lastUsedAt se actualiza en cada request autenticado con API key (bajo volumen esperado)
- Rutas @Public() siguen sin requerir auth — sin cambios

### Claude's Discretion

- Schema exacto de la tabla `api_keys` (campos, índices)
- Generación del random de la key (crypto.randomBytes o similar)
- Diseño exacto de los Dialogs (spacing, iconos, colores del warning)
- Si usar tabla simple HTML o ServerDataTable para la lista de keys (pocas filas esperadas)

</decisions>

<specifics>
## Specific Ideas

- El flujo de "mostrar key una vez" debe ser muy claro — warning prominente de que no se podrá ver de nuevo
- AlertDialog de revocación consistente con el patrón de Phase 19 (soft-delete de artículos)
- Estética Tabler del proyecto: border-radius reducido, alturas compactas, text-sm base

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `JwtAuthGuard` (`common/guards/jwt-auth.guard.ts`): base para el CompositeAuthGuard — extender con API key fallback
- `RolesGuard` (`common/guards/roles.guard.ts`): ya funciona con `AuthenticatedUser.role` — compatible si API key setea role='admin'
- `AuthenticatedUser` interface (`auth/auth.types.ts`): userId, email, role — API key debe poblar los mismos campos
- `AlertDialog` (`components/ui/alert-dialog.tsx`): para confirmación de revocación
- `Dialog` (`components/ui/dialog.tsx`): para crear key y mostrar key generada
- `SettingsNav` (`components/settings/settings-nav.tsx`): agregar item "API Keys" con ícono Key de lucide-react
- `businessSettings` tabla en schema: patrón de referencia para nueva tabla `api_keys`

### Established Patterns

- Guard global con `@Public()` opt-out — CompositeAuthGuard sigue este patrón
- Módulos NestJS en `apps/backend/src/modules/` — crear `modules/api-keys/`
- Settings pages en `apps/web/src/app/(dashboard)/settings/` — crear `api-keys/page.tsx`
- `@Roles('admin')` decorator para restringir endpoints

### Integration Points

- `app.module.ts`: reemplazar JwtAuthGuard por CompositeAuthGuard como APP_GUARD
- `settings-nav.tsx`: agregar item condicionalmente (solo si admin)
- `schema.ts`: agregar tabla `api_keys`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 23-api-keys_
_Context gathered: 2026-03-12_
