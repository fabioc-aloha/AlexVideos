/**
 * Alex UI Icon Generator — Command Center icon production pipeline
 *
 * Usage:
 *   node generate-icons.js --dry-run                        # Preview all prompts, no API calls
 *   node generate-icons.js --profile fluxico                # Concept PNGs via Flux ICO ($0.013/ea)
 *   node generate-icons.js --profile recraft-svg            # Production SVGs via Recraft v4 ($0.08/ea)
 *   node generate-icons.js --profile recraft-svg --only=tabs,states
 *   node generate-icons.js --profile fluxico --only=agents --force
 *
 * Profiles:
 *   recraft-svg   — Recraft v4 SVG (native vector, $0.08/output, production quality)
 *   fluxico       — Flux ICO (PNG concept art, $0.013/output, fast iteration)
 *
 * Options:
 *   --profile <name>   Model profile (default: recraft-svg)
 *   --only <groups>    Comma-separated groups: tabs,states,agents,personas,default
 *   --force            Overwrite existing files
 *   --dry-run          Print prompts without calling API
 *   --delay-ms=<n>     Delay between API calls in ms (default: 2000)
 *
 * Based on: AlexMaster/Alex_Plug_In/alex_docs/research/mockups/generate-icon-options.js
 */

require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ── Configuration ──────────────────────────────────────────────────

const DEFAULT_DELAY_MS = 2000;
const OUTPUT_BASE = path.join(__dirname, "media");

const MODEL_PROFILES = {
  "recraft-svg": {
    model: "recraft-ai/recraft-v4-svg",
    costPerOutput: 0.08,
    extension: "svg",
    category: "production",
    promptPrefix: "",
    inputFromPrompt: (prompt) => ({
      prompt,
      aspect_ratio: "1:1",
      size: "1024x1024",
    }),
  },
  fluxico: {
    model:
      "miike-ai/flux-ico:478cae37f1aec0fde7977fdd54b272aaeabede7d8060801841920c16306369a9",
    costPerOutput: 0.013,
    extension: "png",
    category: "concept",
    promptPrefix: "ICO ",
    inputFromPrompt: (prompt) => ({
      prompt,
      aspect_ratio: "1:1",
      output_format: "png",
      go_fast: true,
    }),
  },
};

// ── CLI Parsing ────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");

const delayArg = args.find((a) => a.startsWith("--delay-ms="));
const DELAY_MS = delayArg
  ? parseInt(delayArg.split("=")[1], 10)
  : DEFAULT_DELAY_MS;

const onlyArg = args.find((a) => a.startsWith("--only="));
const ONLY_GROUPS = onlyArg
  ? new Set(
      onlyArg
        .split("=")[1]
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
    )
  : null;

const profileArg = args.find((a) => a.startsWith("--profile="));
const PROFILE_KEY = profileArg
  ? profileArg.split("=")[1].trim().toLowerCase()
  : "recraft-svg";
const PROFILE = MODEL_PROFILES[PROFILE_KEY];

if (!PROFILE) {
  console.error(`ERROR: Unknown --profile "${PROFILE_KEY}".`);
  console.error(`Valid profiles: ${Object.keys(MODEL_PROFILES).join(", ")}`);
  process.exit(1);
}

if (!Number.isFinite(DELAY_MS) || DELAY_MS < 0) {
  console.error("ERROR: --delay-ms must be a non-negative integer.");
  process.exit(1);
}

if (!process.env.REPLICATE_API_TOKEN && !DRY_RUN) {
  console.error("ERROR: REPLICATE_API_TOKEN not set.");
  console.error('Run: $env:REPLICATE_API_TOKEN = "r8_..."');
  console.error("Or add REPLICATE_API_TOKEN to a .env file in the repo root.");
  process.exit(1);
}

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// ── Variant Helper ─────────────────────────────────────────────────

const lettered = (...concepts) =>
  concepts.map((concept, i) => ({
    letter: String.fromCharCode(97 + i),
    concept,
  }));

// ── Asset Definitions (38 positions) ───────────────────────────────

