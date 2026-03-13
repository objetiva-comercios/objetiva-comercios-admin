---
phase: 28
slug: add-objeto-to-sheet
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 28 — Validation Strategy

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

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command         | File Exists | Status     |
| -------- | ---- | ---- | ----------- | --------- | ------------------------- | ----------- | ---------- |
| 28-01-01 | 01   | 1    | VIEW-02     | smoke     | `pnpm --filter web build` | ✅          | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior                                                    | Requirement | Why Manual             | Test Instructions                                                                   |
| ----------------------------------------------------------- | ----------- | ---------------------- | ----------------------------------------------------------------------------------- |
| Campo `objeto` visible en ArticuloSheet sección Propiedades | VIEW-02     | UI visual verification | Abrir detalle de un artículo que tenga objeto, verificar que aparece en Propiedades |
| Campo muestra label "Tipo / Objeto" con valor correcto      | VIEW-02     | UI visual verification | Verificar label y valor mostrado coincide con datos del artículo                    |
| Campo respeta `isCampoVisible('objeto')`                    | VIEW-02     | UI visual verification | Ocultar campo objeto en config, verificar que desaparece del sheet                  |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
