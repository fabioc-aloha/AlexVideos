# Project: Alex Command Center UI Icons

**Project:** Alex Cognitive Architecture Extension — Command Center Icon System
**Target:** 38 icon positions, 3+ variants each, SVG-first with PNG concept art
**Destination:** AlexMaster `platforms/vscode-extension/assets/` (replaces 112 PNG avatars)
**Source Research:** `AlexMaster/Alex_Plug_In/alex_docs/research/COMMAND-CENTER-MASTER-PLAN-2026-03-05.md`

---

## Design Vision

Replace the current 112 PNG/WebP avatar system with a unified SVG icon set for the new Command Center UI. The icons encode **cognitive state first, persona second** — this is a philosophical shift from "AI character portraits" to "cognitive partner status indicators."

Every icon must read clearly at 16–24px in the VS Code 300px sidebar, using bold geometric primitives, clean negative space, and indigo-anchored palettes.

---

## Icon Categories (38 positions)

### Tab Bar Icons (5)

| Slug | Label | Container | Color | Brief |
|------|-------|-----------|-------|-------|
| mission | Mission Command | rounded rect | indigo + electric-violet | operational dashboard, status-first home tab |
| agents | Agents | rounded rect | indigo + cool collaborative | specialist agent hub, team coordination |
| skills | Skill Store | rounded rect | indigo + luminous capability | capability catalog, skill browsing |
| mind | Mind | rounded rect | indigo + cerebral silver | cognitive architecture, introspection, health |
| docs | Docs | rounded rect | indigo + crisp editorial | documentation hub, learning bridge |

### Cognitive State Icons (9)

| Slug | Label | Container | Color | Brief |
|------|-------|-----------|-------|-------|
| building | Building | circle | indigo | active implementation, construction |
| debugging | Debugging | circle | red | bug fixing, fault isolation |
| planning | Planning | circle | blue | architecture, sequencing, roadmapping |
| reviewing | Reviewing | circle | teal | quality gate, validation, scrutiny |
| learning | Learning | circle | green | study, understanding, growth |
| teaching | Teaching | circle | amber | explaining, guiding, instruction |
| meditation | Meditation | circle | emerald | calm reflection, centered awareness |
| dream | Dream | circle | violet | maintenance, subconscious synthesis |
| discovery | Discovery | circle | gold | insight, revelation, new patterns |

### Agent Mode Icons (7)

| Slug | Label | Container | Color | Brief |
|------|-------|-----------|-------|-------|
| alex | Alex | hexagon | indigo | orchestrator, central intelligence |
| researcher | Researcher | hexagon | blue | investigation, evidence gathering |
| builder | Builder | hexagon | green | implementation, craftsmanship |
| validator | Validator | hexagon | red | adversarial review, verification |
| documentarian | Documentarian | hexagon | amber | documentation quality, editorial |
| azure | Azure | hexagon | azure blue | cloud platform, infrastructure |
| m365 | M365 | hexagon | orange-red | Microsoft 365, collaboration |

### Persona Category Icons (16)

| Slug | Label | Container | Color | Brief |
|------|-------|-----------|-------|-------|
| software | Software | squircle | indigo | developers, coding, implementation |
| engineering | Engineering | squircle | blue | systems, reliability, technical problem solving |
| science | Science | squircle | teal | researchers, experimentation, inquiry |
| data | Data | squircle | cyan | analysts, measurement, insight |
| design | Design | squircle | purple | product aesthetics, interface craft |
| creative | Creative | squircle | violet | writers, creators, narrative makers |
| documentation | Documentation | squircle | amber | technical writers, document practitioners |
| business | Business | squircle | slate | consultants, knowledge workers, executives |
| finance | Finance | squircle | green | reporting, value measurement |
| product | Product | squircle | orange | product/project managers, entrepreneurs |
| marketing | Marketing | squircle | coral | sales, attention strategy |
| education | Education | squircle | emerald | teachers, students, facilitators |
| healthcare | Healthcare | squircle | red | healthcare professionals, counselors |
| legal | Legal | squircle | gold | lawyers, policy, compliance |
| people | People | squircle | pink | HR, CX leaders, nonprofit |
| career | Career | squircle | sky blue | job seekers, growth, readiness |