const ASSET_GROUPS = [
  {
    folder: "tabs",
    kind: "tab icon",
    container: "rounded rectangle badge",
    style: "Command Center sidebar tab icon",
    assets: [
      {
        slug: "mission",
        label: "Mission Command",
        color: "indigo with electric-violet accents",
        brief:
          "operational dashboard, command overview, status-first home tab",
        variants: lettered(
          "a simple dashboard panel with exactly three stacked status bars of descending length",
          "a clean telemetry dial with one circular center point and one straight needle",
          "a single monitoring waveform crossing a compact dashboard strip from left to right"
        ),
      },
      {
        slug: "agents",
        label: "Agents",
        color: "indigo with cool collaborative highlights",
        brief:
          "specialist agent hub, team coordination, delegated capability",
        variants: lettered(
          "single friendly specialist silhouette",
          "small coordinated team cluster",
          "networked nodes forming an agent triangle"
        ),
      },
      {
        slug: "skills",
        label: "Skill Store",
        color: "indigo with luminous capability accents",
        brief: "capability catalog, skill browsing, modular powers",
        variants: lettered(
          "modular capability grid",
          "spark-shaped capability shard",
          "curated star module cluster"
        ),
      },
      {
        slug: "mind",
        label: "Mind",
        color: "indigo with cerebral silver highlights",
        brief:
          "cognitive architecture, introspection, memory, reasoning and health",
        variants: lettered(
          "layered neural symmetry",
          "orbital cognition rings around a core",
          "focus target with nested awareness",
          "connected neural arc with synapse nodes",
          "perception eye fused with cognition core",
          "clustered neuron constellation",
          "structured reasoning ladder inside a mind shape",
          "wave-based thought field",
          "faceted prism for reflective intelligence",
          "star-core insight emblem"
        ),
      },
      {
        slug: "docs",
        label: "Docs",
        color: "indigo with crisp editorial highlights",
        brief:
          "documentation hub, learning bridge, study materials and references",
        variants: lettered(
          "clean document sheet",
          "open reference book",
          "bookmark archive glyph"
        ),
      },
    ],
  },
  {
    folder: "states",
    kind: "state avatar",
    container: "circle badge",
    style: "compact cognitive-state avatar",
    assets: [
      {
        slug: "building",
        label: "Building",
        color: "indigo",
        brief: "active implementation, construction, shipping",
        variants: lettered(
          "upward build arrow",
          "solid triangular build form",
          "structural plus or cross construction mark"
        ),
      },
      {
        slug: "debugging",
        label: "Debugging",
        color: "red",
        brief: "bug fixing, fault isolation, problem solving under scrutiny",
        variants: lettered(
          "inspected error ring with slash",
          "alert pillar with critical point",
          "debug insect silhouette built from geometry"
        ),
      },
      {
        slug: "planning",
        label: "Planning",
        color: "blue",
        brief:
          "architecture, sequencing, roadmapping, strategic structure",
        variants: lettered(
          "diamond roadmap marker",
          "stacked planning rows",
          "branching decision tree"
        ),
      },
      {
        slug: "reviewing",
        label: "Reviewing",
        color: "teal",
        brief: "quality gate, validation, scrutiny, confidence checks",
        variants: lettered(
          "approval checkmark",
          "eye for review and inspection",
          "magnifier for verification"
        ),
      },
      {
        slug: "learning",
        label: "Learning",
        color: "green",
        brief: "study, understanding, concept building and growth",
        variants: lettered(
          "open learning book",
          "lightbulb idea mark",
          "graduation cap knowledge symbol"
        ),
      },
      {
        slug: "teaching",
        label: "Teaching",
        color: "amber",
        brief: "explaining, broadcasting, guiding, instruction",
        variants: lettered(
          "speaker cone",
          "lectern or board",
          "signal waves from a teaching core"
        ),
      },
      {
        slug: "meditation",
        label: "Meditation",
        color: "emerald",
        brief: "calm reflection, centered awareness, deep thought",
        variants: lettered(
          "balanced arch and spine",
          "half-halo serenity arc",
          "paired meditative circles"
        ),
      },
      {
        slug: "dream",
        label: "Dream",
        color: "violet",
        brief:
          "maintenance, subconscious synthesis, dream-state automation",
        variants: lettered(
          "crescent moon",
          "crescent with star",
          "dream cloud with subtle motion"
        ),
      },
      {
        slug: "discovery",
        label: "Discovery",
        color: "gold",
        brief: "insight, revelation, finding new patterns",
        variants: lettered(
          "lit discovery bulb",
          "spark burst",
          "compass-like reveal target"
        ),
      },
    ],
  },
  {
    folder: "agents",
    kind: "agent avatar",
    container: "hexagonal badge",
    style: "specialist agent identity icon",
    assets: [
      {
        slug: "alex",
        label: "Alex",
        color: "indigo",
        brief: "orchestrator, central intelligence, trusted AI partner",
        variants: lettered(
          "connected constellation of three minds",
          "guiding star emblem",
          "paired orbit rings for dual awareness"
        ),
      },
      {
        slug: "researcher",
        label: "Researcher",
        color: "blue",
        brief:
          "investigation, evidence gathering, deep search and synthesis",
        variants: lettered("magnifier", "lab flask", "evidence trend path"),
      },
      {
        slug: "builder",
        label: "Builder",
        color: "green",
        brief:
          "implementation, craftsmanship, construction and delivery",
        variants: lettered(
          "foundational hammer-like construction block",
          "precision gear and core",
          "architectural frame and beam",
          "tool-and-draft merge",
          "assembly blocks connected by a build path",
          "modular cut-and-fit construction pieces",
          "composed platform scaffold",
          "upward structure with a central spine",
          "ship-it trajectory line through crafted nodes",
          "stacked build system with grounded base"
        ),
      },
      {
        slug: "validator",
        label: "Validator",
        color: "red",
        brief: "adversarial review, risk detection, verification",
        variants: lettered(
          "shield with check",
          "verification ring",
          "balanced review scale"
        ),
      },
      {
        slug: "documentarian",
        label: "Documentarian",
        color: "amber",
        brief:
          "documentation quality, capture, editorial clarity and preservation",
        variants: lettered(
          "clean page",
          "bound document",
          "folded spec sheet",
          "annotated file with pencil energy",
          "open reference book"
        ),
      },
      {
        slug: "azure",
        label: "Azure",
        color: "azure blue",
        brief:
          "cloud platform guidance, infrastructure, deployment and Azure-native operations",
        variants: lettered(
          "angular cloud-platform shard, Azure-inspired but not the official logo",
          "cloud with upward platform arrow",
          "stacked cloud infrastructure racks",
          "faceted cloud triangle, Azure-inspired but original",
          "angular platform peak with supporting line",
          "cloud shard with bridge bar",
          "outlined faceted cloud mark, Azure-inspired but original",
          "open angular peak with inner support",
          "platform bar crossing a cloud core",
          "faceted platform chevron, Azure-inspired but original"
        ),
      },
      {
        slug: "m365",
        label: "M365",
        color: "orange-red",
        brief:
          "Microsoft 365 workflows, productivity, collaboration and workspace orchestration",
        variants: lettered(
          "collaboration tile grid",
          "workspace tile plus productivity mark",
          "diamond workspace hub",
          "folded panel workspace, Microsoft-365-inspired but original",
          "outlined folded workspace panel",
          "angled workspace shard",
          "outlined workspace fold system",
          "connected folded workspace planes",
          "workspace prism with center bar",
          "folded productivity mosaic with center point"
        ),
      },
    ],
  },
  {
    folder: "personas",
    kind: "persona avatar",
    container: "squircle badge",
    style: "LearnAlex-aligned condensed persona category icon",
    assets: [
      {
        slug: "software",
        label: "Software",
        color: "indigo",
        brief: "software developers, coding and implementation work",
        variants: lettered(
          "paired code chevrons",
          "prompt and terminal line",
          "logic grid"
        ),
      },
      {
        slug: "engineering",
        label: "Engineering",
        color: "blue",
        brief:
          "engineering systems, reliability and technical problem solving",
        variants: lettered(
          "gear core",
          "structural wave build",
          "modular system blocks"
        ),
      },
      {
        slug: "science",
        label: "Science",
        color: "teal",
        brief:
          "scientists and AI researchers, experimentation and inquiry",
        variants: lettered(
          "atomic orbit",
          "lab vessel",
          "research instrument"
        ),
      },
      {
        slug: "data",
        label: "Data",
        color: "cyan",
        brief:
          "data analysts and visual storytellers, measurement and insight",
        variants: lettered("bar chart", "data cylinder", "analytics dial"),
      },
      {
        slug: "design",
        label: "Design",
        color: "purple",
        brief: "designers, product aesthetics and interface craft",
        variants: lettered(
          "creative wedge",
          "three-shape composition",
          "stylus-inspired mark"
        ),
      },
      {
        slug: "creative",
        label: "Creative",
        color: "violet",
        brief:
          "writers, creators, performers and narrative makers",
        variants: lettered(
          "ink feather sweep",
          "microphone or spotlight stem",
          "double-lens creativity mark"
        ),
      },
      {
        slug: "documentation",
        label: "Documentation",
        color: "amber",
        brief:
          "technical writers and document-focused practitioners",
        variants: lettered(
          "annotated page",
          "folded doc sheet",
          "stacked doc pages"
        ),
      },
      {
        slug: "business",
        label: "Business",
        color: "slate",
        brief: "consultants, knowledge workers and executives",
        variants: lettered(
          "briefcase",
          "building block business form",
          "paired stakeholder circles"
        ),
      },
      {
        slug: "finance",
        label: "Finance",
        color: "green",
        brief:
          "finance professionals, reporting and value measurement",
        variants: lettered("currency ring", "growth line", "ledger grid"),
      },
      {
        slug: "product",
        label: "Product",
        color: "orange",
        brief:
          "product managers, project managers and entrepreneurs",
        variants: lettered(
          "roadmap blocks",
          "prioritization star",
          "directional ship plan"
        ),
      },
      {
        slug: "marketing",
        label: "Marketing",
        color: "coral",
        brief: "marketing, sales and attention strategy",
        variants: lettered(
          "megaphone",
          "target rings",
          "spotlight peak"
        ),
      },
      {
        slug: "education",
        label: "Education",
        color: "emerald",
        brief:
          "teachers, students, facilitators and learning communities",
        variants: lettered(
          "graduation cap",
          "bookshelf pair",
          "learning bulb"
        ),
      },
      {
        slug: "healthcare",
        label: "Healthcare",
        color: "red",
        brief: "healthcare professionals and counselors",
        variants: lettered(
          "care heart with cross",
          "support figure",
          "clinical waveform"
        ),
      },
      {
        slug: "legal",
        label: "Legal",
        color: "gold",
        brief: "lawyers, legal review and policy judgment",
        variants: lettered(
          "balanced justice motif",
          "gavel or authority pillar",
          "shielded compliance mark"
        ),
      },
      {
        slug: "people",
        label: "People",
        color: "pink",
        brief:
          "HR, people operations, CX leaders and nonprofit leaders",
        variants: lettered(
          "community pair",
          "empathy circle",
          "care heart community mark"
        ),
      },
      {
        slug: "career",
        label: "Career",
        color: "sky blue",
        brief:
          "job seekers, growth, readiness and professional momentum",
        variants: lettered(
          "career clock or timing mark",
          "launch path",
          "briefcase with approval check"
        ),
      },
    ],
  },
  {
    folder: "default",
    kind: "default avatar",
    container: "circle badge",
    style: "neutral fallback Alex icon",
    assets: [
      {
        slug: "default",
        label: "Neutral Fallback",
        color: "indigo",
        brief:
          "neutral Alex fallback state when no richer context is active",
        variants: lettered(
          "calm centered target",
          "guiding spark emblem",
          "friendly minimal face"
        ),
      },
    ],
  },
];

