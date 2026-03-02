# Phase 8: Verify & Close Phases 3+4 - Research

**Researched:** 2026-03-02
**Domain:** Documentation verification, requirements closure, data integrity
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Failed Verification Handling**

- Fix and verify — every requirement should end at VERIFIED, no loose ends after this phase
- Only non-breaking fixes allowed (missing pages, broken routes, config, styling). No refactoring or restructuring
- If a feature was never built and it's small enough (single component/page), build it. Only mark FAILED if substantial work is needed
- Substantial FAILED items get documented with clear description of what's missing

**Evidence Standard**

- Web app (Phase 3): code inspection + `pnpm build` must pass
- Mobile app (Phase 4): Claude's discretion on whether build check is practical given Capacitor setup
- Report format: match existing VERIFICATION.md structure (Observable Truths table + Required Artifacts table + score)
- UI/subjective requirements (UI-01 shadcn, UI-02 dark theme, UI-03 responsive): Claude determines reasonable evidence from what's in the code

**Plan Reconciliation**

- Verify each of Phase 3's 8 SUMMARY.md files to confirm work was actually done before updating roadmap checkboxes
- Mark plan [x] if core goal is met — pragmatic, not perfectionist
- Phase 3 status updates to "Complete" with date ONLY after VERIFICATION.md confirms requirements pass (verification is the gate)
- Phase 4 gets the same thorough verification process despite already being marked Complete

**Requirements Closure**

- Cross-platform requirements (NAV-04 through NAV-07, UI-04) verified on BOTH web AND mobile — both must pass for Complete status
- Use existing "Complete" status in traceability table (consistent with AUTH-03, API-\* etc.)
- Update BOTH the checkbox section at top of REQUIREMENTS.md AND the traceability table at bottom
- Verify DOC-03 (README covers running all apps) specifically — trust already-Complete DOC-01, DOC-02, DOC-04

### Claude's Discretion

