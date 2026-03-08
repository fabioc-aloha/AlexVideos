# Concept: Fabio Correa — LinkedIn Professional Headshots

**Project:** AI-generated professional headshots and portraits for LinkedIn
**Design Approach:** Polished studio photography — warm lighting, confident presence, published author + tech leader identity
**Target:** LinkedIn profile picture and supporting professional portraits

---

## Model Selection

| Goal | Model | Cost | Why |
|------|-------|------|-----|
| Headshots | `nanapro` | variable | Best face consistency with reference image input |

---

## Visual Identity

| Element | Spec |
|---------|------|
| Setting | Professional studio / modern office / warm library |
| Wardrobe | Dark navy suit, dark blazer, charcoal turtleneck, smart dark shirt |
| Lighting | Soft key light, subtle rim, blurred warm background |
| Framing | Medium close-up, slight off-center, eye-level camera |
| Color grade | Warm neutral tones, shallow depth of field |
| Mood | Confident, approachable, intellectual — author + tech leader |

---

## Reference Photos

| Ref | Resolution | Source |
|-----|-----------|--------|
| `ref-01.png` | 768x1024 | Dec 2025 portrait (primary) |
| `ref-02.png` | 1024x768 | Dec 2025 blazer |
| `ref-04.png` | 960x960 | 2020 kitchen photo |
| `ref-05.jpg` | 2316x1917 | Feb 2025 close-up selfie, outdoor, heavy silver beard |

### Book Covers

| Book | File | Notes |
|------|------|-------|
| Alex in Wonderland | `front-cover.jpg` | Detective mystery, Second Edition, by Alex Finch |
| The Life of Alex Finch | `front.jpg` | Biography of an Artificial Mind, by Fabio Correa with Alex Finch |

---

## Headshot Variations

Each variant balances **tech professional** with **published author** — mixing environments, moods, and lighting for range.

```bash
# 1. Classic Professional — clean studio headshot (ref-05)
node generate-image.js "Professional headshot of a broad-shouldered man in his mid-50s with dark hair brushed back and a short silver-gray beard, wearing a dark navy suit and white shirt, no tie, Rembrandt lighting with a single warm key light from the left, deep charcoal backdrop with subtle gradient, shallow depth of field, direct eye contact, confident approachable expression, photorealistic" --model nanapro --aspect 1:1 --image ./projects/fabio-linkedin/ref-05.jpg

# 2. Late Night Author — moody writing session (ref-05 + books)
node generate-image.js "A broad-shouldered man in his mid-50s with dark hair brushed back and a short silver-gray beard, wearing a worn dark wool cardigan over a black t-shirt, hunched over a vintage typewriter in a dimly lit study, single desk lamp casting warm amber light across his face, whiskey glass nearby, shelves of dog-eared books in soft focus behind him, cinematic chiaroscuro, editorial portrait, photorealistic" --model nanapro --aspect 1:1 --image ./projects/fabio-linkedin/ref-05.jpg --image ./projects/fabio-linkedin/front-cover.jpg --image ./projects/fabio-linkedin/front.jpg

# 3. Bookshop Signing — author in the wild (ref-02 + books)
node generate-image.js "Portrait of a broad-shouldered man in his mid-50s with dark hair brushed back and a short silver-gray beard, wearing a dark blazer over a casual plaid shirt, sitting at a bookshop signing table with an open hardcover and a pen in hand, stacks of his published books beside him, warm string lights blurred in the background, genuine proud smile, published author event photo, photorealistic" --model nanapro --aspect 1:1 --image ./projects/fabio-linkedin/ref-02.png --image ./projects/fabio-linkedin/front-cover.jpg --image ./projects/fabio-linkedin/front.jpg

# 4. Keynote Moment — on stage energy (ref-05)
node generate-image.js "A charismatic broad-shouldered man in his mid-50s with dark hair brushed back and a short silver-gray beard, on a conference stage wearing a dark navy blazer over a black crew neck, mid-gesture with one hand raised, giant screen glowing behind him, warm orange and blue stage lighting, silhouetted audience in the foreground, shot from below eye level, keynote speaker energy, photorealistic" --model nanapro --aspect 1:1 --image ./projects/fabio-linkedin/ref-05.jpg

# 5. Dual Screens — creative technologist (ref-01)
node generate-image.js "A broad-shouldered man in his mid-50s with dark hair brushed back and a short silver-gray beard, wearing a dark henley shirt, sitting in a creative studio surrounded by ultrawide monitors glowing with code editors and video editing timelines, neon-tinged ambient light reflecting off his face, published books stacked on the desk corner, shallow depth of field, focused intense expression, cyberpunk-meets-editorial portrait, photorealistic" --model nanapro --aspect 1:1 --image ./projects/fabio-linkedin/ref-01.png

# 6. Rain Window — contemplative author (ref-05 + books)
node generate-image.js "Cinematic portrait of a broad-shouldered man in his mid-50s with dark hair brushed back and a short silver-gray beard, wearing a charcoal turtleneck, gazing out a rain-streaked floor-to-ceiling window in a high-rise apartment, city lights softly blurred through the rain, a manuscript and reading glasses on the table beside him, moody blue and warm gold split lighting, introspective literary author portrait, photorealistic" --model nanapro --aspect 1:1 --image ./projects/fabio-linkedin/ref-05.jpg --image ./projects/fabio-linkedin/front-cover.jpg --image ./projects/fabio-linkedin/front.jpg

# 7. Leather & Warmth — relaxed confidence (ref-02)
node generate-image.js "Professional headshot of a broad-shouldered man in his mid-50s with dark hair brushed back and a short silver-gray beard, wearing a dark brown leather jacket over a black t-shirt, gold chain necklace, leaning against a weathered brick wall, late afternoon golden hour sunlight, shallow depth of field with warm bokeh, relaxed half-smile, rugged editorial portrait, photorealistic" --model nanapro --aspect 1:1 --image ./projects/fabio-linkedin/ref-02.png

# 8. Coffee & Craft — approachable casual (ref-04 + books)
node generate-image.js "Editorial portrait of a broad-shouldered man in his mid-50s with dark hair brushed back and a short silver-gray beard, wearing a fitted dark crew neck, sitting in a modern coffee shop with his published hardcover book and a latte on the table, morning light streaming through large windows, exposed brick and greenery in the background, warm and inviting, approachable published author, photorealistic" --model nanapro --aspect 1:1 --image ./projects/fabio-linkedin/ref-04.png --image ./projects/fabio-linkedin/front-cover.jpg --image ./projects/fabio-linkedin/front.jpg
```

---

## LinkedIn Image Specs

| Asset | Dimensions | Aspect |
|-------|-----------|--------|
| Profile picture | 400x400 px (displays 200x200) | 1:1 |
| Post image | 1200x627 px | ~1.91:1 (use 16:9) |

---

## Output

Generated images land in `media/images/`. After review, copy selected finals to:
- `projects/fabio-linkedin/profile.png` — chosen LinkedIn profile pic