// ── Prompt Builder ─────────────────────────────────────────────────

function buildPrompt(group, asset, variant) {
  const requirements = [
    "- Square 1:1 composition, centered icon, transparent or plain light background, size 1024x1024.",
    "- Bold, simple geometry readable at 16px to 24px.",
    "- Use only basic geometric primitives: circles, straight lines, rectangles, arcs, and simple polygons.",
    "- Modern product-icon feel with intentional depth, but no raster texture unless required by the model.",
    "- The result must read like a software UI icon, not an illustration, poster, tattoo, crest, sigil, totem, ornament, or tribal motif.",
    "- No decorative flourishes, no filigree, no glyph-like calligraphy, no mystical symbolism, no aggressive patterning.",
    "- One primary symbol only, with a clear silhouette and controlled negative space.",
    "- No text, letters, words, numerals, UI frames, devices, mockups, or screenshots.",
    "- No copyrighted logos, mascots, or trademark replicas.",
    "- Use clean paths and distinct negative space.",
    "- Prefer flat icon semantics over expressive art direction.",
    "- Keep it suitable for a VS Code sidebar and approval-sheet thumbnails.",
  ];

  if (PROFILE.category === "production") {
    requirements.unshift("- Native SVG vector output.");
  } else {
    requirements.unshift(
      "- Deliver a flat PNG concept image for icon review; this is concept art, not final SVG."
    );
  }

  return [
    PROFILE.promptPrefix ? PROFILE.promptPrefix.trim() : "",
    `Create a production-ready ${group.kind} for the Alex Command Center UI.`,
    `Subject: ${asset.label}.`,
    `Semantic role: ${asset.brief}.`,
    `Variant concept: ${variant.concept}.`,
    `Visual style: ${group.style}, minimal UI pictogram, clean geometric vector icon.`,
    `Outer silhouette: ${group.container}.`,
    `Palette direction: ${asset.color}.`,
    "Requirements:",
    ...requirements,
    "This is a micro-asset inside the Alex product, not a company logo or hero illustration.",
  ]
    .filter(Boolean)
    .join(" ");
}

