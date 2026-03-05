# Concept: Split Skull — The Amygdala Within

![Skull Closed](media/2026-03-05T03-22-52_imagen4_a-realistic-human-skull-split-along-the.jpg)

![Skull Open — The Amygdala](media/2026-03-05T03-23-05_imagen4_human-skull-split-open-into-two-halves-r.jpg)

## 3D Model Preview

[▶ skull-3d-preview.mp4](media/2026-03-05T03-24-35_trellis_20260305T032252imagen4arealistic_color_video.mp4)

**Project:** Desk Object / Conversation Piece / Anatomical Art
**Design Approach:** Mechanical puzzle + biological metaphor
**Target:** 3D-printed showpiece with hidden interior reveal

---

## Design Vision

A **human skull split precisely along the sagittal plane** — crown to jaw — into two interlocking halves. When closed, it reads as a complete, strikingly realistic skull. When opened, the halves peel apart to reveal a **smooth sphere suspended inside the cranial cavity**: the amygdala — the brain's fear and emotion center — rendered as a single glowing orb, isolated and exposed.

The skull exterior is richly detailed: orbital ridges, temporal lines, zygomatic arches, nasal bones, and dental arcade. The interior surprises: instead of a brain, there is only emptiness and this single sphere — as if the amygdala were the only thing that ever lived inside.

It is a philosophical object. *Fear is what we keep hidden. Open the skull and there it is.*

---

## Key Visual Features

### Skull Exterior

- Anatomically proportioned human skull (adult, ~150mm tall, ~120mm wide)
- Sagittal split runs crown-to-jaw through the center, bisecting the forehead, nasal bridge, and jaw
- Rich surface relief: supraorbital ridges, temporal lines, coronal and sagittal suture lines etched into bone
- Orbital cavities with recessed depth (dark hollow effect)
- Zygomatic arch and mastoid process articulated at correct anatomy
- Weathered bone texture — micro-pitting and hairline cracks catch light dramatically
- Upper jaw (maxilla) + lower jaw (mandible) sculpted but fused to each half — no separate moving jaw

### Split Mechanism

- **Interlocking tongue-and-groove joint** running the full sagittal seam — the halves click together and hold closed magnetically
- Two micro-magnet recesses embedded in the forehead and jaw regions of each half (press-fit magnet pockets)
- Seam is deliberately visible but precise — when closed the gap reads as a natural cranial suture
- Halves are **mirror images** — each half contains exactly one eye socket, one ear canal opening, half the nose, half the teeth

### The Amygdala — Interior Sphere

- A **smooth sphere, 30mm diameter**, resting in a cradle formed by the interior surfaces of both halves
- The cradle recesses are hemispherical depressions — when closed, the sphere is perfectly caged, rattles slightly (tactile satisfaction)
- Sphere printed separately in a **contrasting material/color** — glossy white or translucent resin against the skull's grey-bone exterior
- Sphere surface can optionally carry subtle almond-shaped bas-relief (amygdala means "almond" in Greek)
- When the skull is closed, the sphere is invisible and silent; when opened, it is the only thing your eye goes to

### Base (Optional)

- Minimal circular plinth, 20mm tall, with a recessed channel that holds one half upright for display in "open" mode
- Base surface etched: "ἀμυγδαλή" (ancient Greek: amygdala) in serif capitals

---

## Material & Finish Vision

| Option | Skull Halves | Amygdala Sphere | Look |
| -------- | ------------- | ----------------- | ------ |
| **Resin SLA** | Matte grey primer + dry-brush bone | Gloss white | Maximum anatomy detail |
| **PLA+ (FDM)** | Grey or bone-white filament | Contrasting black | Accessible home print |
| **Multi-material FDM** | Bone exterior, dark interior cavity | Filament-swap sphere | Single-print challenge |
| **PA12 Nylon SLS** | Natural white, light sanding | Polished orb | Professional finish |

**Recommended:** Resin SLA for each piece separately — skull halves in matte bone grey, sphere in high-gloss white or pearl resin. The contrast between matte bone and the glossy orb makes the reveal visceral.

---

## Dimensions

| Parameter | Value |
| ----------- | ------- |
| Skull height (crown to chin) | 150mm |
| Skull width (temporal to temporal) | 120mm |
| Skull depth (front to rear) | 130mm |
| Each half width | ~62mm |
| Wall thickness (skull shell) | 3–4mm |
| Amygdala sphere diameter | 30mm |
| Sphere cradle recess depth | 15mm |
| Magnet pocket diameter | 6mm ×2 per half |
| Base diameter | 80mm |
| Base height | 20mm |

---

## Generation Strategy

### Step 1 — Reference Images (generate-image.js)

