# Alex Finch Detective Episode 00 — Corrected Shot Generation
# 
# FIX: --image sets the LITERAL FIRST FRAME (hailuo23=first_frame_image, grok=image, veo3fast=input_reference)
# Using prologue.png as --image made every shot open with the same frame.
#
# Strategy:
#   PASS 1 — Generate a unique first-frame IMAGE for each character shot (generate-image.js)
#   PASS 2 — Generate video using that custom frame as --image (or text-to-video for no-character shots)
#
# Shot categories:
#   TEXT-TO-VIDEO (no --image): 02, 03, 04, 06, 09, 10, 13, 16, 18, 19, 20, 23
#   IMAGE-TO-VIDEO (custom first frame): 01, 05, 07, 08, 11, 12, 14, 15, 17, 21, 22, 24, 26

Set-Location "C:\Development\AlexVideos"

$dest = "projects\alex-breakfast\media"
$frames = "projects\alex-breakfast\media\frames"

New-Item -ItemType Directory -Path $dest -Force | Out-Null
New-Item -ItemType Directory -Path $frames -Force | Out-Null

Write-Host "🎬 Alex Finch Detective Episode 00 — Corrected Production"
Write-Host "📁 Output: $dest"
Write-Host "📁 First-frames: $frames"
Write-Host ""