// ── Asset Flattening ───────────────────────────────────────────────

function shouldIncludeGroup(folder) {
  if (!ONLY_GROUPS) return true;
  return ONLY_GROUPS.has(folder);
}

function flattenAssets() {
  const items = [];
  for (const group of ASSET_GROUPS) {
    if (!shouldIncludeGroup(group.folder)) continue;
    for (const asset of group.assets) {
      for (const variant of asset.variants) {
        const subdir =
          PROFILE.category === "production" ? "production" : "concept";
        items.push({
          group,
          asset,
          variant,
          outputPath: path.join(
            OUTPUT_BASE,
            subdir,
            group.folder,
            `${asset.slug}-${variant.letter}.${PROFILE.extension}`
          ),
        });
      }
    }
  }
  return items;
}

// ── Directory Setup ────────────────────────────────────────────────

function ensureDirectories() {
  const subdir = PROFILE.category === "production" ? "production" : "concept";
  for (const group of ASSET_GROUPS) {
    if (!shouldIncludeGroup(group.folder)) continue;
    const dir = path.join(OUTPUT_BASE, subdir, group.folder);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ── Download Helper ────────────────────────────────────────────────

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const protocol = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destination);

    protocol
      .get(url, (response) => {
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          file.close();
          try {
            fs.unlinkSync(destination);
          } catch (_) {}
          downloadFile(response.headers.location, destination)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          try {
            fs.unlinkSync(destination);
          } catch (_) {}
          reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", (err) => {
        file.close();
        try {
          fs.unlinkSync(destination);
        } catch (_) {}
        reject(err);
      });
  });
}

