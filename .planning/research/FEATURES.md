# Feature Landscape

**Domain:** Admin platform for commercial operations — full article CRUD, image management, API keys, webhooks
**Researched:** 2026-03-10
**Scope:** v1.2 milestone features only (articulos CRUD completo, imagenes, columnas configurables, API keys, webhooks)

---

## Table Stakes

Features users expect. Missing = product feels incomplete.

### Articulos CRUD Completo

| Feature                                      | Why Expected                                                                                                            | Complexity | Notes                                                                                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruta de edicion `/articulos/[codigo]/editar` | El sheet de detalle ya tiene boton "Editar" que linkea ahi, pero la ruta no existe. CRUD sin Edit es incompleto.        | Low        | `ArticuloForm` ya acepta `mode: 'edit'`. Solo falta la page con fetch del articulo por codigo y pasarlo al form.                                                                   |
| Soft-delete con confirmacion                 | El controller tiene `toggleActive` pero no hay accion de "eliminar" en la UI. Usuarios esperan poder retirar articulos. | Low        | Usar AlertDialog de confirmacion. No hacer hard delete — FKs con `onDelete: restrict` en orders/sales/purchases lo impiden. El toggle activo/inactivo ya es el mecanismo correcto. |
| Feedback de exito/error en operaciones       | Toasts al crear/editar/eliminar. Ya implementado en `ArticuloForm` con `useToast`.                                      | Done       | Solo agregar toast para toggle activo.                                                                                                                                             |
| Formulario agrupado en secciones             | Secciones logicas para ~30 campos: Identificacion, Propiedades, Precios, Imagenes, ERP, Origen, Estado.                 | Done       | Ya implementado con `SectionHeader` + grids de 2 columnas. Solo falta la seccion de imagenes funcional (actualmente placeholder).                                                  |

### Image Management

| Feature                                          | Why Expected                                                                                                                              | Complexity | Notes                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Upload de imagenes con preview                   | Todo admin de productos permite subir fotos. El form actual tiene un placeholder que dice "proximamente".                                 | Med        | Requiere: (1) endpoint backend de upload multipart, (2) servicio de archivos estaticos, (3) componente de upload en frontend.      |
| Visualizacion de imagenes en el sheet de detalle | El `ArticuloSheet` muestra todos los campos pero no imagenes. Las fotos son lo primero que un usuario busca para identificar un articulo. | Low        | Agregar seccion de imagenes al sheet, renderizar thumbnails desde las URLs almacenadas en `imagenesProducto` e `imagenesEtiqueta`. |
| Eliminar imagen individual                       | No se puede subir sin poder borrar. Error al subir la imagen equivocada necesita correccion.                                              | Low        | Boton de eliminar en cada thumbnail. Borrar archivo del filesystem + remover URL del array jsonb.                                  |

### Columnas Configurables

| Feature                                             | Why Expected                                                                                                                                              | Complexity | Notes                                                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| UI para show/hide columnas en la lista de articulos | TanStack Table soporta column visibility nativamente. Ya existe `defaultColumnVisibility` que oculta 8 columnas por defecto. Falta el control de usuario. | Low        | Dropdown con checkboxes por columna. Patron standard: boton con icono Columns al lado del search.                    |
| Persistencia de la configuracion                    | Si el usuario oculta columnas y recarga la pagina, debe mantener su eleccion.                                                                             | Low-Med    | Requirement dice "global" (aplica a todos los usuarios del negocio). Guardar en `businessSettings` como campo jsonb. |

### API Keys

| Feature                              | Why Expected                                                                                                                        | Complexity | Notes                                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Crear API key con nombre descriptivo | Patron universal: Stripe, GitHub, Vercel. El admin necesita tokens para integrar con sistemas externos sin pasar por Supabase Auth. | Med        | Dialog con campo nombre. Generar token aleatorio (crypto.randomBytes). Guardar hash en DB, mostrar token completo solo una vez. |
| Lista de API keys con estado         | Tabla: nombre, prefijo truncado (`sk_...a3f2`), fecha creacion, ultimo uso, estado activa/revocada.                                 | Low        | Solo lectura + accion de revocar.                                                                                               |
| Copiar key al portapapeles           | Al crear, el key se muestra en un campo readonly con boton "Copiar". Warning: "No se mostrara de nuevo".                            | Low        | `navigator.clipboard.writeText()`. Boton con feedback visual ("Copiado!").                                                      |
| Revocar key con confirmacion         | La revocacion es irreversible. AlertDialog explicando que las integraciones que usan este key dejaran de funcionar.                 | Low        | PATCH al backend que marca como revocada. No se puede reactivar.                                                                |

