---
phase: 29
slug: catalogos-de-atributos
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-30
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Filled by gsd-planner from RESEARCH.md `## Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TBD — planner picks (recommended: minimal — Vitest unit for `suggestAbrev` + Playwright E2E via project skill `playwright-testing`) |
| **Config file** | TBD |
| **Quick run command** | TBD |
| **Full suite command** | TBD |
| **Estimated runtime** | TBD |

---

## Sampling Rate

- **After every task commit:** Run quick suite (TBD)
- **After every plan wave:** Run full suite (TBD)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** TBD

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | — | — | CAT-01..04 | — | — | — | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky — filled by planner.*

---

## Wave 0 Requirements

To be filled by gsd-planner from RESEARCH.md §Validation Architecture. Likely items:

- [ ] Test infra setup (Vitest in `apps/web` and/or Jest in `apps/backend`) — repo currently has no `*.spec.ts`
- [ ] Stub fixtures / factories for `prop_*` rows
- [ ] Decide testing scope: minimal (suggestAbrev + 1 E2E) vs full (backend Jest + web Vitest + Playwright)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TBD | TBD | TBD | TBD |

*Planner fills based on RESEARCH.md.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < {N}s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
