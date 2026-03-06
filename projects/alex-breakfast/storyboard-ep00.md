# Storyboard: Episode 00 — "Before the Fall"

**Series**: Alex Finch: Detective
**Episode**: 00 — Prologue
**Runtime**: ~3:00 – 3:30
**Visual Reference**: `prologue.png` (established character + kitchen style)
**Format**: 26 shots × 4–8 sec → FFmpeg concat assembly

---

## Production Notes

### Tools Used in This Episode

| Phase | Script | Key Flags | Purpose |
|-------|--------|-----------|---------|
| Environment & wide shots | `generate-video.js` | `--model grok` | Kitchens, doors, POV angles, glyph scenes |
| Character close-ups & dialog | `generate-video.js` | `--model hailuo23` | Emotional acting, dialog delivery, micro-expressions |
| Cinematic closing shots | `generate-video.js` | `--model veo3fast` | POV camera push + final wide reveal |
| Title card (Shot 25) | `generate-image.js` | `--model ideoturbo --aspect 16:9` | Static title card image |
| Alex VO narration | `generate-voice.js` | `--model elevenv3` | Narration audio track |
| Background music | `generate-music.js` | `--model music15` | Detective jazz underscore |
| Clip assembly (25 clips → 1) | `ffmpeg-static` (bundled) | `-f concat -safe 0` | Stitch shots in order |
| Lay narration onto video | `generate-edit-video.js` | `--model avmerge` | Single audio track on silent video |
| Blend narration + music | `generate-edit-video.js` | `--model audiomix --music-volume 0.25` | Layer VO over background music |
| Captions (optional) | `generate-edit-video.js` | `--model caption` | Karaoke-style burned subtitles |

### Model Timing Rules

- **`hailuo23`** — accepts **only 6s or 10s**. All character shots use **6s**.
- **`veo3fast`** — accepts **only 4s, 6s, or 8s**. Closing wide uses **8s**.
- **`grok`** — accepts 1–15s freely. Used for all environment/wide shots.

### Character Consistency

**2-pass strategy** — prologue.png is NOT passed as `--image` (that sets the literal first frame).
Instead: Pass 1 generates a unique first-frame image per character shot (imagen4), Pass 2 uses that custom frame as `--image`.
Environment/POV shots use text-to-video (no `--image`).

Character descriptions embedded in every prompt:
Alex (curly auburn hair, green shirt, glyphs), Maya (wavy auburn hair, purple hoodie), kitchen (round table, spice rack, sink window).

### Production Budget

#### Video Generation (Pass 2)

| Model | Shots | Seconds | Rate | Subtotal |
|-------|-------|---------|------|----------|
| grok | 01, 02, 03, 04, 05, 06, 10, 16, 19, 20, 22, 26 | 69s | $0.05/sec | $3.45 |
| hailuo23 | 07, 08, 09, 11, 12, 13, 14, 15, 17, 18, 21 | 66s | ~$0.04/sec* | ~$2.64 |
| veo3fast | 23, 24 | 14s | $0.15/sec | $2.10 |
| **Video subtotal** | **25 shots** | **149s** | | **~$8.19** |

*\*hailuo23 cost is "variable" per Replicate — $0.04/sec is an observed estimate.*

#### First-Frame Images (Pass 1)

| Model | Count | Rate | Subtotal |
|-------|-------|------|----------|
| imagen4 | 17 character frames | $0.04/image | $0.68 |

#### Title Card (Shot 25)

| Model | Count | Rate | Subtotal |
|-------|-------|------|----------|
| ideoturbo | 1 image | $0.03/image | $0.03 |

#### Audio

| Asset | Model | Rate | Subtotal |
|-------|-------|------|----------|
| Narration (~800 chars) | elevenv3 | $0.10/1K chars | ~$0.08 |
| Background music (1 track) | music15 | $0.03/file | $0.03 |

#### Post-Production

| Phase | Model | Rate | Subtotal |
|-------|-------|------|----------|
| Clip assembly | ffmpeg (local) | free | $0.00 |
| Narration merge | avmerge (local) | free | $0.00 |
| Music blend | audiomix (local) | free | $0.00 |
| Captions (optional) | caption | ~$0.07 | $0.07 |

#### Total Budget

| Category | Cost |
|----------|------|
| Video generation | ~$8.19 |
| First-frame images | $0.68 |
| Title card | $0.03 |
| Audio (voice + music) | ~$0.11 |
| Post-production | $0.07 |
| **TOTAL** | **~$9.08** |

*Budget assumes single-take per shot. Retakes (content filter rejections, quality misses) may add 20-50%.*
*Worst-case with retakes: ~$14*

### Style Anchor (append to every prompt)

*"warm golden morning light, cozy cartoon kitchen, American animation style matching reference image, soft Studio Ghibli warmth, Cartoon Network line weight"*

Alex glyph description: *"glowing purple and amber analytical runes orbit the boy's head, organic living-ink quality, warm glow not digital"* — describe in prompt every time.

---

## ACT 1 — THE CATALOG
### *"Four things are wrong with this Tuesday morning."*

---