# ── SHOT DEFINITIONS ────────────────────────────────────────────────
# Uses the FULL storyboard prompts. "img" = true means character is visible → needs custom first frame.
$shots = @(
    @{ n = "01"; d = 7; m = "grok"; img = $true; p = "Wide establishing shot of a warm cozy cartoon kitchen, 7 AM golden morning light. A 13-year-old boy with curly auburn hair in a green shirt sits at a round white table eating cereal. A teenage girl with wavy auburn hair in a purple hoodie sits at the counter with a phone face-down. A woman in nurse scrubs pours coffee. Potted plants on windowsill, spice rack on wall. American animation style, Studio Ghibli warmth, Cartoon Network line weight." },
    @{ n = "02"; d = 6; m = "grok"; img = $false; p = "First-person POV shot slowly panning across a warm cartoon kitchen interior. Morning light, potted plants, round white table, spice rack. Faint glowing purple and amber analytical glyphs and runes drift at the edges of frame, orbiting softly like living ink. Cartoon animation style, Ghibli warmth." },
    @{ n = "03"; d = 5; m = "grok"; img = $false; p = "Close-up on a colorful kitchen spice rack with jars in alphabetical order. A glowing amber exclamation glyph pulses around the rack. A faint ghostly duplicate shows the previous arrangement beside it. Warm cartoon animation, golden morning light, analytical overlay." },
    @{ n = "04"; d = 5; m = "grok"; img = $false; p = "Close-up on a smartphone lying face-down on a kitchen counter, screen dark. A glowing amber clock glyph shows 7:11 AM above it. A teenage girl's hands are visible at the edges, fidgeting. Warm cartoon animation style, morning kitchen lighting." },
    @{ n = "05"; d = 5; m = "grok"; img = $true; p = "A 13-year-old boy with curly auburn hair leans toward a kitchen window. Through the window a suburban porch shows mail already in the mailbox. A glowing cyan glyph with a clock and envelope icon floats near the frame. Warm American cartoon style, morning light." },
    @{ n = "06"; d = 7; m = "grok"; img = $true; p = "Cartoon animation: A 13-year-old boy with curly auburn hair in a green shirt looks through a kitchen window at a garage door outside. The garage door has a fist-sized circular dent at five feet high highlighted with a glowing red circle. Multiple purple and amber analytical glyphs orbit the boy's head fully activated. A magnifying glyph zooms toward the dent. Golden morning light, American animation style." },
    @{ n = "07"; d = 6; m = "hailuo23"; img = $true; p = "Two-shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) sitting at a kitchen counter looking at her phone with a knowing smirk, one eyebrow raised, watching a 13-year-old boy (curly auburn hair, green shirt) sitting at a breakfast table in her peripheral vision. Faint glowing purple analytical glyphs orbit the boy's head. Early morning kitchen, warm light. American animation style." },
    @{ n = "08"; d = 6; m = "hailuo23"; img = $true; p = "Medium close-up cartoon animation: 13-year-old boy with curly auburn hair and green shirt sits at a kitchen table, eyes narrowed in a focused detective squint. Analytical glyphs pause mid-orbit around his head. He sets a spoon down on a cereal bowl. Kitchen background, warm morning light. American animation style." },
    @{ n = "09"; d = 6; m = "hailuo23"; img = $true; p = "Medium shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) theatrically mimicking a detective's squint — face scrunched, hands waving in circles around her head in an exaggerated impression. Expression is fond mockery. Kitchen background, warm morning light. American cartoon style." },
    @{ n = "10"; d = 6; m = "grok"; img = $true; p = "Medium shot cartoon animation: 13-year-old boy with curly auburn hair in a green shirt at a kitchen table while analytical glyphs form a floating timeline beside him showing timestamps 7:11, 7:14, 7:23 as colored glyph-dots on a glowing line. Expression completely matter-of-fact. American animation style, warm kitchen morning light." },
    @{ n = "11"; d = 6; m = "hailuo23"; img = $true; p = "Close-up cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) stares in disbelief at someone off-frame, expression between exasperation and genuine affection. Her eyes go wide then soften. A smile breaks through. American animation style, warm morning kitchen light." },
    @{ n = "12"; d = 6; m = "hailuo23"; img = $true; p = "Close-up cartoon animation: 13-year-old boy with curly auburn hair meets eyes with someone off-frame, head tilted slightly, expression neutral with the faintest hint of a smile at the corner of his mouth. Faint analytical glyphs orbit softly. American animation style." },
    @{ n = "13"; d = 6; m = "hailuo23"; img = $true; p = "Three-shot cartoon animation: woman in nurse's scrubs (early 40s, hair in practical bun, coffee mug in hand) turns to face a 13-year-old boy at a table and a teenage girl at the counter. Expression simultaneously amused, exasperated, and loving. Morning kitchen, warm light. American animation expressive style." },
    @{ n = "14"; d = 6; m = "hailuo23"; img = $true; p = "Medium shot cartoon animation: woman in nurse's scrubs (early 40s, hair in bun, coffee mug) is mid-pour when she freezes for a half-beat — a subtle micro-expression of surprise flickers before she smooths it into a casual smile. In the background a 13-year-old boy's glowing analytical glyphs pulse brightly amber. Warm morning kitchen. American animation style." },
    @{ n = "15"; d = 6; m = "hailuo23"; img = $true; p = "Two-shot cartoon animation: 13-year-old boy with curly auburn hair (green shirt, analytical glyphs active) asks a question while a woman in nurse's scrubs reacts — her confident expression falters into genuine puzzlement. Real surprise not performance. Cozy morning kitchen, warm light. American animation style." },
    @{ n = "16"; d = 6; m = "grok"; img = $true; p = "Wide shot cartoon animation: three family members — a woman in nurse's scrubs, a teenage girl in a purple hoodie, and a 13-year-old boy with curly auburn hair — all lean toward a kitchen window looking at a garage door with a small circular dent through the glass. The boy has glowing analytical glyphs orbiting his head. Morning kitchen, warm amber light." },
    @{ n = "17"; d = 6; m = "hailuo23"; img = $true; p = "Medium shot cartoon animation: a woman in nurse's scrubs (early 40s) kisses the top of a 13-year-old boy's curly auburn head at a kitchen table, then points at him with a warning finger as she moves toward the door. The boy's expression is tolerant with a tiny hint of fond. Warm morning kitchen, golden light. American animation style." },
    @{ n = "18"; d = 6; m = "hailuo23"; img = $true; p = "Close two-shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) makes direct eye contact with a 13-year-old boy (curly auburn hair, green shirt). All sarcasm gone — expression quiet, serious, protective. No glyphs active. Warm kitchen morning light, slightly muted palette. American animation style." },
    @{ n = "19"; d = 5; m = "grok"; img = $false; p = "Wide shot cartoon animation: a front door gently closes, bright rectangle of morning light narrowing until it shuts. Quiet of an empty hallway settling. Warm interior light contrast against bright exterior. American animation style, quiet emotional beat." },
    @{ n = "20"; d = 5; m = "grok"; img = $true; p = "Two-shot cartoon animation: teenage girl (17, wavy auburn hair, purple hoodie) scrolls on her phone at a kitchen counter in the background. 13-year-old boy (curly auburn hair, green shirt) sits at the foreground kitchen table, spoon in hand but not eating, staring at the table surface. Analytical glyphs very faint, barely visible. Quiet morning kitchen. American animation style." },
    @{ n = "21"; d = 6; m = "hailuo23"; img = $true; p = "Close-up cartoon animation: 13-year-old boy with curly auburn hair stares at the table surface, eyes moving subtly, brain processing. A single analytical glyph pulses softly once near his temple. Expression quiet, unsettled, focused inward. Warm kitchen morning light. American animation style." },
    @{ n = "22"; d = 7; m = "grok"; img = $true; p = "Medium shot cartoon animation: 13-year-old boy with curly auburn hair (green shirt) sits at a kitchen table with a full analytical overlay active — four glowing glyph icons orbit around him: a spice jar, a smartphone, an envelope, a garage door. Each pulses amber in sequence. Expression contemplative. Warm golden morning light. American animation style." },
    @{ n = "23"; d = 6; m = "veo3fast"; img = $false; p = "First-person point-of-view cartoon animation slowly pushing through a kitchen window toward a garage door outside in soft morning light. A small circular dent on the garage door at five feet high is highlighted by a subtle glowing amber glyph marker. Atmospheric and slightly ominous. American animation style, Ghibli-influenced background detail." },
    @{ n = "24"; d = 8; m = "veo3fast"; img = $true; p = "Wide establishing cartoon animation: 13-year-old boy with curly auburn hair sits alone at a round white kitchen table in a warm morning kitchen, cereal bowl in front of him, sunlight through the window. The room that was full of family is now quiet and still. Analytical glyphs orbit him slowly, idling. Expression clear, resolved, thinking. American animation style, Studio Ghibli warmth." },
    @{ n = "26"; d = 5; m = "grok"; img = $true; p = "Cartoon animation still: 13-year-old boy with curly auburn hair in green shirt sits at a kitchen table, turning his gaze toward a window with a slight determined smile. Analytical glyphs orbit his head brightly. Kitchen morning light. The expression of someone who has already made up their mind. American animation cartoon style." }
)

