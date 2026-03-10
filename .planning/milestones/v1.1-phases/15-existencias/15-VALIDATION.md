---
phase: 15
slug: existencias
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                   |
| ---------------------- | ------------------------------------------------------- |
| **Framework**          | vitest (backend unit) / Next.js dev server (manual UI)  |
| **Config file**        | `apps/backend/vitest.config.ts` (if exists) or inline   |
| **Quick run command**  | `pnpm --filter backend test`                            |
| **Full suite command** | `pnpm --filter backend test && pnpm --filter web build` |
| **Estimated runtime**  | ~30 seconds                                             |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter backend test`
- **After every plan wave:** Run `pnpm --filter backend test && pnpm --filter web build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command            | File Exists | Status     |
| -------- | ---- | ---- | ----------- | --------- | ---------------------------- | ----------- | ---------- |
| 15-01-01 | 01   | 1    | EXI-01      | unit      | `pnpm --filter backend test` | ❌ W0       | ⬜ pending |
| 15-01-02 | 01   | 1    | EXI-02      | unit      | `pnpm --filter backend test` | ❌ W0       | ⬜ pending |
| 15-02-01 | 02   | 1    | EXI-03      | build     | `pnpm --filter web build`    | ❌ W0       | ⬜ pending |
| 15-02-02 | 02   | 1    | EXI-04      | manual    | N/A                          | N/A         | ⬜ pending |
| 15-03-01 | 03   | 2    | EXI-05      | manual    | N/A                          | N/A         | ⬜ pending |
| 15-03-02 | 03   | 2    | EXI-06      | build     | `pnpm --filter web build`    | ❌ W0       | ⬜ pending |
| 15-04-01 | 04   | 2    | EXI-07      | unit      | `pnpm --filter backend test` | ❌ W0       | ⬜ pending |
| 15-05-01 | 05   | 1    | MIG-02      | build     | `pnpm --filter web build`    | ❌ W0       | ⬜ pending |
| 15-06-01 | 06   | 1    | DEBT-02     | build     | `pnpm --filter web build`    | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] Backend test setup for existencias module (service + controller unit tests)
- [ ] Web build verification (type checking covers DEBT-02, MIG-02)

_Existing infrastructure covers framework installation — only test stubs needed._

---

## Manual-Only Verifications

| Behavior                   | Requirement | Why Manual                | Test Instructions                                                                 |
| -------------------------- | ----------- | ------------------------- | --------------------------------------------------------------------------------- |
| Low-stock badge visibility | EXI-04      | Visual CSS/styling        | Open existencias page, verify badges appear on items below stock_minimo           |
| Inline edit UX             | EXI-05      | Click-to-edit interaction | Click a stock cell, edit value, press Enter, verify update + toast                |
| Matrix view layout         | EXI-06      | Dynamic column rendering  | Switch to matrix view, verify deposito columns appear with frozen articulo column |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