### SHOT 01 — Kitchen Establishing
**Type**: Wide
**Duration**: 7 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 7 --image prologue.png`

**Visual**: Slow push-in through the kitchen front window. Golden 7 AM light fills the warm kitchen. Round white table center. Alex (13, curly auburn hair, green shirt) sits alone eating cereal, holding a spoon, eyes already scanning the room. Mom (nurse scrubs, bun) pours coffee at the counter. Maya (17, auburn hair, purple hoodie) sits at counter with phone face-down. Plants in window. Spice rack on the right.

**Narration** (VO): *"Four things are wrong with this Tuesday morning."*

**Sound**: Ambient morning — refrigerator hum, distant bird, soft cereal clink.

**Prompt**:
```
Wide establishing shot of a warm cozy cartoon kitchen, 7 AM golden morning light streaming through a window. A 13-year-old boy with curly auburn hair in a green shirt sits at a round white kitchen table eating cereal, eyes alert and scanning the room. An older teenage girl with wavy auburn hair in a purple hoodie sits at the counter with a phone face-down. A woman in nurse scrubs with her hair in a practical bun pours coffee at the counter. Potted plants on windowsill, spice rack on wall. Warm amber light, soft shadows. American animation style, Cartoon Network line weight, Studio Ghibli warmth and detail.
```

---

### SHOT 02 — Alex POV: The Room Scan
**Type**: POV pan
**Duration**: 6 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 6 --image prologue.png`

**Visual**: Alex's perspective slowly swiveling across the kitchen. As his gaze moves, faint purple/amber analytical glyphs begin to drift into frame — soft, organic, slightly glowing. Not a full overlay yet, just the first shimmer of activation.

**Narration** (VO): *"I'm eating cereal at the kitchen table, cataloging changes since yesterday."*

**Sound**: Soft musical hum begins under scene — the activation signature.

**Prompt**:
```
First-person POV shot slowly panning across a warm cartoon kitchen interior. Morning light, potted plants, round white table, counter, spice rack. Faint glowing purple and amber analytical glyphs and runes begin to float at the edges of frame, orbiting softly like living ink. The glow is organic and warm, not digital. Morning atmosphere. Cartoon animation style, Ghibli warmth.
```

---

### SHOT 03 — Anomaly 1: The Spice Rack
**Type**: Medium close on spice rack
**Duration**: 5 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 5 --image prologue.png`

**Visual**: The colorful spice rack in sharp focus. Labels visible — Allspice, Basil, Cinnamon (alphabetical). An amber glyph pulses brightly around the rack. A red "!!" floats up briefly. Then a ghost-image of the old arrangement (Garlic, Paprika, Oregano) flickers beside it as comparison.

**Narration** (VO): *"One: Mom rearranged the spice rack. Alphabetical instead of by frequency of use. Suspicious."*

**Sound**: Soft *ping* on the glyph pulse.

**Prompt**:
```
Close-up on a colorful kitchen spice rack with jars arranged in alphabetical order, labels clearly showing. An animated glowing amber question mark and exclamation glyph pulses brightly around the rack. A faint ghostly duplicate shows the previous ordering floating beside it for comparison. Warm cartoon animation style, soft golden morning light, analytical overlay aesthetic.
```

---

### SHOT 04 — Anomaly 2: Maya's Phone
**Type**: Medium close on counter
**Duration**: 5 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 5 --image prologue.png`

**Visual**: Maya's phone lying face-down on the counter, screen dark. A glowing amber glyph highlights it — a small clock icon floats above showing "7:11 AM." Maya's hands are in frame, fidgeting slightly. She clearly knows the phone is there.

**Narration** (VO): *"Two: Maya's phone is face-down on the counter. Usually glued to her hand. Very suspicious."*

**Sound**: Subtle ticking sound on the clock glyph.

**Prompt**:
```
Close-up on a smartphone lying face-down on a kitchen counter, screen dark. A glowing amber analytical glyph highlights it with a small floating clock showing 7:11 AM. Teenage girl's hands visible at edges of frame, fidgeting. Warm cartoon animation style, morning kitchen lighting, glowing rune overlay aesthetic.
```

---

### SHOT 05 — Anomaly 3: Mail on the Porch
**Type**: Alex at window
**Duration**: 5 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 5 --image prologue.png`

**Visual**: Alex leaning slightly to look out the kitchen window. Through the glass we see the front porch — mail already in the box, 7:15 AM. A cyan glyph with a clock and an envelope floats near the window. Alex's expression: mild but intensifying interest.

**Narration** (VO): *"Three: The mail came early. Mr. Patterson never delivers before 9 AM on Tuesdays. Extremely suspicious."*

**Sound**: Soft *ping*, slightly higher pitch than before.

**Prompt**:
```
A 13-year-old boy with curly auburn hair leans toward a kitchen window looking out. Through the window, a suburban front porch is visible with mail already in the mailbox. A glowing cyan analytical glyph with a clock and envelope icon floats near the window frame. Boy's expression is focused, mild curiosity sharpening into alert attention. Warm American cartoon style, morning light.
```

---

### SHOT 06 — Anomaly 4: The Garage Door Dent
**Type**: Medium — window, then garage
**Duration**: 7 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 7 --image prologue.png`

**Visual**: Alex's gaze moves to the garage door visible through the side window. Slow push through the window toward the garage door exterior — a clean, fist-sized circular dent at five feet high is clearly visible. The amber glyph system fully activates: multiple runes orbit Alex's head, a magnifier glyph zooms in on the dent. The dent is circled in glowing red.

**Narration** (VO): *"Four: There's a new dent in the garage door. Small, fist-sized, about five feet up."*

**Sound**: Activation hum peaks, then a quiet sustained chord — the final anomaly registered.

**Prompt**:
```
Cartoon animation: A 13-year-old boy with curly auburn hair in a green shirt looks through a kitchen window at a garage door outside. The garage door has a clear fist-sized circular dent at five feet high, highlighted with a glowing red circle. Multiple purple and amber analytical glyphs orbit the boy's head fully activated. A magnifying glyph zooms toward the dent. Golden morning light. The analytical overlay aesthetic — organic glowing runes, warm color palette. American animation style.
```

