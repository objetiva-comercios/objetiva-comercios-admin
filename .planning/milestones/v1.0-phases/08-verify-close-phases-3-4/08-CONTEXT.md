# Phase 8: Verify & Close Phases 3+4 - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Create formal VERIFICATION.md for Phase 3 (Web Application) and Phase 4 (Mobile Application), fix roadmap data inconsistencies (Phase 3 shows 0/8 plans complete despite all being executed), and close all 26 unverified requirements in REQUIREMENTS.md. This phase delivers documentation and data integrity — no new features.

</domain>

<decisions>
## Implementation Decisions

### Failed Verification Handling

- Fix and verify — every requirement should end at VERIFIED, no loose ends after this phase
- Only non-breaking fixes allowed (missing pages, broken routes, config, styling). No refactoring or restructuring
- If a feature was never built and it's small enough (single component/page), build it. Only mark FAILED if substantial work is needed
- Substantial FAILED items get documented with clear description of what's missing

### Evidence Standard

- Web app (Phase 3): code inspection + `pnpm build` must pass
- Mobile app (Phase 4): Claude's discretion on whether build check is practical given Capacitor setup
- Report format: match existing VERIFICATION.md structure (Observable Truths table + Required Artifacts table + score)
- UI/subjective requirements (UI-01 shadcn, UI-02 dark theme, UI-03 responsive): Claude determines reasonable evidence from what's in the code

### Plan Reconciliation

- Verify each of Phase 3's 8 SUMMARY.md files to confirm work was actually done before updating roadmap checkboxes
- Mark plan [x] if core goal is met — pragmatic, not perfectionist
- Phase 3 status updates to "Complete" with date ONLY after VERIFICATION.md confirms requirements pass (verification is the gate)
- Phase 4 gets the same thorough verification process despite already being marked Complete

### Requirements Closure

- Cross-platform requirements (NAV-04 through NAV-07, UI-04) verified on BOTH web AND mobile — both must pass for Complete status
- Use existing "Complete" status in traceability table (consistent with AUTH-03, API-\* etc.)
- Update BOTH the checkbox section at top of REQUIREMENTS.md AND the traceability table at bottom
- Verify DOC-03 (README covers running all apps) specifically — trust already-Complete DOC-01, DOC-02, DOC-04

### Claude's Discretion

- Commit strategy (separate fix commits vs bundled with verification)
- Mobile evidence depth (code-only vs build check)
- UI requirement evidence thresholds
- Order of operations (Phase 3 first vs Phase 4 first vs interleaved)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. Follow the established verification report format from Phases 5-7.

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- Existing VERIFICATION.md reports (Phases 1, 2, 5, 6, 7) serve as format templates
- Phase 3 and 4 CONTEXT.md files contain original requirements mapping
- All 8 Phase 3 SUMMARY.md files contain execution results to cross-reference
- All 4 Phase 4 SUMMARY.md files contain execution results to cross-reference

### Established Patterns

- Verification reports use frontmatter (phase, verified date, status, score, re_verification)
- Observable Truths table: #, Truth, Status (VERIFIED/FAILED/PARTIAL), Evidence
- Required Artifacts table: Artifact, Expected, Status, Details
- Score format: "X/Y truths verified" or "X/Y must-haves verified"

### Integration Points

- ROADMAP.md Phase 3 plan checkboxes (currently all [ ], need updating)
- ROADMAP.md Phase 3 status row (currently "In Progress" / "0/8")
- REQUIREMENTS.md top-level checkboxes (26 currently unchecked)
- REQUIREMENTS.md traceability table (26 rows currently "Pending")

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 08-verify-close-phases-3-4_
_Context gathered: 2026-03-02_