- Commit strategy (separate fix commits vs bundled with verification)
- Mobile evidence depth (code-only vs build check)
- UI requirement evidence thresholds
- Order of operations (Phase 3 first vs Phase 4 first vs interleaved)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                         | Research Support                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01 | User can sign up with email and password via Supabase Auth                                          | Web: signup/page.tsx wired to supabase.auth.signUp (confirmed in 03-02-SUMMARY). Requires VERIFICATION.md to close.                                     |
| AUTH-02 | User can log in with email and password                                                             | Web: login/page.tsx wired to supabase.auth.signInWithPassword (confirmed in 03-02-SUMMARY). Requires VERIFICATION.md to close.                          |
| AUTH-04 | User can log out from any page                                                                      | Web: UserMenu.handleLogout → supabase.auth.signOut (confirmed in 03-03-SUMMARY). Logout present in mobile DrawerNav. Requires VERIFICATION.md to close. |
| NAV-03  | Web app displays sidebar navigation for all sections                                                | Web: sidebar.tsx with md:flex, 7 routes (confirmed in 03-03-SUMMARY). Requires VERIFICATION.md to close.                                                |
| UI-01   | UI follows shadcn aesthetic (modern, dense, admin-oriented)                                         | Web: shadcn/ui components installed in 03-01, confirmed wired by audit. Mobile uses CSS variable design tokens. Both need code-inspection evidence.     |
| UI-02   | Dark theme implemented and works across platforms                                                   | Web: next-themes + CSS variable colors confirmed. Mobile: tailwind darkMode:'class' + useTheme hook. Requires VERIFICATION.md to close.                 |
| UI-03   | Layout is responsive and adapts to screen sizes                                                     | Web: responsive sidebar (hidden md:flex), mobile hamburger (03-03). Requires VERIFICATION.md to close.                                                  |
| DASH-03 | Dashboard demonstrates layout density (not empty states)                                            | Web: 2-col layout with charts confirmed by audit. Requires VERIFICATION.md to close.                                                                    |
| SET-01  | User can view their profile information                                                             | Web: profile/page.tsx shows Supabase user data. Requires VERIFICATION.md to close.                                                                      |
| SET-02  | User can update their profile                                                                       | Web: ProfileForm with react-hook-form + zod wired to supabase.auth.updateUser. Requires VERIFICATION.md to close.                                       |
| SET-03  | User can access basic business settings                                                             | Web: business/page.tsx — upgraded from placeholder to functional form in Phase 6 (06-03). Requires VERIFICATION.md to close.                            |
| SET-04  | Settings page is navigable from drawer/sidebar                                                      | Web: Settings in sidebar routes config + UserMenu links to /settings. Requires VERIFICATION.md to close.                                                |
| MONO-07 | Web app (apps/web) builds and runs                                                                  | Web: Next.js 14 app confirmed buildable. pnpm build must pass as evidence.                                                                              |
| DOC-03  | README covers running all apps (mobile, web, backend)                                               | README.md has `pnpm dev --filter=@objetiva/mobile`, web, and backend commands — needs spot verification.                                                |
| NAV-04  | Navigation is consistent and NOT context-dependent across platforms                                 | Cross-platform: web sidebar always visible; mobile BottomTabs + DrawerNav always visible. Both must be confirmed.                                       |
| NAV-05  | Layout includes header with app name and user menu                                                  | Cross-platform: web Header component; mobile AppHeader confirmed. Both must be confirmed.                                                               |
| NAV-06  | Layout includes content area that adapts to navigation                                              | Cross-platform: web flex layout with sidebar; mobile pb-20 padding for BottomTabs. Both must be confirmed.                                              |
| NAV-07  | All sections navigable (Dashboard, Articles, Purchases, Sales, Orders, Inventory, Settings)         | Cross-platform: web 7-route config; mobile SplashGate with 8 routes (7 sections + profile). Both must be confirmed.                                     |
| UI-04   | Mobile and web feel cohesive despite platform-specific implementations                              | Cross-platform: shared CSS variable design tokens (confirmed by 04-01-SUMMARY listing UI-04). Both must be confirmed.                                   |
| NAV-01  | Mobile app displays bottom tabs for primary sections (Dashboard, Articles, Orders, Inventory)       | Mobile: BottomTabs.tsx with 4 tabs confirmed. Requires VERIFICATION.md to close.                                                                        |
| NAV-02  | Mobile app displays drawer navigation from header for secondary actions (Profile, Settings, Logout) | Mobile: DrawerNav.tsx confirmed with 4 items. Requires VERIFICATION.md to close.                                                                        |
| MONO-05 | Mobile app (apps/mobile) builds and runs in browser                                                 | Mobile: Capacitor build to dist/ confirmed in 04-01-SUMMARY. Build check for evidence.                                                                  |
| MONO-06 | Mobile app can be built for iOS/Android via Capacitor                                               | Mobile: capacitor.config.ts present, @capacitor/ios and @capacitor/android installed. Code inspection sufficient.                                       |

</phase_requirements>

---

## Summary

Phase 8 is a documentation and data-integrity phase, not a feature-building phase. The core work is writing two VERIFICATION.md files (Phase 3 and Phase 4), fixing roadmap checkbox/status inconsistencies, and updating 26 requirements from Pending/unchecked to Complete/checked in REQUIREMENTS.md. The code for virtually all 23 requirements was built and confirmed working — the gap is that no formal verification document was produced when those phases executed.

The audit (v1.0-MILESTONE-AUDIT.md) provides pre-done integration checking for most requirements. AUTH-03 was resolved in Phase 7 (deny-by-default middleware). DASH-01 and DASH-02 were resolved in Phase 7 (purchases KPI + type alignment). The VERIFICATION.md files just need to be written based on code inspection evidence gathered now, using the established format from Phases 5, 6, and 7.