---

## ACT 2 — THE CONFRONTATION
### *"You're doing it again."*

---

### SHOT 07 — Maya Calls It Out
**Type**: Two-shot, Maya and Alex
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Maya at the counter, not looking up from her phone — except she's actually watching Alex in her peripheral vision. One eyebrow raised, slight smirk forming. Alex at the table, glyphs still orbiting slowly.

**Dialog**: Maya: *"You're doing it again."*

**Sound**: The ambient hum drops. Normal kitchen sound returns.

**Prompt**:
```
Two-shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) sitting at a kitchen counter looking at her phone with a knowing smirk, one eyebrow raised, watching a 13-year-old boy (curly auburn hair, green shirt) sitting at a breakfast table in her peripheral vision. The boy has faint glowing purple analytical glyphs orbiting his head. Early morning kitchen, warm light. American animation style, expressive cartoon characters.
```

---

### SHOT 08 — Alex's Squint (The Beat)
**Type**: Medium close on Alex
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Alex stares at Maya. His eyes narrow — just slightly. The classic detective squint. The glyphs pause in their orbit, holding position. He sets his spoon down with quiet deliberateness.

**Dialog**: Alex: *"Doing what?"*

**Sound**: Single spoon-on-bowl clink.

**Prompt**:
```
Medium close-up cartoon animation: 13-year-old boy with curly auburn hair and green shirt sits at a kitchen table, expression neutral but eyes narrowed in a focused detective squint. Analytical glyphs pause mid-orbit around his head. He sets a spoon down on a cereal bowl with quiet deliberateness. Kitchen background, warm morning light. American animation style, expressive character face.
```

---

### SHOT 09 — Maya's Impression
**Type**: Medium on Maya
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Maya puts her phone down and does a full theatrical squint impression — face scrunching, hands waving in arcs around her head, mimicking orbiting glyphs without knowing what they are. She's both mocking and affectionate. This is clearly a thing.

**Dialog**: Maya: *"The detective thing. Squinty-eyes, scanning-the-room, Sherlock Holmes thing. You go all..."* [hands wave] *"Analyzing."*

**Sound**: Light comedic musical sting. Maya's voice has a slightly exaggerated quality.

**Prompt**:
```
Medium shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) theatrically mimicking a detective's intense squint — face scrunched, hands waving in circles around her head in an exaggerated impression. Expression is fond mockery, clearly imitating her younger brother's habit. Kitchen background, warm morning light. American cartoon style, expressive and funny character animation.
```

---

### SHOT 10 — The Phone Timeline
**Type**: Medium on Alex, glyph-active
**Duration**: 6 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 6 --image prologue.png`

**Visual**: Alex responds calmly. As he speaks, a floating timeline appears beside him — a simple animated timeline with entries: "7:11 — face-down / 7:14 — picked up / 7:23 — face-down again." Three colored glyph-dots on a line. His expression is completely matter-of-fact.

**Dialog** (VO narration over): *"Your phone's been on the counter for twelve minutes."*

**Sound**: Three soft ticks as each timestamp appears.

**Prompt**:
```
Medium shot cartoon animation: 13-year-old boy with curly auburn hair in a green shirt speaks calmly at a kitchen table while analytical glyphs form a visible floating timeline beside him — showing timestamps 7:11, 7:14, 7:23 as colored glyph-dots on a glowing timeline. His expression is completely matter-of-fact. American animation style, warm kitchen morning light, organic glow for the glyph overlay.
```

---

### SHOT 11 — Maya's Stare
**Type**: Close on Maya's face
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Maya stares at Alex like he's grown a second head. Then: a genuine smile breaks through the exasperation. She doesn't want to smile. She's smiling anyway.

**Dialog**: Maya: *"You're so weird."*

**Sound**: Her voice is warm under the protest.

**Prompt**:
```
Close-up cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) stares in disbelief at someone off-frame, expression frozen between exasperation and genuine affection. Her eyes go wide then soften. A smile breaks through despite herself. American animation style, expressive cartoon face, warm morning kitchen light in background.
```

---

### SHOT 12 — Alex's Response
**Type**: Close on Alex
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Alex meets her eyes. Just slightly tilts his head. No emotion visible — but there's a tiny flicker at the corner of his mouth.

**Dialog**: Alex: *"I prefer 'observant.'"*

**Sound**: Tiny comedic beat of silence before the next line.

**Prompt**:
```
Close-up cartoon animation: 13-year-old boy with curly auburn hair and green shirt meets eyes with someone off-frame, head tilted slightly, expression neutral with just the faintest hint of a smile at the corner of his mouth. Confident, dry delivery. Faint analytical glyphs visible orbiting softly. American animation style, expressive subtle face.
```

---

### SHOT 13 — Mom's Reveal (The Look)
**Type**: Three-shot
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Mom turns from the counter — scrubs, practical bun, coffee mug in hand. The Look: half-amused, half-exasperated, fully exhausted by love. She faces both kids. Morning authority.

**Dialog**: Mom: *"I'm here now, Detective Finch. In twenty minutes, I won't be. Maya's in charge."*

**Sound**: Mom's voice grounds the scene. The analytical glyphs on Alex dim slightly in Mom's presence.

**Prompt**:
```
Three-shot cartoon animation: woman in nurse's scrubs (early 40s, hair in a practical bun, coffee mug in hand) turns to face two teenagers at a kitchen table and counter. Expression is that specific parent look — simultaneously amused, exasperated, and loving. The 13-year-old boy with curly auburn hair sits at the table, the 17-year-old girl with auburn hair stands at the counter. Morning kitchen, warm light. American animation expressive style.
```

---

### SHOT 14 — The Spice Rack Question
**Type**: Medium on Mom — the falter
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Alex asks about the spice rack. Mom mid-pour of coffee FREEZES for a half-beat. A micro-expression flickers — genuine surprise? Deflection? Her smile tightens just slightly before recovering. This is the acting beat that matters. The glyphs on Alex PULSE.

**Dialog**: Alex: *"What about the spice rack?"* | Mom: *"I reorganized because I couldn't find the cinnamon. No mystery."*

**Sound**: Coffee pour briefly stops. Then resumes. The glyphs pulse with a soft amber tone.

**Prompt**:
```
Medium shot cartoon animation: woman in nurse's scrubs (early 40s, hair in bun, coffee mug in hand) is mid-pour when she freezes for a half-beat — a subtle micro-expression of surprise/deflection flickers across her face before she smooths it into a casual smile. In the background, a 13-year-old boy's glowing analytical glyphs pulse brightly amber. Warm morning kitchen. American animation style, expressive character acting with subtle emotional nuance.
```

---

### SHOT 15 — The Garage Door Question
**Type**: Two-shot, Mom and Alex
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Alex pivots — "And the garage door?" Mom's smile falters again. Genuine this time — she actually didn't notice. Maya gets up and looks.

**Dialog**: Alex: *"And the garage door?"* | Mom: *"What dent?"*

**Sound**: A beat of silence that holds one count longer than comfort.

**Prompt**:
```
Two-shot cartoon animation: 13-year-old boy with curly auburn hair (green shirt, analytical glyphs active) asks a question while a woman in nurse's scrubs reacts — her confident expression falters into genuine puzzlement, the smile tightening. Real surprise, not performance. Cozy morning kitchen, warm light. American animation style with expressive character reactions.
```

---

### SHOT 16 — All Three at the Window
**Type**: Wide — all three characters
**Duration**: 6 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 6 --image prologue.png`

