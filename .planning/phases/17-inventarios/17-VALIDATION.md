---
phase: 17
slug: inventarios
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                             |
| ---------------------- | ------------------------------------------------- |
| **Framework**          | None — no automated test framework in project     |
| **Config file**        | None — validation via type-check + build + manual |
| **Quick run command**  | `cd apps/backend && pnpm db:push && pnpm db:seed` |
| **Full suite command** | `pnpm -w run build`                               |
| **Estimated runtime**  | ~30 seconds                                       |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/backend && pnpm db:push && pnpm db:seed`
- **After every plan wave:** Run `pnpm -w run build`
- **Before `/gsd:verify-work`:** Full manual verification checklist must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement            | Test Type | Automated Command                           | File Exists | Status     |
| -------- | ---- | ---- | ---------------------- | --------- | ------------------------------------------- | ----------- | ---------- |
| 17-01-01 | 01   | 1    | MIG-05                 | schema    | `cd apps/backend && pnpm db:push`           | N/A         | ⬜ pending |
| 17-01-02 | 01   | 1    | MIG-05                 | seed      | `cd apps/backend && pnpm db:seed`           | N/A         | ⬜ pending |
| 17-02-01 | 02   | 1    | INV-01, INV-06, INV-07 | build     | `pnpm -w run build`                         | N/A         | ⬜ pending |
| 17-02-02 | 02   | 1    | INV-02                 | build     | `pnpm -w run build`                         | N/A         | ⬜ pending |
| 17-02-03 | 02   | 1    | INV-08                 | build     | `pnpm -w run build`                         | N/A         | ⬜ pending |
| 17-03-01 | 03   | 2    | INV-01, INV-06         | manual    | Browser: /articulos/inventarios             | N/A         | ⬜ pending |
| 17-03-02 | 03   | 2    | INV-03, INV-04, INV-05 | manual    | Browser: /articulos/inventarios/[id]/conteo | N/A         | ⬜ pending |
| 17-03-03 | 03   | 2    | INV-02                 | manual    | Browser: /settings/depositos                | N/A         | ⬜ pending |
| 17-03-04 | 03   | 2    | INV-08, INV-09         | manual    | Browser: /settings/dispositivos             | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- [ ] Update TRUNCATE list in seed.ts to include new tables (inventarios_articulos, inventarios, inventario_sectores, dispositivos_moviles) in correct FK cascade order
- [ ] Create seed data generators for inventario and dispositivo tables

_Handled within Plan 01 (schema + seed plan)._

---

## Manual-Only Verifications

| Behavior                          | Requirement    | Why Manual     | Test Instructions                                                             |
| --------------------------------- | -------------- | -------------- | ----------------------------------------------------------------------------- |
| Create event dialog               | INV-01         | UI interaction | Open /articulos/inventarios, click create, fill form, submit                  |
| Status transitions                | INV-05, INV-07 | UI + API flow  | Create event, transition pendiente→en_curso→finalizado, verify buttons change |
| Count editing locked on finalized | INV-05         | UI state       | Finalize event, verify counting page is read-only                             |
| Discrepancy colors                | INV-04         | Visual         | Count articulos, verify green/red/yellow color coding                         |
| Sector management                 | INV-02         | UI interaction | Settings > Depositos, add/edit/delete sectors                                 |
| Dispositivos CRUD                 | INV-08         | UI interaction | Settings > Dispositivos, create/edit/toggle devices                           |
| Articulo search in counting       | INV-03         | UI interaction | Open counting page, search articulo, add to count                             |
| Filter by estado/fecha            | INV-06         | UI interaction | Use filters on inventory list, verify results                                 |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or manual verification defined
- [ ] Sampling continuity: no 3 consecutive tasks without verification
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
