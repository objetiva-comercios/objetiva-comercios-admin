---
phase: 20
slug: image-upload-backend
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property               | Value                                   |
| ---------------------- | --------------------------------------- |
| **Framework**          | No test framework instalado actualmente |
| **Config file**        | ninguno                                 |
| **Quick run command**  | N/A                                     |
| **Full suite command** | N/A                                     |
| **Estimated runtime**  | N/A                                     |

---

## Sampling Rate

- **After every task commit:** Verificacion manual via curl (no hay test framework)
- **After every plan wave:** Verificacion manual de endpoints
- **Before `/gsd:verify-work`:** Verificacion funcional completa
- **Max feedback latency:** N/A — manual

---

## Per-Task Verification Map

| Task ID  | Plan | Wave | Requirement | Test Type | Automated Command             | File Exists | Status     |
| -------- | ---- | ---- | ----------- | --------- | ----------------------------- | ----------- | ---------- |
| 20-01-XX | 01   | 1    | IMG-03      | manual    | curl POST multipart           | N/A         | ⬜ pending |
| 20-01-XX | 01   | 1    | IMG-03      | manual    | curl DELETE                   | N/A         | ⬜ pending |
| 20-01-XX | 01   | 1    | IMG-03      | manual    | verify WebP output 200x200    | N/A         | ⬜ pending |
| 20-01-XX | 01   | 1    | IMG-03      | manual    | verify WebP output 1000px max | N/A         | ⬜ pending |
| 20-01-XX | 01   | 1    | IMG-03      | manual    | curl invalid MIME → 400       | N/A         | ⬜ pending |
| 20-01-XX | 01   | 1    | IMG-03      | manual    | curl >5MB → 413/400           | N/A         | ⬜ pending |

_Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky_

---

## Wave 0 Requirements

- No hay framework de tests instalado. El proyecto no tiene infraestructura de tests establecida en ninguna fase anterior.
- Verificacion sera manual via curl/Postman durante implementacion.

_Existing manual verification approach covers phase requirements given project context._

---

## Manual-Only Verifications

| Behavior                                  | Requirement | Why Manual        | Test Instructions                                                                           |
| ----------------------------------------- | ----------- | ----------------- | ------------------------------------------------------------------------------------------- |
| Upload JPG/PNG/WebP genera thumb + detail | IMG-03      | No test framework | curl -F "file=@img.jpg" -F "tipo=producto" -F "slot=1" POST /api/articulos/:codigo/imagenes |
| Rechaza MIME invalido                     | IMG-03      | No test framework | curl -F "file=@test.txt" POST → expect 400                                                  |
| Rechaza >5MB                              | IMG-03      | No test framework | curl -F "file=@large.jpg" POST → expect 400/413                                             |
| Delete borra archivos y limpia DB         | IMG-03      | No test framework | DELETE /api/articulos/:codigo/imagenes/:tipo/:slot → verify filesystem + DB                 |
| Thumbnail es 200x200 exacto               | IMG-03      | No test framework | identify -verbose output_thumb.webp → 200x200                                               |
| Detail max 1000px lado largo              | IMG-03      | No test framework | identify -verbose output_detail.webp → <=1000px                                             |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: manual verification after each task
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency: manual
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