**Visual**: All three lean toward the side kitchen window looking at the garage door outside. Three silhouettes against the morning light window. Alex's glyphs are fully active, circling brightly. Mom and Maya crane to see. The dent is visible through the glass — small but undeniable.

**Sound**: Light ambient quiet. The refrigerator hum. Curiosity without resolution.

**Prompt**:
```
Wide shot cartoon animation: three family members — a woman in nurse's scrubs, a teenage girl in a purple hoodie, and a 13-year-old boy with curly auburn hair — all leaning toward a kitchen window looking out at a garage door with a small circular dent visible through the glass. The boy has glowing analytical glyphs orbiting his head actively. Morning kitchen, warm amber light, three silhouettes against bright window. American animation style.
```

---

## ACT 3 — THE SEND-OFF
### *"Door closes. House settles."*

---

### SHOT 17 — Yellow Police Tape Joke
**Type**: Medium on Mom + Alex
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Mom kisses the top of Alex's head — he doesn't lean in but doesn't avoid it either. She points at him with the mom-finger.

**Dialog**: Mom: *"You're my detective. Grounded if I come home to yellow police tape around the garage."* | Alex: *"I don't have yellow police tape."* | Mom (heading for door): *"Do. Not. Buy. Yellow. Police. Tape. Alex Finch."*

**Sound**: Light comedic music sting on "Alex Finch."

**Prompt**:
```
Medium shot cartoon animation: a woman in nurse's scrubs (early 40s) kisses the top of a 13-year-old boy's curly auburn head at a kitchen table, then points at him with a warning finger as she moves toward the door. The boy's expression is tolerant with a tiny hint of fond. Warm morning kitchen, golden light. American animation style, warm family moment with comedic undertone.
```

---

### SHOT 18 — Maya's Warning
**Type**: Close two-shot, Maya and Alex
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Maya catches Alex's eye. The sarcasm drops completely. Something quieter, more serious. Not scary — just real. She's 17, not a kid. She knows something she's not saying.

**Dialog**: Maya: *"Just don't go investigating anything dangerous, okay? I mean it."*

**Sound**: Music drops to single acoustic guitar note. Held.

**Prompt**:
```
Close two-shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) makes direct eye contact with a 13-year-old boy (curly auburn hair, green shirt). All sarcasm gone from her face — expression quiet, serious, protective. A big sister warning that carries real weight without being dramatic. No glyphs active. Warm kitchen morning light, slightly muted palette. American animation style with emotional nuance.
```

---

### SHOT 19 — The Door Closes
**Type**: Wide — door
**Duration**: 5 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 5 --image prologue.png`

**Visual**: The front door closes. A rectangle of bright morning light narrows and shuts. The house settles into quiet. The sound of the car starting outside, then fading.

**Narration** (VO): *"Door closes. House settles."*

**Sound**: Door latch. Morning sounds briefly louder — birds, breeze — then muffled. Car engine. Silence.

**Prompt**:
```
Wide shot cartoon animation: a front door gently closes, the bright rectangle of morning light narrowing until it shuts. The quiet of an empty hallway settling. Warm interior light contrast against bright exterior glimpsed through the door. American animation style, quiet emotional beat, soft morning palette.
```

---

### SHOT 20 — Maya Returns to Phone, Alex to Cereal
**Type**: Two-shot, kitchen
**Duration**: 5 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 5 --image prologue.png`