# ── PASS 1: Generate Custom First Frames ────────────────────────────
$frameShots = $shots | Where-Object { $_.img -eq $true }
Write-Host "🖼️  PASS 1: Generating $($frameShots.Count) custom first-frames..."
Write-Host ""

$fi = 0
foreach ($shot in $frameShots) {
    $fi++
    $frameFile = Join-Path $frames "frame-$($shot.n).png"
  
    if (Test-Path $frameFile) {
        Write-Host "⏩ Frame $($shot.n) already exists, skipping"
        continue
    }
  
    Write-Host "🖼️  Frame $($shot.n) [$fi/$($frameShots.Count)]"
    Write-Host "   Prompt: $($shot.p.Substring(0, [math]::Min(80, $shot.p.Length)))..."
  
    # Record timestamp before generation to detect stale files
    $beforeGen = Get-Date
  
    # Generate still image matching the shot's opening composition (ideoturbo: reliable, $0.03, ~7s)
    node generate-image.js $shot.p --model ideoturbo --aspect 16:9
    $exitCode = $LASTEXITCODE
  
    if ($exitCode -ne 0) {
        Write-Host "❌ Frame $($shot.n) generation failed (exit $exitCode) — will fall back to text-to-video"
        Write-Host ""
        continue
    }
  
    # Find the image generated AFTER our timestamp (prevents picking up stale files)
    $latestImg = Get-ChildItem ".\media\images\*" -Include "*.png", "*.jpg", "*.webp" |
    Where-Object { $_.LastWriteTime -gt $beforeGen } |
    Sort-Object LastWriteTime | Select-Object -Last 1
    if ($latestImg) {
        Copy-Item $latestImg.FullName $frameFile
        Write-Host "✅ Frame $($shot.n) saved: $frameFile"
    }
    else {
        Write-Host "❌ Frame $($shot.n) — no new image found after generation"
    }
    Write-Host ""
}

Write-Host ""
Write-Host "🖼️  PASS 1 Complete: First-frames generated."
Write-Host "==========================================="
Write-Host ""

# ── PASS 2: Generate Video Clips ────────────────────────────────────
Write-Host "🎬 PASS 2: Generating $($shots.Count) video clips..."
Write-Host ""

$totalShots = $shots.Count
$currentShot = 0

foreach ($shot in $shots) {
    $currentShot++
    $progress = [math]::Round(($currentShot / $totalShots) * 100, 0)
  
    Write-Host "🎬 Shot $($shot.n) [$currentShot/$totalShots - $progress%]"
    Write-Host "   Model: $($shot.m) | Duration: $($shot.d)s | Mode: $(if ($shot.img) {'I2V (custom frame)'} else {'T2V (text-only)'})"
  
    # Build the command arguments
    $frameFile = Join-Path $frames "frame-$($shot.n).png"
    $useFrame = $shot.img -and (Test-Path $frameFile)
  
    $beforeGen = Get-Date
  
    if ($useFrame) {
        Write-Host "   Frame: $frameFile"
        node generate-video.js $shot.p --model $shot.m --duration $shot.d --image $frameFile
    }
    else {
        Write-Host "   Frame: (none — text-to-video)"
        node generate-video.js $shot.p --model $shot.m --duration $shot.d
    }
  
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        Write-Host "❌ Shot $($shot.n) generation failed (exit $exitCode)"
        Write-Host ""
        Write-Host "---"
        Write-Host ""
        continue
    }
  
    # Move and rename — only pick up files created after our timestamp
    $latest = Get-ChildItem ".\media\video\*.mp4" |
    Where-Object { $_.LastWriteTime -gt $beforeGen } |
    Sort-Object LastWriteTime | Select-Object -Last 1
    if ($latest) {
        $destFile = Join-Path $dest ("shot-" + $shot.n.PadLeft(2, '0') + "_" + $latest.Name)
        Move-Item $latest.FullName $destFile
        Write-Host "✅ Shot $($shot.n) saved: $destFile"
    }
    else {
        Write-Host "❌ Shot $($shot.n) — no new video file found"
    }
  
    Write-Host ""
    Write-Host "---"
    Write-Host ""
}

Write-Host "🎉 Phase 1 Complete: All video shots generated!"
Write-Host "📁 Files saved to: $dest\"
Write-Host ""
Write-Host "🎯 Next: Generate title card (Shot 25)"
Write-Host "   node generate-image.js ""Title card..."" --model ideoturbo --aspect 16:9"
