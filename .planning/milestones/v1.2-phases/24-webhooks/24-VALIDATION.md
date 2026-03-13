---
phase: 24
slug: webhooks
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                                 |
| ---------------------- | ----------------------------------------------------- |
| **Framework**          | None detected (no jest.config, no test/ directory)    |
| **Config file**        | None — manual verification is the established pattern |
| **Quick run command**  | Manual API calls + UI verification                    |
| **Full suite command** | Manual API calls + UI verification                    |
| **Estimated runtime**  | ~2-5 minutes (manual)                                 |

---

## Sampling Rate

- **After every task commit:** Verify via manual API call or UI check
- **After every plan wave:** Full manual verification of all endpoints and UI
- **Before `/gsd:verify-work`:** All success criteria must be manually verified
- **Max feedback latency:** N/A (manual verification)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Verification Method                                  | Status  |
| ------- | ---- | ---- | ----------- | --------- | ---------------------------------------------------- | ------- |
| TBD     | 01   | 1    | HOOK-01     | manual    | Create webhook via UI, verify in DB                  | pending |
| TBD     | 01   | 1    | HOOK-02     | manual    | Edit/delete webhook via UI, verify changes           | pending |
| TBD     | 01   | 1    | HOOK-06     | manual    | Verify HMAC header in delivery log                   | pending |
| TBD     | 02   | 1    | HOOK-03     | manual    | Trigger articulo event, check delivery log           | pending |
| TBD     | 02   | 1    | HOOK-07     | manual    | Verify EventEmitter fires on create/update/delete    | pending |
| TBD     | 03   | 2    | HOOK-04     | manual    | View delivery log in UI, check status/code/timestamp | pending |
| TBD     | 03   | 2    | HOOK-05     | manual    | Send test ping, verify inline result                 | pending |

_Status: pending / green / red / flaky_

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — no test framework setup needed. Manual verification is the established pattern across all prior phases.

---

## Manual-Only Verifications

| Behavior           | Requirement      | Why Manual                | Test Instructions                                                                   |
| ------------------ | ---------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| Webhook CRUD       | HOOK-01, HOOK-02 | No test infra             | Create/edit/delete webhook via settings UI, verify DB state                         |
| Async delivery     | HOOK-03          | Requires live HTTP target | Create webhook pointing to external URL, trigger articulo event, check delivery log |
| Delivery log       | HOOK-04          | UI verification           | View webhook detail, check deliveries table shows status/code/timestamp             |
| Test ping          | HOOK-05          | Requires live HTTP target | Click ping button, verify inline result                                             |
| HMAC signature     | HOOK-06          | Integration test          | Verify X-Webhook-Signature header matches expected HMAC of payload                  |
| Event architecture | HOOK-07          | Wiring verification       | Create/update/delete articulo, verify webhook fires for each event type             |

---

## Validation Sign-Off

- [ ] All tasks have manual verification instructions
- [ ] Sampling continuity: every task has a verification method
- [ ] No watch-mode flags
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