**Visual**: Return to the kitchen. Maya back on her phone at the counter. Alex back at the table with his cereal. Both in their positions. But Alex isn't eating. He's staring at the table. His glyphs are dim — just barely there.

**Narration** (VO): *"Maya scrolling. Me finishing cereal. Refrigerator humming off-key."*

**Sound**: Refrigerator hum. Spoon on bowl. Phone screen tap.

**Prompt**:
```
Two-shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) scrolls on her phone at a kitchen counter in the background. 13-year-old boy (curly auburn hair, green shirt) sits at the foreground kitchen table, spoon in hand but not eating, staring at the table surface. Analytical glyphs around him very faint, barely visible. Quiet morningkitchen, warm but slightly melancholy atmosphere. American animation style.
```

---

### SHOT 21 — Alex's Eyes: Not Settled
**Type**: Close on Alex's face
**Duration**: 6 sec
**Model**: `hailuo23`
**Tool**: `generate-video.js --model hailuo23 --duration 6 --image prologue.png`

**Visual**: Close on Alex. He's looking at the table but his eyes are working — moving fractionally, not really *seeing* what's there. His brain is still running. The glyphs pulse just once, softly.

**Narration** (VO): *"But my brain won't settle."*

**Sound**: The activation hum returns, very quiet. A single ambient pulse.

**Prompt**:
```
Close-up cartoon animation: 13-year-old boy with curly auburn hair stares at the table surface, but his eyes are moving subtly — brain still processing, not at rest. A single analytical glyph pulses softly once near his temple. Expression is quiet, unsettled, focused inward. Warm kitchen morning light. American animation style, subtle emotional acting.
```

---

### SHOT 22 — The Glyph Inventory
**Type**: Alex — full glyph overlay
**Duration**: 7 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 7 --image prologue.png`

**Visual**: Alex's full analytical overlay activates one final time — not searching now, *cataloging*. The four anomalies float around him in a ring: spice rack icon, phone icon, envelope icon, garage door icon. Each one pulses in turn.

**Narration** (VO): *"The dent. The spice rack. Early mail."*

**Sound**: Three soft tones — one per anomaly named.

**Prompt**:
```
Medium shot cartoon animation: 13-year-old boy with curly auburn hair (green shirt) sits at a kitchen table with a full analytical overlay active — four glowing glyph icons orbit around him: a spice jar, a smartphone, an envelope, a garage door. Each pulses amber in sequence. Expression contemplative, brain actively working. Warm golden morning light. American animation style with detailed glowing rune overlay aesthetic.
```

---

### SHOT 23 — Window: The Garage Door
**Type**: Alex POV — the window
**Duration**: 6 sec
**Model**: `veo3fast`
**Tool**: `generate-video.js --model veo3fast --duration 6 --image prologue.png`

**Visual**: Alex's gaze moves to the side window. Slow push from Alex's perspective toward the window — through the glass, the garage door in morning light. The dent catches the light. A subtle amber glyph floats at the glass surface, marking the dent like a pin on a map.

**Narration** (VO): *"Probably nothing. Probably coincidence."*

**Sound**: Music undercurrent stirs. A tension note, unresolved.

**Prompt**:
```
First-person point-of-view cartoon animation slowly pushing through a kitchen window toward a garage door outside in soft morning light. A small circular dent on the garage door at five feet high is highlighted by a subtle glowing amber glyph marker. The garage door fills the frame. Morning light. Atmospheric and slightly ominous. American animation style, Ghibli-influenced background detail.
```

---

### SHOT 24 — Voiceover: Detectives and Patterns
**Type**: Wide — Alex alone at table
**Duration**: 8 sec
**Model**: `veo3fast`
**Tool**: `generate-video.js --model veo3fast --duration 8 --image prologue.png`

**Visual**: Pull back wide. Alex alone at the round table. Cereal going soggy. Morning light on his face. The kitchen that was full of family is now just him and his thoughts. The glyphs orbit at idle. His eyes are clear, resolved.

**Narration** (VO): *"Detectives don't believe in coincidence. We believe in patterns."*

**Sound**: A single guitar and piano resolves the tension note into something open-ended — not threatening, not safe. A question.

**Prompt**:
```
Wide establishing cartoon animation: 13-year-old boy with curly auburn hair sits alone at a round white kitchen table in a warm morning kitchen, cereal bowl in front of him, sunlight through the window. The room that was full of family is now quiet and still. Analytical glyphs orbit him slowly, idling. Expression clear, resolved, thinking. Slightly melancholy but confident. American animation style, Studio Ghibli warmth, emotional final beat.
```

---

### SHOT 25 — Title Card
**Type**: Static generated image
**Duration**: 4 sec
**Model**: `ideoturbo`
**Tool**: `generate-image.js --model ideoturbo --aspect 16:9`

**Visual**: Title card in the show's style. Warm golden/amber background with subtle rune patterns. Large serif title: **"ALEX FINCH: DETECTIVE"**. Subtitle: *"Episode 00 — Before the Fall"*. Alex's silhouette with active glyphs as a logo device.

**Prompt**:
```
Title card for a cartoon detective series. Warm amber and deep violet background with subtle glowing analytical runes and equations. Large stylized serif title text: "ALEX FINCH: DETECTIVE". Subtitle: "Episode 00 — Before the Fall". Silhouette of a 13-year-old boy with curly hair surrounded by orbiting glyphs as a central logo. Professional animation title card design. American cartoon aesthetic.
```

---

### SHOT 26 — End Card Freeze Frame
**Type**: Final image
**Duration**: 5 sec
**Model**: `grok`
**Tool**: `generate-video.js --model grok --duration 5 --image prologue.png`

**Visual**: Freeze on Alex at the table, glyphs active, looking toward the garage window. A slight smile — the dangerous kind. He's already decided.

**Narration** (VO): *(silent — let the image breathe)*

**Sound**: Credits music begins — light jazz, detective-flavored. Upbeat enough to promise adventure.

**Prompt**:
```
Cartoon animation still: 13-year-old boy with curly auburn hair in green shirt sits at a kitchen table, turning his gaze toward a window with a slight determined smile. Analytical glyphs orbit his head brightly. Kitchen morning light. The expression of someone who has already made up their mind. Warm confident energy. American animation cartoon style, slightly heroic framing.
```

---

## Timing Reference (Corrected)

```
Shot 01 (7s) → 02 (6s) → 03 (5s) → 04 (5s) → 05 (5s) → 06 (7s)         Act 1:    35s
→ 07 (6s) → 08 (6s) → 09 (6s) → 10 (6s) → 11 (6s) → 12 (6s)            Act 2a:   36s
→ 13 (6s) → 14 (6s) → 15 (6s) → 16 (6s)                                 Act 2b:   24s
→ 17 (6s) → 18 (6s) → 19 (5s) → 20 (5s) → 21 (6s) → 22 (7s)            Act 3:    35s
→ 23 (6s) → 24 (8s) → 25 (4s) → 26 (5s)                                 Closing:  23s
```

**Total video clips**: ~153 seconds ≈ **2:33**
*With narration breath beats and transition pacing: ~3:00*

---

## Production Pipeline

### Phase 1 — Generate Video Clips (Shots 01–24, 26)

Script: **`generate-video.js`** — run from repo root `C:\Development\AlexVideos`

```powershell
$image = ".\projects\alex-breakfast\prologue.png"
$dest  = ".\projects\alex-breakfast\media"