### Webhooks CRUD

| Feature                                   | Why Expected                                                                                                                                                                     | Complexity | Notes                                                                                        |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| Crear suscripcion: entidad + evento + URL | Todo sistema de webhooks tiene este formulario basico. Entidad = "Articulos" (unica en v1.2). Evento = "Creado" / "Actualizado" / "Eliminado" / "Todos". URL = endpoint destino. | Med        | Dialog con selects + input de URL. Validar que URL sea HTTPS (o HTTP para desarrollo local). |
| Lista de suscripciones con estado         | Tabla: URL (truncada), entidad, evento, activo/inactivo, ultima entrega.                                                                                                         | Low        | Datos de `webhook_subscriptions` table.                                                      |
| Editar suscripcion                        | Cambiar URL, evento, o toggle activo/inactivo.                                                                                                                                   | Low        | Mismo dialog que crear, precargado.                                                          |
| Eliminar suscripcion con confirmacion     | AlertDialog. Irreversible.                                                                                                                                                       | Low        | Hard delete, no soft-delete. Las suscripciones no tienen dependencias criticas.              |

---

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature                                                          | Value Proposition                                                                                                                                                                                                                 | Complexity | Notes                                                                                                                                                                       |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grid de imagenes con slots etiquetados (3 etiqueta + 6 producto) | En vez de un gallery generico tipo Shopify, tener slots visuales claros: "Etiqueta 1/2/3" y "Producto 1-6". El usuario entiende exactamente que imagen va donde. El schema ya distingue `imagenesEtiqueta` de `imagenesProducto`. | Med        | Grid de 3 columnas. Fila superior: 3 slots "Etiqueta". Filas inferiores: 6 slots "Producto". Cada slot: cuadrado, borde dashed si vacio, thumbnail con acciones si ocupado. |
| Upload desde filesystem local (no cloud)                         | PROJECT.md dice "desde filesystem local". Las imagenes se guardan en el servidor backend. Para un comercio chico en red local: no depende de internet para ver fotos de articulos.                                                | Med        | NestJS sirve estaticos con `ServeStaticModule` o endpoint dedicado. URLs relativas: `/uploads/articulos/ART-001/producto-1.jpg`.                                            |
| Secret de webhook con HMAC-SHA256                                | Cada suscripcion tiene un secret. El payload se firma. El receptor verifica autenticidad. Patron de Stripe/GitHub.                                                                                                                | Low        | Generar secret al crear, mostrarlo una vez (mismo patron que API key). Header: `X-Webhook-Signature: sha256=...`.                                                           |
| Boton "Enviar test" en webhook                                   | Manda un payload de ejemplo al URL y muestra resultado inline (status code, response). Ahorra tiempo al integrador.                                                                                                               | Low        | No necesita crear un articulo real para verificar conectividad.                                                                                                             |
| Log de entregas de webhook                                       | Cada entrega registrada: timestamp, status code, payload, response. El admin puede ver que webhooks fallaron y diagnosticar.                                                                                                      | Med        | Tabla `webhook_deliveries`. En la UI: expandir fila de suscripcion o sub-tabla con ultimas N entregas. Badges verde/rojo por status code.                                   |
| Webhook delivery con retry basico                                | 3 intentos con delay incremental (1s, 10s, 60s) en caso de fallo (timeout o 5xx).                                                                                                                                                 | Med        | Implementar sincrono con setTimeout. No requiere cola de mensajes a esta escala. Registrar cada intento en deliveries.                                                      |
| Columnas configurables como setting global del negocio           | La config de columnas aplica a todos los usuarios, no por usuario individual. Consistencia para equipos chicos.                                                                                                                   | Low-Med    | Guardar en `businessSettings` como jsonb. Cargar al montar la tabla. Un admin configura, todos ven lo mismo.                                                                |
| Margen calculado en precios                                      | Mostrar margen (%) automaticamente cuando precio y costo estan presentes. Informacion util que no requiere campo adicional.                                                                                                       | Low        | Solo display, no se guarda. `((precio - costo) / costo * 100).toFixed(1)%` debajo de los campos de precio.                                                                  |

---

## Anti-Features

Features to explicitly NOT build in v1.2.

