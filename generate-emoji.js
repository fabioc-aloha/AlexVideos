/**
 * Alex Emoji Generator — Text/Image to Emoji-style images via Replicate
 *
 * Usage:
 *   node generate-emoji.js "a happy dog" --model sdxlemoji
 *   node generate-emoji.js "a blue coffee mug" --model platmoji --count 4
 *   node generate-emoji.js "fire sword icon" --model fluxico --format png
 *   node generate-emoji.js --model kontextemoji --image ./photo.jpg
 *
 * Models:
 *   sdxlemoji     — SDXL Emoji (default, Apple-style, 11.8M runs)
 *   platmoji      — Platmoji (Flux fine-tune, flat vector style, 148K runs)
 *   fluxico       — Flux ICO (icons & emojis, 20K runs)
 *   kontextemoji  — Kontext Emoji Maker (photo→emoji, $0.03/run)
 *
 * Options:
 *   --model <name>      Emoji model to use (default: sdxlemoji)
 *   --image <path>      Input image for img2img or emoji conversion
 *   --seed <n>          Random seed for reproducibility
 *   --count <n>         Number of outputs, 1-4 (default: 1)
 *   --width <n>         Width (sdxlemoji, platmoji, fluxico)
 *   --height <n>        Height (sdxlemoji, platmoji, fluxico)
 *   --aspect <ratio>    Aspect ratio e.g. 1:1 (platmoji, fluxico)
 *   --steps <n>         Inference steps
 *   --guidance <n>      Guidance scale
 *   --format <str>      Output format: webp, png, jpg (default: webp)
 *   --quality <n>       Output quality 0-100 (default: 80)
 *   --negative <str>    Negative prompt (sdxlemoji)
 *   --strength <n>      Prompt strength for img2img (0-1)
 *   --lora <n>          LoRA scale (model-specific)
 *   --scheduler <str>   Scheduler (sdxlemoji: K_EULER, etc.)
 *   --refine <str>      Refiner: no_refiner, expert_ensemble (sdxlemoji)
 *   --refinesteps <n>   Refiner steps (sdxlemoji)
 *   --watermark         Apply watermark (sdxlemoji, default: true)
 *   --nowatermark       Disable watermark
 *   --nosafety          Disable safety checker
 *   --fast              Enable go_fast mode (platmoji, fluxico)
 *   --lorastrength <n>  LoRA strength for kontextemoji
 *   --prompt <str>      Text prompt (also positional arg)
 */