$shots = @(
  @{ n="01"; d=7;  m="grok";     p="Wide establishing shot of a warm cozy cartoon kitchen, 7 AM golden morning light. A 13-year-old boy with curly auburn hair in a green shirt sits at a round white table eating cereal. A teenage girl with wavy auburn hair in a purple hoodie sits at the counter with a phone face-down. A woman in nurse scrubs pours coffee. Potted plants on windowsill, spice rack on wall. American animation style, Studio Ghibli warmth, Cartoon Network line weight." },
  @{ n="02"; d=6;  m="grok";     p="First-person POV shot slowly panning across a warm cartoon kitchen interior. Morning light, potted plants, round white table, spice rack. Faint glowing purple and amber analytical glyphs and runes drift at the edges of frame, orbiting softly like living ink. Cartoon animation style, Ghibli warmth." },
  @{ n="03"; d=5;  m="grok";     p="Close-up on a colorful kitchen spice rack with jars in alphabetical order. A glowing amber exclamation glyph pulses around the rack. A faint ghostly duplicate shows the previous arrangement beside it. Warm cartoon animation, golden morning light, analytical overlay." },
  @{ n="04"; d=5;  m="grok";     p="Close-up on a smartphone lying face-down on a kitchen counter, screen dark. A glowing amber clock glyph shows 7:11 AM above it. A teenage girl's hands are visible at the edges, fidgeting. Warm cartoon animation style, morning kitchen lighting." },
  @{ n="05"; d=5;  m="grok";     p="A 13-year-old boy with curly auburn hair leans toward a kitchen window. Through the window a suburban porch shows mail already in the mailbox. A glowing cyan glyph with a clock and envelope icon floats near the frame. Warm American cartoon style, morning light." },
  @{ n="06"; d=7;  m="grok";     p="Cartoon animation: A 13-year-old boy with curly auburn hair in a green shirt looks through a kitchen window at a garage door outside. The garage door has a fist-sized circular dent at five feet high highlighted with a glowing red circle. Multiple purple and amber analytical glyphs orbit the boy's head fully activated. A magnifying glyph zooms toward the dent. Golden morning light, American animation style." },
  @{ n="07"; d=6;  m="hailuo23"; p="Two-shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) sitting at a kitchen counter looking at her phone with a knowing smirk, one eyebrow raised, watching a 13-year-old boy (curly auburn hair, green shirt) sitting at a breakfast table in her peripheral vision. Faint glowing purple analytical glyphs orbit the boy's head. Early morning kitchen, warm light. American animation style." },
  @{ n="08"; d=6;  m="hailuo23"; p="Medium close-up cartoon animation: 13-year-old boy with curly auburn hair and green shirt sits at a kitchen table, eyes narrowed in a focused detective squint. Analytical glyphs pause mid-orbit around his head. He sets a spoon down on a cereal bowl. Kitchen background, warm morning light. American animation style." },
  @{ n="09"; d=6;  m="hailuo23"; p="Medium shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) theatrically mimicking a detective's squint — face scrunched, hands waving in circles around her head in an exaggerated impression. Expression is fond mockery. Kitchen background, warm morning light. American cartoon style." },
  @{ n="10"; d=6;  m="grok";     p="Medium shot cartoon animation: 13-year-old boy with curly auburn hair in a green shirt at a kitchen table while analytical glyphs form a floating timeline beside him showing timestamps 7:11, 7:14, 7:23 as colored glyph-dots on a glowing line. Expression completely matter-of-fact. American animation style, warm kitchen morning light." },
  @{ n="11"; d=6;  m="hailuo23"; p="Close-up cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) stares in disbelief at someone off-frame, expression between exasperation and genuine affection. Her eyes go wide then soften. A smile breaks through. American animation style, warm morning kitchen light." },
  @{ n="12"; d=6;  m="hailuo23"; p="Close-up cartoon animation: 13-year-old boy with curly auburn hair meets eyes with someone off-frame, head tilted slightly, expression neutral with the faintest hint of a smile at the corner of his mouth. Faint analytical glyphs orbit softly. American animation style." },
  @{ n="13"; d=6;  m="hailuo23"; p="Three-shot cartoon animation: woman in nurse's scrubs (early 40s, hair in practical bun, coffee mug in hand) turns to face a 13-year-old boy at a table and a teenage girl at the counter. Expression simultaneously amused, exasperated, and loving. Morning kitchen, warm light. American animation expressive style." },
  @{ n="14"; d=6;  m="hailuo23"; p="Medium shot cartoon animation: woman in nurse's scrubs (early 40s, hair in bun, coffee mug) is mid-pour when she freezes for a half-beat — a subtle micro-expression of surprise flickers before she smooths it into a casual smile. In the background a 13-year-old boy's glowing analytical glyphs pulse brightly amber. Warm morning kitchen. American animation style." },
  @{ n="15"; d=6;  m="hailuo23"; p="Two-shot cartoon animation: 13-year-old boy with curly auburn hair (green shirt, analytical glyphs active) asks a question while a woman in nurse's scrubs reacts — her confident expression falters into genuine puzzlement. Real surprise not performance. Cozy morning kitchen, warm light. American animation style." },
  @{ n="16"; d=6;  m="grok";     p="Wide shot cartoon animation: three family members — a woman in nurse's scrubs, a teenage girl in a purple hoodie, and a 13-year-old boy with curly auburn hair — all lean toward a kitchen window looking at a garage door with a small circular dent through the glass. The boy has glowing analytical glyphs orbiting his head. Morning kitchen, warm amber light." },
  @{ n="17"; d=6;  m="hailuo23"; p="Medium shot cartoon animation: a woman in nurse's scrubs (early 40s) kisses the top of a 13-year-old boy's curly auburn head at a kitchen table, then points at him with a warning finger as she moves toward the door. The boy's expression is tolerant with a tiny hint of fond. Warm morning kitchen, golden light. American animation style." },
  @{ n="18"; d=6;  m="hailuo23"; p="Close two-shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) makes direct eye contact with a 13-year-old boy (curly auburn hair, green shirt). All sarcasm gone — expression quiet, serious, protective. No glyphs active. Warm kitchen morning light, slightly muted palette. American animation style." },
  @{ n="19"; d=5;  m="grok";     p="Wide shot cartoon animation: a front door gently closes, bright rectangle of morning light narrowing until it shuts. Quiet of an empty hallway settling. Warm interior light contrast against bright exterior. American animation style, quiet emotional beat." },
  @{ n="20"; d=5;  m="grok";     p="Two-shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) scrolls on her phone at a kitchen counter in the background. 13-year-old boy (curly auburn hair, green shirt) sits at the foreground kitchen table, spoon in hand but not eating, staring at the table surface. Analytical glyphs very faint, barely visible. Quiet morning kitchen. American animation style." },
  @{ n="21"; d=6;  m="hailuo23"; p="Close-up cartoon animation: 13-year-old boy with curly auburn hair stares at the table surface, eyes moving subtly, brain processing. A single analytical glyph pulses softly once near his temple. Expression quiet, unsettled, focused inward. Warm kitchen morning light. American animation style." },
  @{ n="22"; d=7;  m="grok";     p="Medium shot cartoon animation: 13-year-old boy with curly auburn hair (green shirt) sits at a kitchen table with a full analytical overlay active — four glowing glyph icons orbit around him: a spice jar, a smartphone, an envelope, a garage door. Each pulses amber in sequence. Expression contemplative. Warm golden morning light. American animation style." },
  @{ n="23"; d=6;  m="veo3fast"; p="First-person point-of-view cartoon animation slowly pushing through a kitchen window toward a garage door outside in soft morning light. A small circular dent on the garage door at five feet high is highlighted by a subtle glowing amber glyph marker. Atmospheric and slightly ominous. American animation style, Ghibli-influenced background detail." },
  @{ n="24"; d=8;  m="veo3fast"; p="Wide establishing cartoon animation: 13-year-old boy with curly auburn hair sits alone at a round white kitchen table in a warm morning kitchen, cereal bowl in front of him, sunlight through the window. The room that was full of family is now quiet and still. Analytical glyphs orbit him slowly, idling. Expression clear, resolved, thinking. American animation style, Studio Ghibli warmth." },
  @{ n="26"; d=5;  m="grok";     p="Cartoon animation still: 13-year-old boy with curly auburn hair in green shirt sits at a kitchen table, turning his gaze toward a window with a slight determined smile. Analytical glyphs orbit his head brightly. Kitchen morning light. The expression of someone who has already made up their mind. American animation cartoon style." }
)

