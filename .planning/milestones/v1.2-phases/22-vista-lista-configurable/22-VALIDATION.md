---
phase: 22
slug: vista-lista-configurable
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 22 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                    |
| ---------------------- | -------------------------------------------------------- |
| **Framework**          | None — project relies on manual/visual verification      |
| **Config file**        | None — no test framework installed                       |
| **Quick run command**  | `pnpm --filter backend build && pnpm --filter web build` |
| **Full suite command** | `pnpm --filter backend build && pnpm --filter web build` |
| **Estimated runtime**  | ~30 seconds                                              |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter backend build && pnpm --filter web build`
- **After every plan wave:** Run full build + manual verification steps
- **Before `/gsd:verify-work`:** Full build must pass + all manual checks green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command             | File Exists | Status     |
| -------- | ---- | ---- | ----------- | --------- | ----------------------------- | ----------- | ---------- |
| 22-01-01 | 01   | 1    | VIEW-01     | build     | `pnpm --filter backend build` | ✅          | ⬜ pending |
| 22-01-02 | 01   | 1    | VIEW-01     | build     | `pnpm --filter web build`     | ✅          | ⬜ pending |
| 22-02-01 | 02   | 1    | VIEW-01     | manual    | N/A — visual verification     | N/A         | ⬜ pending |
| 22-02-02 | 02   | 1    | VIEW-01     | manual    | N/A — visual verification     | N/A         | ⬜ pending |
| 22-02-03 | 02   | 1    | VIEW-03     | manual    | N/A — visual verification     | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

_Existing infrastructure covers all phase requirements — no test framework to install. Project uses build-time type checking + manual browser verification._

---

## Manual-Only Verifications

| Behavior                              | Requirement | Why Manual                     | Test Instructions                                                                  |
| ------------------------------------- | ----------- | ------------------------------ | ---------------------------------------------------------------------------------- |
| Column visibility toggle persists     | VIEW-01     | UI interaction + DB round-trip | Toggle column in dropdown → reload page → column state restored                    |
| Settings page toggles sync with table | VIEW-01     | Cross-page state               | Toggle in Settings → navigate to Artículos → verify column hidden/shown            |
| Sort on column header click           | VIEW-03     | UI interaction + API call      | Click column header → arrow appears, data re-sorts → click again → direction flips |
| Tri-state sort cycle                  | VIEW-03     | UI interaction detail          | Click 3 times: asc → desc → neutral (ArrowUpDown icon)                             |
| New columns render correctly          | VIEW-01     | Visual layout                  | Verify medida, presentación, unidades ERP, objeto columns show data                |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