```bash
# Closed skull — full beauty shot
node generate-image.js "a realistic human skull split along the sagittal plane, two interlocking halves, detailed bone texture with suture lines and orbital ridges, closed position showing seamless join, white background, product photography, dramatic studio lighting" --model imagen4

# Open skull — revealing the sphere
node generate-image.js "human skull split open into two halves revealing a single glowing white sphere inside the cranial cavity, representing the amygdala, minimalist interior, dramatic side lighting, white background, ultra-detailed bone texture exterior" --model imagen4

# The sphere alone
node generate-image.js "a single perfect glossy white sphere 30mm diameter, smooth polished surface, soft studio lighting, subtle almond shape relief etching, white background, product photography" --model nanapro

# Interior cavity detail
node generate-image.js "interior of a human skull half, smooth curved inner surface, hemispherical cradle depression for a sphere, detailed bone cross-section texture, dramatic lighting from above" --model nanapro
```

### Step 2 — 3D Model Generation (generate-3d.js)

The skull is too complex for a single AI 3D generation pass. Strategy: generate each component separately and assemble in Blender/Meshmixer.

```bash
# Full skull base mesh (Trellis — highest geometric fidelity)
node generate-3d.js --model trellis --image ./skull-closed-reference.png --stl

# Sphere (simpler — generate or create in slicer directly)
node generate-3d.js --model trellis --image ./sphere-reference.png --stl

# Alternative: Rodin for skull detail
node generate-3d.js --model rodin --image ./skull-closed-reference.png --quality high --material PBR --stl --meshmode Quad
```

### Step 3 — Mesh Post-Processing (Manual — Required)

AI will generate a solid skull. Post-processing in Blender is necessary for the mechanical split:

1. **Shell the skull** — Boolean: subtract inner volume, leave 3–4mm shell
2. **Create the split plane** — Boolean: bisect along symmetry plane (X=0)
3. **Design the tongue-and-groove joint** — Add interlocking tabs (2mm × 4mm, every 20mm along seam)
4. **Add magnet pockets** — 6mm diameter × 3mm deep cylindrical booleans at forehead and jaw
5. **Create sphere cradle** — hemispherical depressions on interior face of each half, 15mm deep, 31mm diameter (1mm clearance)
6. **Scale validation** — measure orbital socket (should be ~35mm wide); scale skull to 150mm height

### Step 4 — Print Quote (generate-3d-print.js)

```bash
# Quote skull halves
node generate-3d-print.js --file ./skull-half-left.stl --service all

# Quote sphere
node generate-3d-print.js --file ./skull-amygdala-sphere.stl --service all
```

---

## Assembly Notes

| Component | Count | Notes |
| ----------- | ------- | ------- |
| Skull half (left) | 1 | Print with interior face down, no supports needed |
| Skull half (right) | 1 | Mirror of left — same file, mirror in slicer |
| Amygdala sphere | 1 | Print separately in contrasting material |
| Neodymium magnets (6×3mm) | 4 | 2 per half — press-fit into recesses with CA glue |
| Display base (optional) | 1 | Half-skull cradle for open-mode display |

Magnet polarity critical: test-fit before gluing so halves attract (not repel).

---

## Design Risks & Mitigations

| Risk | Mitigation |
| ------ | ------------ |
| AI generates solid skull, no interior | Post-process in Blender: Boolean shell |
| Split plane not symmetrical | Use Blender mirror modifier, then bisect at X=0 |
| Tongue-and-groove too tight / too loose | Print test joint segment first (20mm strip) before full print |
| Magnets too strong / too weak | 6×3mm N35 NdFeB is calibrated for palm-sized objects; swap to 4×2mm if needed |
| Sphere rattles audibly when closed | Add 0.5mm felt pad inside cradle recess |
| Skull too large for home printer bed | Scale to 100mm height; most FDM beds handle 120×120mm |
| AI misses anatomical accuracy | Use a real skull reference photo; iterate generate-3d output |

---

## The Deeper Concept

The amygdala processes **fear, emotion, and memory**. It is the oldest part of the mammalian brain — the part we share with animals — buried deep inside, hidden from view.

This object literalizes that metaphor: you hold a skull in your hands, intact and formidable. Then you pull it apart, and you discover that inside all that bone and intimidation, there is only a small, smooth, unremarkable sphere. *The fear lives in a very small space. The skull is mostly empty.*

It functions as:

- A **desk object** — tactile, satisfying to open and close
- A **conversation piece** — "what's that?" from everyone who sees it
- A **gift** — for neuroscientists, psychologists, meditators, anyone who has confronted fear
- A **memento mori** with a twist — not just death, but the biology of being alive

---

## Next Steps

1. Run `generate-image.js` prompts above — build a reference gallery
2. Select best skull reference → `generate-3d.js --model trellis --stl`
3. **Blender post-processing** — shell, split, joint, magnets, cradle (manual step, ~2–3 hours)
4. Print test joint strip to calibrate tolerance
5. Print all components; assemble with magnets
6. Get quote for professional resin print via `generate-3d-print.js --service all`