Roadmap inconsistency: Phase 3 shows 8 unchecked plans `[ ]` and "In Progress (0/8)" despite all 8 SUMMARY.md files existing and confirming completion. This will be fixed as a gate step after VERIFICATION.md confirms requirements pass. Phase 4 plans are already marked [x] in ROADMAP.md — only the verification report is needed.

**Primary recommendation:** Write Phase 3 VERIFICATION.md first (17 requirements, more complex), then Phase 4 (9 requirements, simpler), then update ROADMAP.md and REQUIREMENTS.md in a single pass once both verifications are done.

---

## Standard Stack

This phase uses no new libraries. All tools are already installed.

### Core

| Tool        | Version | Purpose                                | Why Standard        |
| ----------- | ------- | -------------------------------------- | ------------------- |
| pnpm        | 9.x     | Build verification command             | Already in monorepo |
| TypeScript  | 5.x     | Type check for MONO-07 evidence        | Already configured  |
| Bash / grep | system  | Code inspection for evidence gathering | Standard tool       |

### Supporting

| Asset                        | Location                                | Purpose                                                    |
| ---------------------------- | --------------------------------------- | ---------------------------------------------------------- |
| Existing VERIFICATION.md     | Phases 5, 6, 7                          | Template for format and structure                          |
| Phase 3 SUMMARY.md files (8) | .planning/phases/03-web-application/    | Evidence source for plan reconciliation                    |
| Phase 4 SUMMARY.md files (4) | .planning/phases/04-mobile-application/ | Evidence source for Phase 4 verification                   |
| v1.0-MILESTONE-AUDIT.md      | .planning/                              | Pre-computed integration check results to cite as evidence |

**No installation needed.** This phase produces only Markdown documents and code fixes.

---

## Architecture Patterns

### Established Verification Report Format

Every VERIFICATION.md in this project follows a consistent structure learned from Phases 5, 6, and 7.

**Frontmatter:**

```yaml
---
phase: 03-web-application
verified: 2026-03-02T<time>Z
status: passed
score: X/Y success criteria verified
re_verification: false
---
```

**Document sections (in order):**

1. Header with phase goal, verified date, status
2. `## Goal Achievement` with Observable Truths table
3. Required Artifacts table
4. Key Link Verification table (for complex wiring)
5. Requirements Coverage table
6. Anti-Patterns Found table
7. Human Verification Required (where code inspection is insufficient)
8. Summary paragraph

**Observable Truths table format:**

```markdown
| #   | Truth               | Status                  | Evidence                                 |
| --- | ------------------- | ----------------------- | ---------------------------------------- |
| 1   | [what must be true] | VERIFIED/FAILED/PARTIAL | [specific file, line, or command output] |
```

**Status values:**

- `VERIFIED` — evidence found in code or build output
- `FAILED` — feature was not built or is broken
- `PARTIAL` — partially implemented, has gap
- `N/A` — not applicable to this phase

### Phase 3 Observable Truths (17 requirements → mapped from ROADMAP.md success criteria)

The 10 success criteria from ROADMAP.md Phase 3 map to 17 requirements. Use ROADMAP.md Phase 3 success criteria as the Observable Truths list, then expand to individual requirements in the Requirements Coverage table.

**Phase 3 ROADMAP.md success criteria (the Observable Truths):**

1. User can sign up with email/password and receives confirmation
2. User can log in and session persists across browser refresh
3. User can log out from any page and is redirected to login
4. Web app displays sidebar navigation with all sections always visible
5. All sections are navigable (Dashboard, Articles, Purchases, Sales, Orders, Inventory, Settings)
6. Dashboard displays key metrics from backend endpoint in dense, admin-oriented layout
7. Each section displays realistic operational data fetched from backend API
8. UI follows shadcn aesthetic with dark theme working correctly
9. User can view and update their profile from Settings
10. Layout is responsive and adapts to desktop, tablet, and mobile screen sizes

