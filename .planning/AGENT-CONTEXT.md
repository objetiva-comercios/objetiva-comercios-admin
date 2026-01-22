# Agent Context — Technical Tooling

Project-specific MCP servers and agent skills available during development.

**Priority:** This document defines WHAT tools to use.
If there's a conflict with prompts, this document wins.

---

## MCP vs Reasoning Rules

**Use MCP when:**
- Working with external libraries, frameworks, or APIs
- Setting up or bootstrapping projects
- Making decisions with high refactor cost
- There is uncertainty or ambiguity
- Following shadcn / Supabase / Next.js conventions

**Use reasoning when:**
- Implementing business or domain logic
- Designing architecture or module boundaries
- Defining UX, navigation, and layout logic
- Writing internal helpers or utilities
- Solving problems with obvious solutions

**Rule of thumb:**
External truth → MCP
Internal truth → reasoning

---

## MCP Servers

### context7

**Purpose:** Up-to-date documentation, API verification, current best practices

**Use when:**
- Working with external libraries
- Unsure about current APIs
- Avoiding deprecated patterns

---

### shadcn

**Purpose:** shadcn/ui and shadcn-style components

**Use when:**
- Generating UI components
- Designing layouts
- Styling decisions

---

### supabase

**Purpose:** Supabase Auth and client integration

**Use when:**
- Implementing authentication
- Handling sessions
- Backend auth validation

---

### vercel-agent-skills

**Purpose:** Next.js and deployment best practices

**Use when:**
- Structuring Next.js apps
- Env vars, routing, builds
- Production readiness

---

## Evolution

Add new MCPs/skills here as the project grows.
Update "Use when" guidance based on what works.

---
*Last updated: 2026-01-22 after initialization*