### Default Icon (1)

| Slug | Label | Container | Color | Brief |
|------|-------|-----------|-------|-------|
| default | Neutral Fallback | circle | indigo | neutral state, no richer context |

---

## Generation Strategy

### Two-Profile Pipeline

1. **Concept pass** (`fluxico` — Flux ICO): $0.013/image, PNG, fast iteration for variant review
2. **Production pass** (`recraft-svg` — Recraft v4 SVG): $0.08/image, native SVG vector output

### Variant Strategy

- 3 concept variants per position (A, B, C) for review
- Extended variants (up to 10) for complex positions: mind, builder, azure, m365, documentarian
- Total estimated: ~144 SVG assets at production quality

### Prompt Architecture

Each prompt encodes:
- Asset kind (tab icon / state avatar / agent avatar / persona avatar / default avatar)
- Container shape (rounded rect / circle / hexagon / squircle)
- Subject label and semantic role
- Variant concept description
- Color palette direction
- Shared requirements (geometry, size, negative space, no text/logos)

---

## Budget Estimate

| Phase | Items | Model | Cost/Item | Total |
|-------|-------|-------|-----------|-------|
| Concept review | ~144 | fluxico | $0.013 | ~$1.87 |
| Production SVG | ~144 | recraft-svg | $0.08 | ~$11.52 |
| **Total** | | | | **~$13.39** |

---

## Current State

### Already Generated (in AlexMaster)

The initial generation run has already been completed in the Master repo:

- **144 SVG icons** via `recraft-svg` (Recraft v4 SVG) — 143 success, 1 failed
- **PNG concept art** via `fluxico` for tabs + default (subset)
- All saved to `alex_docs/research/mockups/icons/{tabs,states,agents,personas,default}/`
- Generation report: `alex_docs/research/mockups/icons/generation-report.json`

### What This Project Adds

This AlexVideos project provides the **regeneration and refinement pipeline** for:

1. Regenerating failed icons
2. Generating additional variants for positions needing more options
3. A/B testing new concepts against approved selections
4. Refreshing icons when design language evolves
5. Producing implementation-grade final assets after approval

---

## Design Requirements

From the Command Center Design Principles:

- **State over identity**: Avatar color and shape encode cognitive state first, persona second
- **Scarcity forces clarity**: Every element must justify its space at 300px sidebar width
- **Progressive disclosure**: Icons must work at 16px (tab bar), 24px (inline), and 48px (dashboard)
- **Keyboard-first**: Icons are visual affordances, not the primary interaction model
- **Empty states are coaching**: Default/fallback icons should feel welcoming, not empty

### Technical Constraints

- SVG vector output preferred (scales to any size)
- Must read clearly at 16×16px minimum
- Bold, simple geometric primitives only
- No text, letters, numerals, or UI chrome in icons
- No copyrighted logos or trademark replicas
- Clean paths, distinct negative space
- Indigo-anchored color palette (Alex brand color)

---

## File Structure

```
projects/alex-ui-icons/
├── concept.md              ← this file
├── generate-icons.js       ← generation script (2-profile pipeline)
├── media/
│   ├── concept/            ← fluxico PNG concepts
│   │   ├── tabs/
│   │   ├── states/
│   │   ├── agents/
│   │   ├── personas/
│   │   └── default/
│   └── production/         ← recraft-svg final SVGs
│       ├── tabs/
│       ├── states/
│       ├── agents/
│       ├── personas/
│       └── default/
└── generation-report.json  ← run metadata
```

---

## Workflow

1. **Review** existing icons in AlexMaster `mockups/icons/`
2. **Identify** positions needing regeneration or new variants
3. **Run** `node generate-icons.js --profile fluxico --only=<group>` for concept review
4. **Approve** variants → run `node generate-icons.js --profile recraft-svg --only=<group>` for production
5. **Copy** approved SVGs to AlexMaster `platforms/vscode-extension/assets/`
