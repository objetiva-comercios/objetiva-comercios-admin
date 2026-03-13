---
phase: 23
slug: api-keys
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 23 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Framework**          | None detected (no jest.config, no vitest.config, no test/ dir)                           |
| **Config file**        | None — Wave 0 gap                                                                        |
| **Quick run command**  | Manual: `curl -H "Authorization: Bearer obj_sk_..." http://localhost:3001/api/articulos` |
| **Full suite command** | Manual: create key via UI + curl all endpoints + verify DB state                         |
| **Estimated runtime**  | ~60 seconds (manual)                                                                     |

---

## Sampling Rate

- **After every task commit:** Manual smoke test — create a key via UI, use it with curl against `/api/articulos`
- **After every plan wave:** Verify revoke invalidates the key (curl returns 401)
- **Before `/gsd:verify-work`:** All 4 APIKEY requirements manually verified
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type   | Automated Command                                         | File Exists      | Status     |
| -------- | ---- | ---- | ----------- | ----------- | --------------------------------------------------------- | ---------------- | ---------- |
| 23-01-01 | 01   | 1    | APIKEY-01   | manual-only | POST /api/api-keys + inspect DB                           | ❌ no test infra | ⬜ pending |
| 23-01-02 | 01   | 1    | APIKEY-02   | manual-only | GET /api/api-keys + DELETE /api/api-keys/:id              | ❌ no test infra | ⬜ pending |
| 23-01-03 | 01   | 1    | APIKEY-03   | manual-only | curl -H "Authorization: Bearer obj*sk*..." /api/articulos | ❌ no test infra | ⬜ pending |
| 23-01-04 | 01   | 1    | APIKEY-04   | manual-only | Check lastUsedAt in DB after API key auth                 | ❌ no test infra | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- No automated test infrastructure detected in this project (no Jest, no Vitest)
- All validation is manual / integration-by-observation
- _This project has no test setup — manual verification is the established pattern_

---

## Manual-Only Verifications

| Behavior                                               | Requirement | Why Manual    | Test Instructions                                                                        |
| ------------------------------------------------------ | ----------- | ------------- | ---------------------------------------------------------------------------------------- |
| Key generation returns full key once, stores only hash | APIKEY-01   | No test infra | 1. POST /api/api-keys with name 2. Verify full key in response 3. Check DB has only hash |
| List returns active keys; revoke sets revokedAt        | APIKEY-02   | No test infra | 1. GET /api/api-keys 2. DELETE /api/api-keys/:id 3. Verify revokedAt set in DB           |
| Bearer token auth works for protected endpoints        | APIKEY-03   | No test infra | 1. curl with API key as Bearer token 2. Verify 200 response from /api/articulos          |
| lastUsedAt updates on API key auth                     | APIKEY-04   | No test infra | 1. Use API key for auth 2. Check lastUsedAt timestamp updated in DB                      |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
