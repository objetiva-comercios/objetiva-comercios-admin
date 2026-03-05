---
phase: 14
slug: schema-foundation-articulos-depositos
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                              |
| ---------------------- | -------------------------------------------------- |
| **Framework**          | jest 29.x (backend) / vitest (web - if configured) |
| **Config file**        | `apps/backend/jest.config.ts`                      |
| **Quick run command**  | `cd apps/backend && pnpm test -- --bail`           |
| **Full suite command** | `cd apps/backend && pnpm test`                     |
| **Estimated runtime**  | ~15 seconds                                        |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/backend && pnpm test -- --bail`
- **After every plan wave:** Run `cd apps/backend && pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement                    | Test Type | Automated Command                   | File Exists | Status     |
| -------- | ---- | ---- | ------------------------------ | --------- | ----------------------------------- | ----------- | ---------- |
| 14-01-01 | 01   | 1    | ART-01..12, DEP-01..04, MIG-01 | schema    | `cd apps/backend && pnpm db:push`   | ❌ W0       | ⬜ pending |
| 14-02-01 | 02   | 1    | ART-01, ART-02                 | e2e       | `curl localhost:3000/api/articulos` | ❌ W0       | ⬜ pending |
| 14-03-01 | 03   | 2    | ART-03, ART-04, ART-05         | manual    | Browser test                        | N/A         | ⬜ pending |
| 14-04-01 | 04   | 2    | DEP-01..04                     | e2e       | `curl localhost:3000/api/depositos` | ❌ W0       | ⬜ pending |
| 14-05-01 | 05   | 3    | DEBT-01, DEBT-04, MIG-04       | unit      | `cd apps/backend && pnpm test`      | ❌ W0       | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] Schema compiles and pushes without errors (`pnpm db:push`)
- [ ] Seed script runs successfully (`pnpm db:seed`)
- [ ] Backend starts without errors (`pnpm dev`)

_Existing infrastructure covers test framework installation._

---

## Manual-Only Verifications

| Behavior                            | Requirement    | Why Manual      | Test Instructions                                            |
| ----------------------------------- | -------------- | --------------- | ------------------------------------------------------------ |
| Articulos list UI renders correctly | ART-01         | Visual layout   | Navigate to /articulos, verify table renders with pagination |
| Articulo form with all field groups | ART-03, ART-04 | Complex form UI | Create new articulo, verify all field groups appear          |
| Image upload in articulo form       | ART-08         | File upload UI  | Upload image in articulo form, verify preview                |
| Depositos list with stock summary   | DEP-01         | Visual layout   | Navigate to /depositos, verify stock counts display          |
| Search by any code type             | ART-02         | UX flow         | Type SKU/barcode/ERP code in search, verify results          |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