for ($i = 0; $i -lt $shots.Count; $i++) {
  $s = $shots[$i]
  node generate-video.js $s.p --model $s.m --duration $s.d --image $image
  # Move and rename to shot-NN prefix so concat sorts correctly
  $latest = Get-ChildItem ".\media\video\*.mp4" | Sort-Object LastWriteTime | Select-Object -Last 1
  if ($latest) {
    $destFile = Join-Path $dest ("shot-" + $s.n + "_" + $latest.Name)
    Move-Item $latest.FullName $destFile
    Write-Host "✅ Shot $($s.n) saved: $destFile"
  }
}
```

### Phase 2 — Generate Title Card (Shot 25)

Script: **`generate-image.js`**

```powershell
node generate-image.js "Title card for a cartoon detective series. Warm amber and deep violet background with subtle glowing analytical runes and equations. Large stylized serif title text: ALEX FINCH DETECTIVE. Subtitle: Episode 00 Before the Fall. Silhouette of a 13-year-old boy with curly hair surrounded by orbiting glyphs as a central logo. Professional animation title card design. American cartoon aesthetic." --model ideoturbo --aspect 16:9
# Move result: media/images/[timestamp].jpg → projects/alex-breakfast/media/shot-25_title.jpg
```

### Phase 3 — Generate Alex Narration

Script: **`generate-voice.js`**

```powershell
node generate-voice.js "Four things are wrong with this Tuesday morning. [pause:0.8] I'm eating cereal at the kitchen table, cataloging changes since yesterday. [pause:0.5] One: Mom rearranged the spice rack. Alphabetical instead of by frequency of use. Suspicious. [pause:0.5] Two: Maya's phone is face-down on the counter. Usually glued to her hand. Very suspicious. [pause:0.5] Three: The mail came early. Mr. Patterson never delivers before 9 AM on Tuesdays. Extremely suspicious. [pause:0.5] Four: There's a new dent in the garage door. Small. Fist-sized. About five feet up. [pause:1.2] But my brain won't settle. [pause:0.5] The dent. The spice rack. Early mail. [pause:0.8] Probably nothing. Probably coincidence. [pause:1.0] Detectives don't believe in coincidence. [pause:0.5] We believe in patterns." --model elevenv3
```

**Voice direction**: Dry. Precise. 13-year-old certainty — not precocious, *accurate*. Narrates like dictating case notes.

| Line | Delivery note |
|------|---------------|
| "Four things are wrong" | Matter-of-fact. Not dramatic. |
| "Suspicious / Very suspicious / Extremely suspicious" | Each one marginally drier than the last. |
| "I prefer 'observant'" | Half-second beat before. |
| "But my brain won't settle" | Quiet. A little tired. |
| "Detectives don't believe in coincidence. We believe in patterns." | Slow. Final word lands with full weight. |

### Phase 4 — Generate Background Music

Script: **`generate-music.js`**

```powershell
node generate-music.js "light acoustic detective jazz, morning warmth, ticking clock undertone, curious and gentle, children's mystery adventure underscore, acoustic guitar and soft piano, 2.5 minutes" --model music15
```

| Shots | Music cue |
|-------|-----------|
| 01–06 | Warm acoustic guitar, barely-there jazz, morning feel |
| 07–16 | Light comedic underscoring, ticking elements |
| 17–19 | Single guitar, intimate and soft |
| 20–24 | Ambient, unresolved tension note, quiet |
| 25–26 | Detective jazz sting into full theme — upbeat, adventurous |

### Phase 5 — Assemble Clips (FFmpeg concat)

Tool: **`ffmpeg-static`** (bundled at `node_modules\ffmpeg-static\ffmpeg.exe`)

```powershell
$mediaDir = "C:\Development\AlexVideos\projects\alex-breakfast\media"
$ffmpeg   = "C:\Development\AlexVideos\node_modules\ffmpeg-static\ffmpeg.exe"
Set-Location $mediaDir

