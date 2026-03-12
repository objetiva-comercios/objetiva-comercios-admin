---
phase: 21
slug: image-upload-frontend-detalle
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| **Framework**          | No detectado en `apps/web` — verificación manual + Playwright MCP |
| **Config file**        | none — Wave 0 si se añade vitest                                  |
| **Quick run command**  | Verificación visual manual en browser                             |
| **Full suite command** | Playwright MCP smoke tests                                        |
| **Estimated runtime**  | ~30 seconds (manual)                                              |

---

## Sampling Rate

- **After every task commit:** Verificación visual manual en browser
- **After every plan wave:** Playwright MCP smoke test
- **Before `/gsd:verify-work`:** Verificación visual completa de todos los criterios
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type    | Automated Command                                                       | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ------------ | ----------------------------------------------------------------------- | ----------- | ---------- |
| 21-01-01 | 01   | 1    | IMG-01      | manual/smoke | Playwright: navegar a edit page, drop file en slot, verificar thumbnail | N/A         | ⬜ pending |
| 21-01-02 | 01   | 1    | IMG-02      | manual/smoke | Playwright: click × en slot lleno, verificar slot vuelve a vacío        | N/A         | ⬜ pending |
| 21-01-03 | 01   | 1    | IMG-04      | manual/smoke | Playwright: simular drag & drop con dispatchEvent                       | N/A         | ⬜ pending |
| 21-02-01 | 02   | 1    | VIEW-02     | manual/smoke | Playwright: abrir sheet desde lista, verificar sección imágenes         | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

_Existing infrastructure covers all phase requirements — verificación manual con Playwright MCP. No se requiere framework de tests automatizados para esta fase de componentes UI._

---

## Manual-Only Verifications

| Behavior                                  | Requirement    | Why Manual                                    | Test Instructions                                                                           |
| ----------------------------------------- | -------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Upload via drag & drop en slot específico | IMG-01, IMG-04 | Interacción D&D nativa requiere browser real  | 1. Abrir edit page 2. Arrastrar imagen sobre slot vacío 3. Verificar thumbnail aparece      |
| Thumbnail visible + botón eliminar        | IMG-02         | Verificación visual de overlay y hover states | 1. Hover sobre slot lleno 2. Verificar × aparece 3. Click × 4. Verificar slot vacío         |
| Sheet muestra imágenes read-only          | VIEW-02        | Layout visual de grid en panel lateral        | 1. Click fila en lista 2. Verificar sheet abre 3. Verificar sección imágenes con thumbnails |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