**Phase 4 ROADMAP.md success criteria (the Observable Truths):**

1. User can log in with email/password on mobile and session persists across app restarts
2. Mobile app displays bottom tabs for primary sections (Dashboard, Articles, Orders, Inventory)
3. Mobile app displays drawer navigation from header for secondary actions (Profile, Settings, Logout)
4. Navigation is consistent and NOT context-dependent (tabs/drawer always visible)
5. All sections display same operational data as web but with mobile-optimized UI
6. Mobile app builds and runs in browser for development
7. Mobile app can be built for iOS and Android via Capacitor
8. App feels cohesive with web despite platform-specific UI implementations

### Evidence Gathering Strategy

For each requirement, locate specific file + line or command output as evidence:

| Requirement Type                   | Evidence Approach                                                       |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Auth flow (AUTH-01, 02, 04)        | Grep for supabase method calls in the auth page files                   |
| Navigation (NAV-01 through NAV-07) | Component file existence + route config inspection                      |
| UI/styling (UI-01, 02, 03, 04)     | CSS variable declarations, darkMode config, Tailwind responsive classes |
| Build (MONO-05, 07)                | `pnpm build --filter=@objetiva/web` and mobile build output             |
| Settings (SET-01 through SET-04)   | Page file existence + Supabase updateUser usage                         |
| Dashboard density (DASH-03)        | Check for KPI cards, charts, or data display components                 |
| Documentation (DOC-03)             | Grep README.md for mobile/web/backend run commands                      |

### Roadmap Update Pattern

After VERIFICATION.md is written and passes:

1. Change `[ ] 03-XX-PLAN.md` to `[x] 03-XX-PLAN.md` for all 8 Phase 3 plans
2. Change Phase 3 status from `In Progress` / `0/8` to `Complete (2026-01-26)` / `8/8`
3. Change `[ ] **Phase 3: Web Application**` to `[x] **Phase 3: Web Application**`

Phase 4 plans are already `[x]` — only confirm Phase 4 status row is `Complete (2026-03-02)`.

### Requirements Update Pattern

For all 23 requirements (26 in REQUIREMENTS.md, minus AUTH-03/DASH-01/DASH-02 already Complete):

1. Change `- [ ] **REQ-ID**:` to `- [x] **REQ-ID**:` in the top checkbox section
2. Change `| REQ-ID | ... | Pending |` to `| REQ-ID | ... | Complete |` in the traceability table

Both changes must happen in REQUIREMENTS.md — they are currently inconsistent (some top-level checkboxes unchecked, traceability says "Pending").

---

## Don't Hand-Roll

| Problem                      | Don't Build         | Use Instead                                        | Why                                                                                                |
| ---------------------------- | ------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Evidence for UI requirements | Custom test runner  | Code inspection via grep/file read                 | UI-01, UI-02, UI-03, UI-04 are assessed by presence of correct patterns in code, not runtime tests |
| Phase VERIFICATION.md format | Novel format        | Copy existing 07-VERIFICATION.md structure exactly | Consistency with all other phases; planner and humans recognize the format                         |
| Requirements traceability    | New table structure | Extend existing REQUIREMENTS.md tables exactly     | Same column structure, same status values ("Complete") as AUTH-03, API-\* rows                     |

**Key insight:** This is entirely documentation work. The right approach is to inspect code, cite specific files/lines as evidence, and write structured reports. No tooling beyond grep/read is needed.

---

## Common Pitfalls

### Pitfall 1: Treating AUTH-03 as Pending

**What goes wrong:** AUTH-03 (session persists across refresh) appears as "Pending" in REQUIREMENTS.md, but it was verified in Phase 7 (07-VERIFICATION.md) and marked Complete in the traceability table. This is already resolved.
**Why it happens:** The traceability table says `Complete` for AUTH-03 but the top-level checkbox is still `[ ]` unchecked. This inconsistency was pre-existing.
**How to avoid:** Trust the traceability table for AUTH-03 — it says Complete. Only update the top checkbox to `[x]` for AUTH-03. Do NOT re-verify it in Phase 3 VERIFICATION.md since Phase 7 already owns it.
**Warning signs:** If treating AUTH-03 as requiring new verification evidence.