# Build concat list in shot order
Get-ChildItem *.mp4 | Where-Object { $_.Name -match "^shot-" } | Sort-Object Name |
  ForEach-Object { "file '$($_.FullName)'" } |
  Out-File concat-list.txt -Encoding UTF8

# Stitch all clips into silent episode
& $ffmpeg -f concat -safe 0 -i concat-list.txt -c:v libx264 -preset fast -crf 22 -movflags +faststart raw-ep00.mp4 -y
```

Output: `raw-ep00.mp4` (~2:33 silent video)

### Phase 6 — Merge Narration onto Video

Script: **`generate-edit-video.js --model avmerge`** (local FFmpeg, free)

```powershell
Set-Location "C:\Development\AlexVideos"
node generate-edit-video.js `
  --video .\projects\alex-breakfast\media\raw-ep00.mp4 `
  --audio .\media\audio\[narration-timestamp]_elevenv3_Four-things-are-wrong.mp3 `
  --model avmerge
# Output: media/video/[timestamp]_avmerge_raw-ep00.mp4 → move to projects/alex-breakfast/media/ep00-with-narration.mp4
```

### Phase 7 — Blend in Background Music

Script: **`generate-edit-video.js --model audiomix`** (local FFmpeg, free — added this session)

```powershell
node generate-edit-video.js `
  --video .\projects\alex-breakfast\media\ep00-with-narration.mp4 `
  --audio .\media\audio\[narration-file].mp3 `
  --music .\media\audio\[music-file].mp3 `
  --music-volume 0.25 `
  --model audiomix
# Output: media/video/[timestamp]_audiomix_ep00-with-narration.mp4 → rename to ep00-final.mp4
```

FFmpeg filter used: `amix=inputs=2:duration=first:dropout_transition=3`
Narration vol = 1.0, music vol = 0.25 (adjust `--music-volume` to taste)

### Phase 8 — Optional: Captions

Script: **`generate-edit-video.js --model caption`** (~$0.07, AutoCaption AI)

```powershell
node generate-edit-video.js `
  --video .\projects\alex-breakfast\media\ep00-final.mp4 `
  --model caption
```
