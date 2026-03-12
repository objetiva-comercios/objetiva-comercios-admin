---
phase: 26
slug: tech-debt-cleanup-v12
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                    |
| ---------------------- | -------------------------------------------------------- |
| **Framework**          | No test suite — compile-time verification via TypeScript |
| **Config file**        | tsconfig.json (apps/backend)                             |
| **Quick run command**  | `cd apps/backend && pnpm tsc --noEmit`                   |
| **Full suite command** | `cd apps/backend && pnpm tsc --noEmit`                   |
| **Estimated runtime**  | ~10 seconds                                              |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/backend && pnpm tsc --noEmit`
- **After every plan wave:** Run `cd apps/backend && pnpm tsc --noEmit`
- **Before `/gsd:verify-work`:** Full compile must be clean
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type        | Automated Command   | File Exists | Status     |
| -------- | ---- | ---- | ----------- | ---------------- | ------------------- | ----------- | ---------- |
| 26-01-01 | 01   | 1    | SC-2        | manual + compile | `pnpm tsc --noEmit` | ✅          | ⬜ pending |
| 26-01-02 | 01   | 1    | SC-3        | manual + compile | `pnpm tsc --noEmit` | ✅          | ⬜ pending |
| 26-01-03 | 01   | 1    | SC-4        | compile-time     | `pnpm tsc --noEmit` | ✅          | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. TypeScript compiler provides compile-time verification for type safety changes. Idempotency fixes verified via manual curl/Playwright.

---

## Manual-Only Verifications

| Behavior                           | Requirement | Why Manual               | Test Instructions                                                        |
| ---------------------------------- | ----------- | ------------------------ | ------------------------------------------------------------------------ |
| revoke() API key ya revocada → 409 | SC-2        | No test suite configured | `curl -X PATCH /api/api-keys/:id/revoke` twice, second should return 409 |
| revoke() webhook ya revocado → 409 | SC-3        | No test suite configured | `curl -X PATCH /api/webhooks/:id/revoke` twice, second should return 409 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