require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ── Image to Data URI Helper ───────────────────────────────────────
function imageToDataUri(imagePath) {
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) {
    return imagePath;
  }

  const resolved = path.resolve(imagePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Image not found: ${resolved}`);
  }

  const ext = path.extname(resolved).toLowerCase();
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const mime = mimeTypes[ext] || "image/jpeg";
  const data = fs.readFileSync(resolved);
  const base64 = data.toString("base64");
  const sizeMB = (data.length / (1024 * 1024)).toFixed(2);
  console.log(`   Image:    ${path.basename(resolved)} (${sizeMB} MB, ${mime})`);
  return `data:${mime};base64,${base64}`;
}

// ── Model Definitions ──────────────────────────────────────────────
const MODELS = {
  sdxlemoji: {
    id: "fofr/sdxl-emoji",
    name: "SDXL Emoji",
    style: "Apple emoji",
    cost: "per-second GPU",
    supportsImage: true,
    outputType: "uri-array",
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt: prompt || "an emoji of a smiling face",
        width: opts.width || 1024,
        height: opts.height || 1024,
      };
      if (imageUri) input.image = imageUri;
      if (opts.mask) input.mask = imageToDataUri(opts.mask);
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.count != null) input.num_outputs = opts.count;
      if (opts.steps != null) input.num_inference_steps = opts.steps;
      if (opts.guidance != null) input.guidance_scale = opts.guidance;
      if (opts.negative) input.negative_prompt = opts.negative;
      if (opts.strength != null) input.prompt_strength = opts.strength;
      if (opts.lora != null) input.lora_scale = opts.lora;
      if (opts.scheduler) input.scheduler = opts.scheduler;
      if (opts.refine) input.refine = opts.refine;
      if (opts.refinesteps != null) input.refine_steps = opts.refinesteps;
      if (opts.watermark === false) input.apply_watermark = false;
      if (opts.nosafety) input.disable_safety_checker = true;
      return input;
    },
  },
  platmoji: {
    id: "appmeloncreator/platmoji-beta",
    name: "Platmoji",
    style: "flat vector emoji",
    cost: "per-second GPU",
    supportsImage: true,
    outputType: "uri-array",
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt: prompt || "a platmoji emoji",
      };
      if (imageUri) input.image = imageUri;
      if (opts.mask) input.mask = imageToDataUri(opts.mask);
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.width != null) input.width = opts.width;
      if (opts.height != null) input.height = opts.height;
      if (opts.count != null) input.num_outputs = opts.count;
      if (opts.aspect) input.aspect_ratio = opts.aspect;
      if (opts.format) input.output_format = opts.format;
      if (opts.quality != null) input.output_quality = opts.quality;
      if (opts.steps != null) input.num_inference_steps = opts.steps;
      if (opts.guidance != null) input.guidance_scale = opts.guidance;
      if (opts.strength != null) input.prompt_strength = opts.strength;
      if (opts.lora != null) input.lora_scale = opts.lora;
      if (opts.fast) input.go_fast = true;
      if (opts.nosafety) input.disable_safety_checker = true;
      return input;
    },
  },
  fluxico: {
    id: "miike-ai/flux-ico",
    name: "Flux ICO",
    style: "icons & emojis",
    cost: "per-second GPU",
    supportsImage: true,
    outputType: "uri-array",
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt: prompt || "an icon emoji",
      };
      if (imageUri) input.image = imageUri;
      if (opts.mask) input.mask = imageToDataUri(opts.mask);
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.width != null) input.width = opts.width;
      if (opts.height != null) input.height = opts.height;
      if (opts.count != null) input.num_outputs = opts.count;
      if (opts.aspect) input.aspect_ratio = opts.aspect;
      if (opts.format) input.output_format = opts.format;
      if (opts.quality != null) input.output_quality = opts.quality;
      if (opts.steps != null) input.num_inference_steps = opts.steps;
      if (opts.guidance != null) input.guidance_scale = opts.guidance;
      if (opts.strength != null) input.prompt_strength = opts.strength;
      if (opts.lora != null) input.lora_scale = opts.lora;
      if (opts.fast) input.go_fast = true;
      if (opts.nosafety) input.disable_safety_checker = true;
      return input;
    },
  },
  kontextemoji: {
    id: "flux-kontext-apps/kontext-emoji-maker",
    name: "Kontext Emoji Maker",
    style: "photo → emoji",
    cost: "$0.03/run",
    supportsImage: true,
    outputType: "uri",
    buildInput: (prompt, imageUri, opts) => {
      const input = {};
      if (imageUri) input.input_image = imageUri;
      if (prompt) input.prompt = prompt;
      else input.prompt = "Turn this image into the emoji style of Apple iOS system";
      if (opts.aspect) input.aspect_ratio = opts.aspect;
      if (opts.lorastrength != null) input.lora_strength = opts.lorastrength;
      if (opts.format) input.output_format = opts.format;
      return input;
    },
  },
};

// ── Argument Parser ────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    prompt: "",
    model: "sdxlemoji",
    image: null,
    mask: null,
    seed: null,
    count: null,
    width: null,
    height: null,
    aspect: null,
    steps: null,
    guidance: null,
    format: null,
    quality: null,
    negative: null,
    strength: null,
    lora: null,
    scheduler: null,
    refine: null,
    refinesteps: null,
    watermark: null,
    nosafety: false,
    fast: false,
    lorastrength: null,
  };

  const positional = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--model": result.model = args[++i]; break;
      case "--image": result.image = args[++i]; break;
      case "--mask": result.mask = args[++i]; break;
      case "--seed": result.seed = parseInt(args[++i], 10); break;
      case "--count": result.count = parseInt(args[++i], 10); break;
      case "--width": result.width = parseInt(args[++i], 10); break;
      case "--height": result.height = parseInt(args[++i], 10); break;
      case "--aspect": result.aspect = args[++i]; break;
      case "--steps": result.steps = parseInt(args[++i], 10); break;
      case "--guidance": result.guidance = parseFloat(args[++i]); break;
      case "--format": result.format = args[++i]; break;
      case "--quality": result.quality = parseInt(args[++i], 10); break;
      case "--negative": result.negative = args[++i]; break;
      case "--strength": result.strength = parseFloat(args[++i]); break;
      case "--lora": result.lora = parseFloat(args[++i]); break;
      case "--scheduler": result.scheduler = args[++i]; break;
      case "--refine": result.refine = args[++i]; break;
      case "--refinesteps": result.refinesteps = parseInt(args[++i], 10); break;
      case "--watermark": result.watermark = true; break;
      case "--nowatermark": result.watermark = false; break;
      case "--nosafety": result.nosafety = true; break;
      case "--fast": result.fast = true; break;
      case "--lorastrength": result.lorastrength = parseFloat(args[++i]); break;
      case "--prompt": result.prompt = args[++i]; break;
      default:
        if (args[i].startsWith("--")) {
          console.warn(`Unknown option: ${args[i]}`);
        } else {
          positional.push(args[i]);
        }
    }
  }

  if (positional.length > 0 && !result.prompt) {
    result.prompt = positional.join(" ");
  }
  return result;
}

// ── Download Helper ────────────────────────────────────────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(destPath);

    proto
      .get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          fs.unlinkSync(destPath);
          return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          return reject(new Error(`Download failed: HTTP ${response.statusCode}`));
        }

        response.pipe(file);
        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
  });
}

// ── Exponential Backoff Retry ──────────────────────────────────────
async function runWithRetry(replicate, modelId, input, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await replicate.run(modelId, { input });
    } catch (err) {
      const is429 = err.message?.includes("429") || err.status === 429;
      if (is429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`  ⏳ Rate limited. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// ── Extract URLs from output ───────────────────────────────────────
function extractImageUrls(output) {
  if (typeof output === "string") return [output];
  if (Array.isArray(output)) {
    return output.map((item) => {
      if (typeof item === "string") return item;
      if (item?.url && typeof item.url === "function") return item.url().toString();
      if (item?.url) return item.url;
      return String(item);
    });
  }
  if (output?.url) {
    if (typeof output.url === "function") return [output.url().toString()];
    return [output.url];
  }
  if (output?.output) return extractImageUrls(output.output);
  return [];
}

// ── Show Help ──────────────────────────────────────────────────────
function showHelp() {
  console.log('Usage: node generate-emoji.js "a happy dog" --model sdxlemoji');
  console.log('       node generate-emoji.js --model kontextemoji --image ./photo.jpg');
  console.log("\nModels:");
  for (const [key, m] of Object.entries(MODELS)) {
    const img = m.supportsImage ? "🖼️" : "  ";
    const defaultTag = key === "sdxlemoji" ? " (default)" : "";
    const price = m.cost ? ` [${m.cost}]` : "";
    console.log(`  ${key.padEnd(14)} ${img} ${m.name} — ${m.style}${defaultTag}${price}`);
  }
  console.log("\nCommon Options:");
  console.log("  --model <name>      Emoji model (default: sdxlemoji)");
  console.log("  --image <path>      Input image for img2img or conversion");
  console.log("  --seed <n>          Random seed");
  console.log("  --count <n>         Number of outputs, 1-4 (default: 1)");
  console.log("  --steps <n>         Inference steps");
  console.log("  --guidance <n>      Guidance scale");
  console.log("  --format <str>      Output format: webp, png, jpg");
  console.log("  --quality <n>       Output quality 0-100 (default: 80)");
  console.log("  --strength <n>      Prompt strength for img2img");
  console.log("  --lora <n>          LoRA scale");
  console.log("  --nosafety          Disable safety checker");
  console.log("\nSDXL Emoji Options:");
  console.log("  --width <n>         Width (default: 1024)");
  console.log("  --height <n>        Height (default: 1024)");
  console.log("  --negative <str>    Negative prompt");
  console.log("  --scheduler <str>   Scheduler (K_EULER, etc.)");
  console.log("  --refine <str>      Refiner: no_refiner, expert_ensemble");
  console.log("  --refinesteps <n>   Refiner steps");
  console.log("  --nowatermark       Disable watermark");
  console.log("\nPlatmoji / Flux ICO Options:");
  console.log("  --aspect <ratio>    Aspect ratio (1:1, 16:9, etc.)");
  console.log("  --fast              Enable go_fast mode");
  console.log("\nKontext Emoji Maker Options:");
  console.log("  --lorastrength <n>  LoRA strength (default: 1)");
  console.log("  --aspect <ratio>    Aspect ratio (match_input_image)");
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();
  const modelKey = opts.model;

  const modelDef = MODELS[modelKey];
  if (!modelDef) {
    console.error(`Unknown model: "${modelKey}". Available: ${Object.keys(MODELS).join(", ")}`);
    process.exit(1);
  }

  const hasImage = !!opts.image;
  const hasText = !!opts.prompt;

  if (!hasImage && !hasText) {
    showHelp();
    process.exit(1);
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN in .env file");
    process.exit(1);
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  // Ensure output directory
  const outputDir = path.join(__dirname, "media/images");
  fs.mkdirSync(outputDir, { recursive: true });

  // Resolve image
  let imageUri = null;
  if (opts.image) {
    imageUri = imageToDataUri(opts.image);
  }

  // Display generation info
  console.log(`\n😀 Generating emoji with ${modelDef.name}`);
  if (hasText) console.log(`   Prompt:   "${opts.prompt}"`);
  console.log(`   Model:    ${modelDef.id}`);
  console.log(`   Style:    ${modelDef.style}`);
  if (opts.image) console.log(`   Image:    ${opts.image}`);
  if (opts.count != null) console.log(`   Count:    ${opts.count}`);
  if (opts.seed != null) console.log(`   Seed:     ${opts.seed}`);
  if (opts.format) console.log(`   Format:   ${opts.format}`);
  if (opts.steps != null) console.log(`   Steps:    ${opts.steps}`);
  if (opts.guidance != null) console.log(`   Guidance: ${opts.guidance}`);
  console.log("");

  const startTime = Date.now();

  try {
    const input = modelDef.buildInput(opts.prompt, imageUri, opts);
    console.log("⏳ Running prediction...\n");
    const output = await runWithRetry(replicate, modelDef.id, input);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const textForName = opts.prompt || (opts.image ? path.basename(opts.image, path.extname(opts.image)) : "emoji");
    const sanitized = textForName
      .substring(0, 40)
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    const urls = extractImageUrls(output);
    if (urls.length === 0) {
      console.log("Raw output:", JSON.stringify(output, null, 2));
      throw new Error("No output URLs found");
    }

    const savedFiles = [];
    const ext = opts.format || "webp";

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      if (!url || !url.startsWith("http")) continue;

      const suffix = urls.length > 1 ? `_${i + 1}` : "";
      const filename = `${timestamp}_${modelKey}_${sanitized}${suffix}.${ext}`;
      const outputPath = path.join(outputDir, filename);

      console.log(`📥 Downloading ${i + 1}/${urls.length}...`);
      await downloadFile(url, outputPath);
      const fileSize = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
      savedFiles.push({ filename, fileSize, url });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Save generation report
    const report = {
      prompt: opts.prompt || null,
      model: modelDef.id,
      modelName: modelDef.name,
      style: modelDef.style,
      referenceImage: opts.image || null,
      seed: opts.seed ?? null,
      count: opts.count ?? 1,
      format: opts.format || "webp",
      steps: opts.steps ?? null,
      guidance: opts.guidance ?? null,
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}s`,
      files: savedFiles.map((f) => ({
        name: f.filename,
        size: `${f.fileSize}MB`,
        url: f.url,
      })),
    };
    const reportFilename = `${timestamp}_${modelKey}_${sanitized}.json`;
    const reportPath = path.join(outputDir, reportFilename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Emoji generation complete!`);
    for (const f of savedFiles) {
      console.log(`   File: media/images/${f.filename} (${f.fileSize} MB)`);
    }
    console.log(`   Time: ${elapsed}s`);
    console.log(`   Report: media/images/${reportFilename}`);
  } catch (err) {
    console.error(`\n❌ Generation failed: ${err.message}`);
    if (err.message?.includes("safety") || err.message?.includes("blocked")) {
      console.error("   Hint: Content may have been flagged by safety filters");
    }
    if (err.message?.includes("401") || err.message?.includes("auth")) {
      console.error("   Hint: Check your REPLICATE_API_TOKEN in .env");
    }
    process.exit(1);
  }
}

main();
