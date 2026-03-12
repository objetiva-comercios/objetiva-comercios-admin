---
phase: 25
slug: wire-frontend-soft-delete-verify
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                   |
| ---------------------- | ------------------------------------------------------- |
| **Framework**          | None — phase is frontend wiring + verification document |
| **Config file**        | none                                                    |
| **Quick run command**  | `pnpm --filter web build`                               |
| **Full suite command** | `pnpm --filter web build`                               |
| **Estimated runtime**  | ~30 seconds                                             |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter web build`
- **After every plan wave:** Run `pnpm --filter web build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement                    | Test Type   | Automated Command         | File Exists | Status     |
| -------- | ---- | ---- | ------------------------------ | ----------- | ------------------------- | ----------- | ---------- |
| 25-01-01 | 01   | 1    | ART-03                         | build       | `pnpm --filter web build` | ✅          | ⬜ pending |
| 25-01-02 | 01   | 1    | ART-03                         | build       | `pnpm --filter web build` | ✅          | ⬜ pending |
| 25-01-03 | 01   | 1    | ART-03                         | build       | `pnpm --filter web build` | ✅          | ⬜ pending |
| 25-02-01 | 02   | 2    | ART-01, ART-02, ART-03, ART-04 | manual-only | n/a                       | n/a         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

_Existing infrastructure covers all phase requirements._ No test framework to install — verification is via TypeScript build check and VERIFICATION.md code review document.

---

## Manual-Only Verifications

| Behavior                                | Requirement | Why Manual                                         | Test Instructions                                 |
| --------------------------------------- | ----------- | -------------------------------------------------- | ------------------------------------------------- |
| Crear articulo con ~30 campos           | ART-01      | No test suite configured; code review verification | Trace code path in VERIFICATION.md                |
| Editar articulo con form pre-poblado    | ART-02      | No test suite configured; code review verification | Trace code path in VERIFICATION.md                |
| Soft-delete via DELETE con confirmación | ART-03      | No test suite configured; code review verification | Trace code path + webhook flow in VERIFICATION.md |
| Búsqueda con debounce 300ms             | ART-04      | No test suite configured; code review verification | Trace code path in VERIFICATION.md                |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
