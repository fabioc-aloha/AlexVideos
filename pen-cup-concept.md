# Concept: Recursive Gothic Spire Pen Cup

![Preview](media/2026-03-05T02-44-33_imagen4_a-miniature-Gothic-cathedral-pen-cup-cy.jpg)

**Project:** Desk Pen Cup — Signature Object
**Design Approach:** Architectural grandeur + mathematical intricacy
**Target:** 3D-printed showpiece, functional and conversation-starting

---

## Design Vision

A cylindrical pen cup that looks like a **miniature Gothic cathedral tower**, where the outer walls are composed of **nested recursive arches** — each archway contains a smaller archway inside it, which contains a smaller one still, creating an optical depth illusion that makes the object appear to recede into infinity.

The structure bridges medieval architecture and mathematical art. On a desk, it reads immediately as *something unusual* — the eye keeps finding new details the longer it looks.

---

## Key Visual Features

### Outer Wall — Recursive Arch Grid

- 6–8 vertical arch columns running full height of the cup
- Each arch bay contains 3 levels of nested arches (large → medium → small)
- Between arches: thin ribbed Gothic tracery with geometric infill (trefoil or quatrefoil cutouts)
- The nested recursion creates shadows at different depths — visually alive under any lighting

### Base — Cathedral Foundation Ring

- Wide octagonal plinth base with chamfered edges for stability
- Shallow bas-relief pattern on the base ring: a repeating rose window cross-section
- Slightly flared skirt to prevent tipping when fully loaded with pens

### Rim — Crown Parapet

- Top edge finished as a **battlemented parapet** — alternating merlons and crenels
- Each merlon capped with a miniature pointed finial
- The crown silhouette is instantly recognizable from across a room

### Interior

- Smooth cylindrical interior (no protruding features — pens slide in/out cleanly)
- Interior diameter: ~80mm (holds 12–15 pens comfortably)
- Total height: ~120mm

### Structural Logic (Print-Friendly)

- All arch curves are supported by adjacent structure — no unsupported overhangs >45°
- Wall thickness minimum 2mm at thinnest tracery points
- Base thickness 4mm for flat-surface adhesion during FDM printing
- Designed to print upright, no supports needed inside the cup

---

## Material & Finish Vision

| Option | Look | Best For |
| -------- | ------ | ---------- |
| **Resin SLA** | Ultra-sharp detail, glass-smooth, translucent possible | Maximum visual impact |
| **PLA+ (FDM)** | Solid, matte, excellent layer lines add texture | Home printer, practical |
| **Black PETG** | Dark, architectural, slightly flexible | Desk durability |
| **Metallic PLA** | Bronze or gunmetal — makes it look cast | Premium gift quality |

**Recommended:** Matte black or dark grey resin — the recursive arches read best with high contrast between lit surfaces and deep shadows.

---

## Dimensions

| Parameter | Value |
| ----------- | ------- |
| Interior diameter | 80mm |
| Exterior diameter | ~90mm (5mm walls) |
| Height | 120mm |
| Base plinth height | 12mm |
| Parapet crown height | 10mm |
| Wall thickness (average) | 3mm |
| Tracery minimum thickness | 2mm |

---

## Generation Strategy

### Step 1 — Reference Image (generate-image.js)

Generate multiple reference angles before feeding to the 3D model generator.

```bash
# Front-facing concept render
node generate-image.js "a miniature Gothic cathedral pen cup, cylindrical, recursive nested arches on exterior walls, battlemented crown parapet, octagonal plinth base, white background, product photography, studio lighting, ultra-detailed" --model imagen4

# Side profile
node generate-image.js "Gothic spire pen cup side view, recursive arches, tracery detail, matte black material, white background, architectural product render" --model nanapro

# Top-down showing crown
node generate-image.js "top view of Gothic pen cup, castellated rim with pointed finials, circular opening, white background" --model nanapro
```

### Step 2 — 3D Model Generation (generate-3d.js)

```bash
# Image-to-3D from best reference (Rodin — native STL, best architecture detail)
node generate-3d.js --model rodin --image ./reference-pen-cup.png --quality high --material PBR --stl --meshmode Triangle

# Alternative: Trellis (higher mesh fidelity, per-second billing)
node generate-3d.js --model trellis --image ./reference-pen-cup.png --stl
```

### Step 3 — Mesh Inspection

- Open in **Meshmixer** → Analysis → Inspector → Fix All
- Check interior is hollow (not solid) — may need manual shell in Blender
- Scale to exact dimensions (80mm interior diameter)
- Verify minimum wall thickness ≥ 2mm

### Step 4 — Print Quote (generate-3d-print.js)

```bash
# No-auth Sculpteo quote (BASF industrial printing)
node generate-3d-print.js --file ./pen-cup.stl --service sculpteo --material plastic

# All services comparison
node generate-3d-print.js --file ./pen-cup.stl --service all
```

---

## Design Risks & Mitigations

| Risk | Mitigation |
| ------ | ------------ |
| AI may miss the recursive arch concept | Use multiple reference images; iterate generate-3d with best result |
| Tracery too thin — breaks in FDM | Scale up 10–15% if printing FDM; use resin for full detail |
| Interior not hollow | Post-process in Blender: Boolean subtract inner cylinder |
| Cup tips when loaded | Plinth base design; add infill to base in slicer for weight |

---

## Inspiration References

- **Notre-Dame de Paris** — flying buttress structural logic
- **M.C. Escher recursive architecture** — nested self-similarity
- **Medieval ivory carvings** — intricate openwork in small scale
- **Voronoi lattice structures** — mathematical natural patterns (alternative direction)

---

## Next Steps

1. Run `generate-image.js` with the prompts above — iterate to a satisfying reference
2. Feed best reference image into `generate-3d.js --model rodin --stl`
3. Inspect GLB/STL in Meshmixer or online viewer
4. If geometry needs work — manual cleanup in Blender
5. Get print quote via `generate-3d-print.js --service sculpteo`
6. Print or order