### Pitfall 2: DASH-01 and DASH-02 Already Resolved

**What goes wrong:** DASH-01 and DASH-02 show as "Pending" in the top-level checkbox section of REQUIREMENTS.md. But they were verified in Phase 7 (07-VERIFICATION.md says SATISFIED for both), and the traceability table already shows Complete.
**Why it happens:** Same pre-existing inconsistency — top checkbox not updated when traceability was set to Complete.
**How to avoid:** Update top checkboxes for DASH-01 and DASH-02 to `[x]` since traceability already says Complete. They are NOT in the Phase 8 requirements list.
**Warning signs:** Trying to verify DASH-01/DASH-02 in Phase 3 VERIFICATION.md — instead cite Phase 7.

### Pitfall 3: Phase 3 Has 8 SUMMARY.md Files But No Obvious "Verification Complete" Marker

**What goes wrong:** Assuming plans are not done because ROADMAP.md shows `[ ]` checkboxes. All 8 plans were executed — the checkboxes were never updated.
**Why it happens:** The roadmap data inconsistency is what Phase 8 exists to fix. The SUMMARY.md files are the authoritative record of what was built.
**How to avoid:** Read the SUMMARY.md files to confirm what was built. Use them as the basis for VERIFICATION.md evidence, then update ROADMAP.md after.
**Warning signs:** Skipping SUMMARY.md evidence and treating plans as unexecuted.

### Pitfall 4: SET-03 (Business Settings) Changed in Phase 6