// ── Output Extraction ──────────────────────────────────────────────

function extractOutputUrls(output) {
  if (typeof output === "string") return [output];

  if (Array.isArray(output)) {
    return output.map((item) => {
      if (typeof item === "string") return item;
      if (item?.url && typeof item.url === "function")
        return item.url().toString();
      if (item?.url) return item.url;
      return String(item);
    });
  }

  if (output?.url) {
    return [
      typeof output.url === "function" ? output.url().toString() : output.url,
    ];
  }

  if (output?.output) return extractOutputUrls(output.output);
  return [];
}

async function saveModelOutput(outputPath, output) {
  // Replicate SDK returns FileOutput objects — normalize to URL string and download
  const urls = extractOutputUrls(output).filter(
    (v) => typeof v === "string" && v.startsWith("http")
  );

  if (urls.length > 0) {
    await downloadFile(urls[0], outputPath);
    return urls[0];
  }

  // Fallback: raw string content (e.g. inline SVG)
  if (typeof output === "string") {
    fs.writeFileSync(outputPath, output, "utf8");
    return null;
  }

  throw new Error("No downloadable output URL found.");
}

// ── Retry Logic ────────────────────────────────────────────────────

function getRetryDelay(error, attempt) {
  const match = error?.message?.match(/retry_after":(\d+)/i);
  if (match) return Number(match[1]);
  return 2 ** attempt;
}

async function retryRun(prompt, outputPath, attempt = 1) {
  try {
    const output = await replicate.run(PROFILE.model, {
      input: PROFILE.inputFromPrompt(prompt),
    });
    const deliveryUrl = await saveModelOutput(outputPath, output);
    return { deliveryUrl };
  } catch (error) {
    const status = error?.status ?? error?.response?.status;
    if ((status === 429 || status === 503) && attempt < 4) {
      const backoffMs = getRetryDelay(error, attempt) * 1000;
      console.warn(
        `   Retry ${attempt}/3 after ${backoffMs}ms (${status ?? "transient"}).`
      );
      await new Promise((r) => setTimeout(r, backoffMs));
      return retryRun(prompt, outputPath, attempt + 1);
    }
    throw error;
  }
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  ensureDirectories();

  const items = flattenAssets();
  const estimatedCost = (items.length * PROFILE.costPerOutput).toFixed(2);

  console.log(
    "════════════════════════════════════════════════════════════════"
  );
  console.log("Alex Command Center — Icon Generator");
  console.log(
    "════════════════════════════════════════════════════════════════"
  );
  console.log(`Profile:    ${PROFILE_KEY}`);
  console.log(`Model:      ${PROFILE.model}`);
  console.log(`Output:     ${OUTPUT_BASE}/${PROFILE.category === "production" ? "production" : "concept"}/`);
  console.log(`Assets:     ${items.length}`);
  console.log(`Est. cost:  ~$${estimatedCost}`);
  console.log(`Delay:      ${DELAY_MS}ms between calls`);
  console.log(`Dry-run:    ${DRY_RUN}`);
  console.log(`Force:      ${FORCE}`);
  if (ONLY_GROUPS) {
    console.log(`Groups:     ${Array.from(ONLY_GROUPS).join(", ")}`);
  }
  console.log(
    "════════════════════════════════════════════════════════════════\n"
  );

  const startedAt = new Date().toISOString();
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const { group, asset, variant, outputPath } = items[i];
    const relPath = path
      .relative(path.join(__dirname), outputPath)
      .replace(/\\/g, "/");
    const prompt = buildPrompt(group, asset, variant);

    console.log(
      `[${i + 1}/${items.length}] ${group.folder}/${asset.slug}-${variant.letter}.${PROFILE.extension}`
    );
    console.log(`   ${asset.label} — ${variant.concept}`);

    if (!FORCE && fs.existsSync(outputPath)) {
      console.log("   Skipped (exists, use --force to overwrite).");
      results.push({
        group: group.folder,
        slug: asset.slug,
        variant: variant.letter,
        outputPath: relPath,
        prompt,
        status: "skipped",
      });
      continue;
    }

    if (DRY_RUN) {
      console.log(`   [DRY-RUN] ${prompt.substring(0, 120)}...`);
      results.push({
        group: group.folder,
        slug: asset.slug,
        variant: variant.letter,
        outputPath: relPath,
        prompt,
        status: "dry-run",
      });
      continue;
    }

    try {
      const { deliveryUrl } = await retryRun(prompt, outputPath);
      console.log(`   Saved: ${relPath}`);
      results.push({
        group: group.folder,
        slug: asset.slug,
        variant: variant.letter,
        outputPath: relPath,
        prompt,
        deliveryUrl,
        status: "success",
      });
    } catch (error) {
      console.error(`   Failed: ${error.message}`);
      results.push({
        group: group.folder,
        slug: asset.slug,
        variant: variant.letter,
        outputPath: relPath,
        prompt,
        status: "failed",
        error: error.message,
      });
    }

    if (i < items.length - 1 && DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  // ── Report ─────────────────────────────────────────────────────

  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    profile: PROFILE_KEY,
    model: PROFILE.model,
    assetCount: items.length,
    estimatedCostUsd: parseFloat(estimatedCost),
    delayMs: DELAY_MS,
    dryRun: DRY_RUN,
    force: FORCE,
    onlyGroups: ONLY_GROUPS ? Array.from(ONLY_GROUPS) : null,
    summary: { success: succeeded, failed, skipped },
    results,
  };

  const reportPath = path.join(
    __dirname,
    "media",
    `generation-report.${PROFILE_KEY}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(
    "\n════════════════════════════════════════════════════════════════"
  );
  console.log("Generation complete");
  console.log(`Success: ${succeeded}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Report:  ${reportPath}`);
  console.log(
    "════════════════════════════════════════════════════════════════"
  );

  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
