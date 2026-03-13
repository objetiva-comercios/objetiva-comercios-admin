---
phase: 27
slug: add-objeto-to-form
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                            |
| ---------------------- | ------------------------------------------------ |
| **Framework**          | No test framework (type-check via Next.js build) |
| **Config file**        | none                                             |
| **Quick run command**  | `pnpm --filter web build`                        |
| **Full suite command** | `pnpm --filter web build`                        |
| **Estimated runtime**  | ~30 seconds                                      |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web build`
- **After every plan wave:** Run `pnpm --filter web build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement  | Test Type | Automated Command         | File Exists | Status     |
| -------- | ---- | ---- | ------------ | --------- | ------------------------- | ----------- | ---------- |
| 27-01-01 | 01   | 1    | INT-01 (gap) | smoke     | `pnpm --filter web build` | ✅          | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

_Existing infrastructure covers all phase requirements._

---

## Manual-Only Verifications

| Behavior                                   | Requirement | Why Manual             | Test Instructions                                                              |
| ------------------------------------------ | ----------- | ---------------------- | ------------------------------------------------------------------------------ |
| Campo `objeto` visible en formulario crear | INT-01      | UI visual              | Abrir /articulos/nuevo, verificar campo "Tipo / Objeto" en sección Propiedades |
| Campo `objeto` popula en modo edición      | INT-01      | Requiere datos reales  | Editar artículo con objeto != null, verificar que el campo muestra el valor    |
| Campo respeta `isCampoVisible('objeto')`   | INT-01      | Requiere config change | Ocultar campo desde settings, verificar que desaparece del form                |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