**What goes wrong:** Reporting SET-03 as a "placeholder page" based on Phase 3 context. Phase 6 upgraded the business settings page to a functional form with Supabase user_metadata persistence (confirmed in 06-VERIFICATION.md truth #17, #18).
**Why it happens:** SET-03 is claimed by Phase 3 but the functional implementation happened in Phase 6.
**How to avoid:** Evidence for SET-03 should point to apps/web/src/components/settings/business-form.tsx (created in Phase 6). In Phase 3 VERIFICATION.md, note that "Business settings form upgraded to functional form in Phase 6 (06-03)."
**Warning signs:** Citing the original Phase 3 business/page.tsx placeholder as the only evidence for SET-03.

### Pitfall 5: NAV-07 Mobile App Has 8 Routes (Not 7)

**What goes wrong:** NAV-07 says "all 7 sections navigable" — assuming mobile only has 7 routes. Mobile SplashGate has 8: Dashboard, Articles, Orders, Inventory, Sales, Purchases, Profile, Settings. Profile is a mobile-specific secondary section (not in the 7 operational sections).
**Why it happens:** The 7 sections in NAV-07 = Dashboard, Articles, Purchases, Sales, Orders, Inventory, Settings. Mobile also adds Profile as an 8th route. Both web and mobile satisfy NAV-07 (Settings is included).
**How to avoid:** Verify all 7 required sections are navigable on both platforms. Mobile having an additional Profile route is fine.
**Warning signs:** Counting mobile routes and finding 8, then flagging as NAV-07 issue.

### Pitfall 6: MONO-06 Evidence (iOS/Android via Capacitor)

**What goes wrong:** Trying to actually build for iOS/Android as evidence. MONO-06 says the mobile "can be built" via Capacitor, not that a native build must be produced.
**Why it happens:** MONO-06 is about capability, not actuality. Native platform builds require macOS (iOS) or Android Studio — not available in this environment.
**How to avoid:** Evidence = capacitor.config.ts exists + @capacitor/ios + @capacitor/android packages installed (devDeps). This is the same standard used in 04-01-SUMMARY's self-check.
**Warning signs:** Attempting `npx cap add ios` or similar build commands.

### Pitfall 7: Phase 3 Missing from REQUIREMENTS.md DOC-03 Evidence

**What goes wrong:** README.md covers mobile commands (`pnpm dev --filter=@objetiva/mobile`) but they appear only in a consolidated "Running Individual Apps" section, not in a dedicated mobile section.
**Why it happens:** The README was updated in Phase 3 (03-08-SUMMARY) for web documentation. Mobile was documented later or in a different section.
**How to avoid:** Grep README.md for mobile, web, and backend run commands. If the README covers all three apps with runnable commands, DOC-03 is satisfied. If mobile is missing, add it (small, non-breaking fix).
**Warning signs:** Finding web and backend commands but missing mobile commands in README.

---

## Code Examples

### Observable Truth with File Evidence (Pattern from Phase 7)

```markdown
| #   | Truth                                | Status   | Evidence                                                                                    |
| --- | ------------------------------------ | -------- | ------------------------------------------------------------------------------------------- |
| 1   | User can sign up with email/password | VERIFIED | `apps/web/src/app/(auth)/signup/page.tsx` calls `supabase.auth.signUp({ email, password })` |
| 2   | Web sidebar displays all 7 sections  | VERIFIED | `apps/web/src/config/navigation.ts` exports 7 routes; sidebar.tsx maps over routes          |
```

### Required Artifacts Table Pattern

```markdown
| Artifact                                     | Expected                             | Status   | Details                                                        |
| -------------------------------------------- | ------------------------------------ | -------- | -------------------------------------------------------------- |
| `apps/web/src/app/(auth)/login/page.tsx`     | Login form with Supabase auth        | VERIFIED | File exists; calls supabase.auth.signInWithPassword            |
| `apps/web/src/app/(auth)/signup/page.tsx`    | Signup form with Supabase auth       | VERIFIED | File exists; calls supabase.auth.signUp                        |
| `apps/web/src/components/layout/sidebar.tsx` | Responsive sidebar with all sections | VERIFIED | 7 routes from navigation.ts; responsive hidden md:flex classes |
```

### Requirements Closure Entry Pattern

```markdown
| Requirement | Source Plan  | Description                            | Status    | Evidence                                                                   |
| ----------- | ------------ | -------------------------------------- | --------- | -------------------------------------------------------------------------- |
| AUTH-01     | 03-02        | Sign up with email/password            | SATISFIED | signup/page.tsx wired to supabase.auth.signUp                              |
| NAV-04      | 03-03, 04-02 | Consistent navigation across platforms | SATISFIED | Web: sidebar always visible; Mobile: BottomTabs + DrawerNav always visible |
```

### REQUIREMENTS.md Update Pattern

```markdown
# Before:

- [ ] **AUTH-01**: User can sign up with email and password via Supabase Auth

# After:

- [x] **AUTH-01**: User can sign up with email and password via Supabase Auth
```

```markdown
# Traceability before:

| AUTH-01 | Phase 3, Phase 8 | Pending |

# Traceability after:

| AUTH-01 | Phase 3, Phase 8 | Complete |
```

---

## State of the Art

| Old Approach                                 | Current Approach                            | When Changed    | Impact                                                           |
| -------------------------------------------- | ------------------------------------------- | --------------- | ---------------------------------------------------------------- |
| Phase 3 middleware only protected /dashboard | Deny-by-default middleware (!isPublicRoute) | Phase 7 (07-02) | AUTH-03 and AUTH-04 now fully satisfied — all routes protected   |
| Phase 3 business settings was a placeholder  | Functional form with Supabase user_metadata | Phase 6 (06-03) | SET-03 is fully satisfied — evidence points to business-form.tsx |
| DashboardResponse missing purchases field    | All 5 KPIs including purchases              | Phase 7 (07-02) | DASH-01, DASH-02 already verified in Phase 7 VERIFICATION.md     |
| Phase 3 plans marked [ ] in ROADMAP.md       | Should be [x] after verification            | This phase      | Roadmap data integrity restored                                  |

---

## Current Evidence Inventory

The audit pre-computed integration checks for most requirements. This table shows the current state of evidence and what needs to be gathered or fixed:

### Phase 3 Requirements — Evidence Status

| Req ID  | Code Exists?             | Fix Needed?             | Evidence Source                                   |
| ------- | ------------------------ | ----------------------- | ------------------------------------------------- |
| AUTH-01 | Yes (03-02-SUMMARY)      | None                    | signup/page.tsx → supabase.auth.signUp            |
| AUTH-02 | Yes (03-02-SUMMARY)      | None                    | login/page.tsx → supabase.auth.signInWithPassword |
| AUTH-04 | Yes (03-03-SUMMARY)      | None                    | user-menu.tsx → supabase.auth.signOut             |
| NAV-03  | Yes (03-03-SUMMARY)      | None                    | sidebar.tsx with 7 routes                         |
| UI-01   | Yes (03-01-SUMMARY)      | None                    | shadcn/ui components in src/components/ui/        |
| UI-02   | Yes (03-01-SUMMARY)      | None                    | next-themes + CSS variables in globals.css        |
| UI-03   | Yes (03-03-SUMMARY)      | None                    | responsive classes in layout (hidden md:flex)     |
| DASH-03 | Yes (audit confirms)     | None                    | stats-cards.tsx + chart components                |
| SET-01  | Yes (03-08-SUMMARY)      | None                    | settings/profile/page.tsx shows user data         |
| SET-02  | Yes (03-08-SUMMARY)      | None                    | profile-form.tsx → supabase.auth.updateUser       |
| SET-03  | Yes, upgraded in Phase 6 | None (Phase 6 built it) | business-form.tsx (Phase 6 artifact)              |
| SET-04  | Yes (03-03-SUMMARY)      | None                    | Settings in navigation.ts + UserMenu links        |
| MONO-07 | Yes (audit confirms)     | Verify build            | pnpm build --filter=@objetiva/web                 |
| DOC-03  | Likely (03-08-SUMMARY)   | Verify README           | README.md mobile/web/backend run commands         |

### Phase 4 Requirements — Evidence Status

| Req ID  | Code Exists?        | Fix Needed?       | Evidence Source                                                     |
| ------- | ------------------- | ----------------- | ------------------------------------------------------------------- |
| NAV-01  | Yes (04-02-SUMMARY) | None              | BottomTabs.tsx with 4 tabs (Dashboard, Articles, Orders, Inventory) |
| NAV-02  | Yes (04-02-SUMMARY) | None              | DrawerNav.tsx with Profile, Settings, Logout                        |
| MONO-05 | Yes (04-01-SUMMARY) | Verify build runs | `pnpm dev --filter=@objetiva/mobile`                                |
| MONO-06 | Yes (04-01-SUMMARY) | None (code-only)  | capacitor.config.ts + @capacitor packages installed                 |

### Cross-Platform Requirements — Both Must Pass

| Req ID | Web Evidence                                | Mobile Evidence                               |
| ------ | ------------------------------------------- | --------------------------------------------- |
| NAV-04 | Sidebar always visible (md:flex)            | BottomTabs + DrawerNav always visible         |
| NAV-05 | Header component in layout                  | AppHeader.tsx in AppShell                     |
| NAV-06 | flex layout with sidebar offsetting content | AppShell with pb-20 for BottomTabs            |
| NAV-07 | 7 routes in navigation.ts                   | 8 routes in SplashGate (7 sections + profile) |
| UI-04  | CSS variable design tokens                  | Same CSS variable system in index.css         |

---

## Open Questions

1. **DOC-03 Mobile Commands Completeness**
   - What we know: README has `pnpm dev --filter=@objetiva/mobile` in a dev commands section
   - What's unclear: Whether mobile section has enough context (env vars, Capacitor notes) to qualify
   - Recommendation: Grep README for mobile-specific running instructions; if only a one-liner command exists with no Capacitor context, add a brief mobile section (small fix, not refactoring)

2. **Phase 3 Build Verification Environment**
   - What we know: pnpm build must pass as evidence for MONO-07; apps/backend/src/main.ts is Modified per git status
   - What's unclear: Whether the modified main.ts (from gitStatus) breaks the backend build (though Phase 3 VERIFICATION.md is for the web app build, not backend)
   - Recommendation: Run `pnpm build --filter=@objetiva/web` only; backend build is not required for MONO-07

3. **Phase 4 Build Check Practicality**
   - What we know: Context.md gives Claude discretion on mobile build check
   - What's unclear: Whether `pnpm build --filter=@objetiva/mobile` completes without external services
   - Recommendation: Use code-inspection-only for MONO-06; for MONO-05 ("builds and runs in browser"), cite 04-01-SUMMARY which confirms Capacitor build produces dist/ with 138 modules

---

## Execution Order Recommendation

**Wave 1 (Research/Evidence gathering):**

- Read key Phase 3 and Phase 4 code files to gather specific file+line evidence for each requirement
- Run pnpm build --filter=@objetiva/web to confirm MONO-07 passes
- Verify README.md coverage for DOC-03

**Wave 2 (Write documents):**

- Write .planning/phases/03-web-application/03-VERIFICATION.md
- Write .planning/phases/04-mobile-application/04-VERIFICATION.md

**Wave 3 (Update data files):**

- Update ROADMAP.md: Phase 3 plan checkboxes [x], status "Complete", Phase 3 header checkbox [x]
- Update REQUIREMENTS.md: 23 top-level checkboxes [x] + 23 traceability rows → Complete
  - Note: AUTH-03, DASH-01, DASH-02 top checkboxes also need updating (already Complete in traceability but checkbox still [ ])

---

## Sources

### Primary (HIGH confidence)

- `.planning/v1.0-MILESTONE-AUDIT.md` — Pre-computed integration checks for all 26 requirements; verified code existence for each
- `.planning/phases/07-fix-integration-bugs/07-VERIFICATION.md` — Authoritative verification of AUTH-03, DASH-01, DASH-02; format template
- `.planning/phases/06-polish-production/06-VERIFICATION.md` — Format template; confirms SET-03 functional implementation in Phase 6
- `.planning/phases/05-database-integration/05-VERIFICATION.md` — Format template
- `.planning/phases/03-web-application/03-08-SUMMARY.md` — Confirms Phase 3 human verification passed
- `.planning/phases/04-mobile-application/04-04-SUMMARY.md` — Confirms Phase 4 E2E 74/74 checks passed
- `.planning/ROADMAP.md` — Phase 3 and 4 success criteria (Observable Truths list source)
- `.planning/REQUIREMENTS.md` — 26 Pending requirements to close

### Secondary (MEDIUM confidence)

- All Phase 3 SUMMARY.md files (03-01 through 03-08) — Execution records confirming what was built per plan
- All Phase 4 SUMMARY.md files (04-01 through 04-04) — Execution records confirming what was built per plan
- `.planning/STATE.md` — Historical decisions log confirming key technical choices

---

## Metadata

**Confidence breakdown:**

- Evidence inventory: HIGH — audit pre-computed integration checks; SUMMARY files confirm execution
- Report format: HIGH — copying established format from Phases 5, 6, 7
- Requirements closure: HIGH — list of 23 items is definitive from REQUIREMENTS.md
- Roadmap update: HIGH — simple checkbox update after verification
- Potential fixes needed: MEDIUM — DOC-03 mobile coverage may need small addition; uncertain without reading full README

**Research date:** 2026-03-02
**Valid until:** Stable indefinitely (documentation phase, no external library changes)