| Anti-Feature                                  | Why Avoid                                                                                                                           | What to Do Instead                                                                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crop/resize de imagenes en frontend           | Canvas API + aspect ratio UI + preview es un proyecto en si mismo. Las fotos de articulos se toman con celular y se suben tal cual. | Resize server-side al recibir upload con `sharp`. Generar thumbnail automaticamente (ej: 200x200 para tabla, 800px max para detalle).                             |
| Drag-and-drop reorder de imagenes             | Con slots fijos (3 etiqueta + 6 producto), no hay que reordenar. Cada slot tiene posicion definida.                                 | Click en slot para subir/reemplazar. Eliminar para vaciar el slot.                                                                                                |
| Bulk import de articulos via CSV              | Scope creep significativo: parseo, validacion linea por linea, preview de cambios, manejo de duplicados.                            | Dejar para v1.3+. La API REST con API keys soporta POST individual; un script externo puede automatizar imports.                                                  |
| Rate limiting por API key                     | Ventanas deslizantes, quotas, throttling por key: es infraestructura de API gateway, no de la app.                                  | Rate limit basico a nivel de Nginx/reverse proxy si es necesario.                                                                                                 |
| OAuth2 / token refresh para API keys          | API keys son Bearer tokens estaticos. No agregar refresh tokens ni OAuth flows.                                                     | `Authorization: Bearer sk_...`. Si se compromete, revocar y crear nueva. Simple y seguro.                                                                         |
| Webhook fan-out (multiples URLs por evento)   | Un evento dispara N webhooks: complejidad de delivery, ordering, partial failures.                                                  | Una suscripcion = una URL. Multiples destinos = multiples suscripciones. Simple y transparente.                                                                   |
| Editor WYSIWYG para observaciones             | Las observaciones son notas internas cortas. No justifican un editor rico con formatting.                                           | `<Textarea>` simple, como ya esta implementado.                                                                                                                   |
| Gestion de imagenes desde mobile              | La app mobile es para consulta y conteo. Subir fotos es tarea del admin en desktop.                                                 | Mostrar imagenes en mobile como read-only. Upload solo desde web.                                                                                                 |
| Webhook para entidades distintas de articulos | v1.2 scope es solo articulos. Extender a orders/sales/purchases agrega complejidad de payload, testing, y documentacion.            | Arquitectura extensible (campo `entidad` en la tabla), pero solo "articulos" habilitado. Agregar entidades en v1.3.                                               |
| Permisos granulares por API key               | Scopes tipo "read:articulos write:articulos". Over-engineering para un admin de comercio chico.                                     | API key tiene acceso completo a todos los endpoints. El RBAC existente (admin/viewer del JWT) no aplica a API keys — las keys son de integracion, no de usuarios. |
| Dashboard de uso de API keys                  | Graficas de requests/dia, endpoints mas usados, latencia. Es analytics, no admin.                                                   | Campo `ultimoUso` (timestamp) en la tabla de keys. Suficiente para saber si una key esta activa.                                                                  |

---

## Feature Dependencies

```
ArticuloForm (existente) ──> Image Upload Grid (nuevo, reemplaza placeholder)
                         ──> Ruta /articulos/[codigo]/editar (nuevo, usa form existente)

ArticuloSheet (existente) ──> Seccion de imagenes (agregar thumbnails)

ServerDataTable (existente) ──> Column visibility dropdown (agregar control UI)
                            ──> businessSettings extension (persistir preferencia)

Settings Nav (existente) ──> API Keys page (nueva seccion)
                         ──> Webhooks page (nueva seccion)

Backend upload endpoint (nuevo) ──> Image Upload Grid (frontend necesita donde mandar archivos)
Backend static serving (nuevo)  ──> Image display (frontend necesita URLs que resuelvan)

api_keys table (nuevo)         ──> API Keys UI (CRUD)
                               ──> JwtAuthGuard extension (aceptar Bearer api_key ademas de JWT)

webhook_subscriptions (nuevo)  ──> Webhooks UI (CRUD)
webhook_deliveries (nuevo)     ──> Delivery log UI
ArticulosService events        ──> Webhook delivery engine (disparar POST en create/update/delete)
```

Dependencias criticas:

- **Image upload requiere backend work primero**: endpoint de upload multipart + static file serving. No existe nada de esto en el backend actual.
- **API Keys requiere extension del auth guard**: el `JwtAuthGuard` actual solo valida JWTs de Supabase. Debe aceptar tambien `Bearer sk_...` tokens. Sin esto, los keys no sirven para nada.
- **Webhooks requiere event emitting**: el `ArticulosService` necesita emitir eventos despues de create/update/delete. NestJS tiene `EventEmitter2` para esto. El webhook engine escucha y despacha.
- **Columnas configurables requiere extension de businessSettings**: agregar campo jsonb para la configuracion. Endpoint GET/PATCH ya existe.

---

## MVP Recommendation

Prioritize:

1. **Ruta editar + soft-delete en UI** — La base ya existe (form, controller, toggle endpoint). Solo falta wiring. Desbloquea CRUD completo sin imagenes. Maximo medio dia de trabajo.
2. **Columnas configurables** — Dropdown con checkboxes + persistencia en businessSettings. TanStack Table ya lo soporta. Mejora inmediata en la lista existente.
3. **Image upload backend** — Upload endpoint con multer, static serving, resize con sharp. Infraestructura necesaria antes del UI.
4. **Image upload grid en ArticuloForm** — Componente de slots etiquetados. Reemplaza el placeholder. La feature mas visible para el usuario.
5. **API Keys backend + UI** — Schema, modulo NestJS, guard extension, pagina en Settings. Independiente de webhooks.
6. **Webhooks CRUD (backend + UI)** — Suscripciones en Settings. Independiente de delivery.
7. **Webhook delivery engine + logs** — Lo mas complejo. Event emitting, HTTP dispatch, retry, tabla de deliveries, UI de logs.

Defer:

- **Webhook retry con backoff**: Implementar delivery sincrono primero (fire-and-forget con log del resultado). Agregar retry asincrono si la escala lo justifica.
- **API key usage tracking detallado**: Solo guardar `ultimoUso` timestamp. No analytics.

---

## UX Patterns Recomendados

### Formulario de Articulo (~30 campos)

El form actual ya sigue las mejores practicas:

- **Secciones con SectionHeader**: Identificacion, Propiedades, Precios, Imagenes, ERP, Origen. Scroll vertical continuo.
- **Grids de 2 columnas** para campos cortos (codigo/nombre, marca/modelo, precio/costo).
- **Campos full-width** para texto largo (observaciones).
- **No migrar a tabs ni stepper**: el scroll vertical con secciones es el patron correcto para formularios de ~30 campos en desktop. Las secciones son scanneables y el usuario no pierde contexto.

Agregar:

- **Seccion de imagenes funcional** (reemplazar placeholder).
- **Switch activo/inactivo** con confirmacion (ya existe el campo `activo` en el form schema).

### Image Upload Grid

- **Layout**: Grid de 3 columnas. Seccion "Etiquetas" (3 slots) arriba, seccion "Producto" (6 slots en 2 filas) abajo.
- **Slot vacio**: Cuadrado con borde dashed, icono "+" centrado, texto "Etiqueta 1" o "Producto 3" como label. Click abre file picker.
- **Slot ocupado**: Thumbnail de la imagen. Hover muestra overlay oscuro con icono de eliminar (trash) y reemplazar (refresh).
- **Upload feedback**: Spinner dentro del slot durante upload. Toast de error si falla.
- **Restricciones**: Aceptar solo imagenes (image/\*). Limite sugerido: 5MB por archivo. Validar client-side antes de enviar.
- **No preview modal**: Para ver la imagen grande, abrir en nueva tab. No construir un lightbox.

### API Keys Management

- **Ubicacion**: Nueva entrada en Settings nav. Icono: Key (lucide). Titulo: "API Keys". Descripcion: "Gestiona tokens de acceso para integraciones".
- **Lista**: Tabla con columnas: Nombre, Key (prefijo truncado `sk_...a3f2`), Creada (fecha relativa), Ultimo uso (fecha relativa o "Nunca"), Estado (badge Activa/Revocada). Accion: boton "Revocar" (solo si activa).
- **Crear**: Boton "Nueva API Key" abre Dialog. Campo: nombre (obligatorio). Al confirmar, el dialog cambia a "Key creada" mostrando: campo readonly con el key completo, boton "Copiar" prominente, warning en rojo: "Guarda este key. No se mostrara de nuevo." Boton "Entendido, cerrar" solo se habilita despues de copiar o tras 5 segundos.
- **Revocar**: AlertDialog: "Revocar API Key [nombre]? Las integraciones que usan este key dejaran de funcionar inmediatamente. Esta accion no se puede deshacer." Botones: Cancelar / Revocar (destructive).
- **RBAC**: Solo usuarios con rol `admin` pueden ver y gestionar API keys.

### Webhooks Management

- **Ubicacion**: Nueva entrada en Settings nav. Icono: Globe o Webhook (lucide). Titulo: "Webhooks". Descripcion: "Configura notificaciones HTTP para eventos".
- **Lista**: Tabla con columnas: URL (truncada con tooltip del full URL), Entidad (badge), Evento (badge), Estado (switch inline para activar/desactivar), Ultima entrega (timestamp + badge de status code). Acciones: Editar, Test, Eliminar.
- **Crear/Editar**: Dialog con: Select "Entidad" (solo "Articulos" en v1.2), Select "Evento" (Creado / Actualizado / Eliminado / Todos), Input URL (validacion de formato URL), Switch activo. Al crear: mostrar secret generado (mismo patron que API key — una sola vez).
- **Test**: Boton en cada fila. Al clickear, envia POST con payload de ejemplo. Muestra resultado inline o en toast: "200 OK" (verde) o "500 Internal Server Error" (rojo) con response body truncado.
- **Secret**: Al crear, se muestra una vez. Boton "Regenerar secret" en edicion (con confirmacion, invalida el anterior). El receptor valida con `X-Webhook-Signature: sha256=hmac(secret, body)`.
- **Log de entregas**: Expandir fila (accordion) o link a sub-pagina. Tabla: timestamp, evento, status code (badge), intentos, response truncada. Filtrable por estado (exitoso/fallido).

---

## Complexity Summary

| Feature                | Backend                                | Frontend                     | Total    |
| ---------------------- | -------------------------------------- | ---------------------------- | -------- |
| Ruta editar articulo   | None (endpoint existe)                 | Low (page + fetch)           | Low      |
| Soft-delete UI         | None (endpoint existe)                 | Low (AlertDialog)            | Low      |
| Columnas configurables | Low (extend settings)                  | Low-Med (dropdown + persist) | Low-Med  |
| Image upload backend   | Med (multer + sharp + static)          | None                         | Med      |
| Image upload grid UI   | None (usa endpoint)                    | Med (componente slots)       | Med      |
| API Keys               | Med (schema + module + guard)          | Med (settings page)          | Med-High |
| Webhooks CRUD          | Med (schema + module)                  | Med (settings page)          | Med      |
| Webhook delivery       | Med-High (events + HTTP + retry + log) | Low (log display)            | Med-High |

Esfuerzo total estimado: **5-8 fases** de trabajo, dependiendo de granularidad.

---

## Sources

- [Adobe Commerce Image Uploader Pattern Library](https://developer.adobe.com/commerce/admin-developer/pattern-library/getting-user-input/image-uploader)
- [Mastering UX for CRUD Operations (Medium)](https://medium.com/design-bootcamp/mastering-crud-operations-a-framework-for-seamless-product-design-2630affbc1e5)
- [CRUD Beyond Grids: Modern UI Patterns 2026](https://copyprogramming.com/howto/what-is-the-best-ux-to-let-user-perform-crud-operations)
- [API Key Management Best Practices 2025 (MultitaskAI)](https://multitaskai.com/blog/api-key-management-best-practices/)
- [API Keys Complete 2025 Guide (DEV)](https://dev.to/hamd_writer_8c77d9c88c188/api-keys-the-complete-2025-guide-to-security-management-and-best-practices-3980)
- [API Key Management Best Practices (OneUptime)](https://oneuptime.com/blog/post/2026-02-20-api-key-management-best-practices/view)
- [Building Webhooks Best Practices (WorkOS)](https://workos.com/blog/building-webhooks-into-your-application-guidelines-and-best-practices)
- [Managing Webhooks (Zendesk)](https://support.zendesk.com/hc/en-us/articles/4408836101146-Managing-webhooks)
- [Svix - Webhooks as a Service](https://www.svix.com/)
- [Data Table UX Patterns (Pencil & Paper)](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- Codebase analysis: `articulo-form.tsx`, `articulo-sheet.tsx`, `articulos-columns.tsx`, `articulos-client.tsx`, `settings-nav.tsx`, `schema.ts`

---

_Feature research for v1.2 milestone: Articulos CRUD completo + Imagenes + Columnas Configurables + API Keys + Webhooks_
_Researched: 2026-03-10_
_Research confidence: HIGH (based on codebase analysis, industry patterns, established UX conventions)_
