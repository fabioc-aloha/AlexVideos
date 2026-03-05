/**
 * Alex Image Generator — Text-to-Image via Replicate
 *
 * Usage:
 *   node generate-image.js "A cat wearing a top hat"
 *   node generate-image.js "A cat wearing a top hat" --model gptimage
 *   node generate-image.js "Add sunglasses" --model nanapro --image ./photo.jpg
 *   node generate-image.js "Sunset landscape" --aspect 16:9 --resolution 2K
 *   node generate-image.js "Logo design" --model recraft --style "flat_design"
 *
 * Models:
 *   nanapro    — Nano Banana Pro (default, Google SOTA, gen + edit, 14 ref images)
 *   gptimage   — GPT Image 1.5 (OpenAI, prompt adherence, transparent bg, batch)
 *   imagen4    — Imagen 4 (Google flagship, 1K/2K, safety filter)
 *   imagen4u   — Imagen 4 Ultra (Google, max quality, 1K/2K)
 *   imagen4f   — Imagen 4 Fast (Google, speed + cheap, $0.02)
 *   flux2max   — FLUX 2 Max (BFL, highest fidelity, 8 ref images, 4MP)
 *   flux2pro   — FLUX 2 Pro (BFL, high quality, 8 ref images, 4MP)
 *   seedream   — Seedream 4.5 (ByteDance, spatial, 4K, sequential gen)
 *   grok       — Grok Image (xAI, gen + edit, $0.02)
 *   ideoturbo  — Ideogram v3 Turbo (fast, cheap, text rendering, styles)
 *   ideoqual   — Ideogram v3 Quality (highest quality, text rendering, styles)
 *   recraft    — Recraft v4 (design taste, text rendering, prompt accuracy)
 *   minimax    — MiniMax Image-01 (character ref, batch up to 9, $0.01)
 *   photon     — Photon Flash (Luma, fast, image/style/character refs)
 *
 * Options:
 *   --model <name>       Image model to use (default: nanapro)
 *   --image <path>       Reference/input image (local file or URL)
 *   --aspect <ratio>     Aspect ratio (e.g., 1:1, 16:9, 9:16, 4:3, 3:2)
 *   --resolution <res>   Resolution (e.g., 1K, 2K, 4K, 1MP, 2MP)
 *   --style <type>       Style type (model-specific, e.g., "realistic", "design")
 *   --format <fmt>       Output format (jpg, png, webp)
 *   --seed <number>      Random seed for reproducible generation
 *   --count <n>          Number of images to generate (models that support batch)
 */

require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ── Model Definitions ──────────────────────────────────────────────
const MODELS = {
  nanapro: {
    id: "google/nano-banana-pro",
    name: "Nano Banana Pro",
    supportsImage: true,
    supportsCount: false,
    cost: "variable",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        resolution: opts.resolution || "2K",
        aspect_ratio: opts.aspect || "match_input_image",
        output_format: opts.format || "jpg",
        safety_filter_level: "block_only_high",
      };
      if (imageUri) input.image_input = [imageUri];
      if (!imageUri) input.aspect_ratio = opts.aspect || "1:1";
      return input;
    },
  },
  gptimage: {
    id: "openai/gpt-image-1.5",
    name: "GPT Image 1.5",
    supportsImage: true,
    supportsCount: true,
    maxCount: 10,
    cost: "variable",
    outputArray: true,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        quality: "auto",
        background: "auto",
        moderation: "auto",
        aspect_ratio: opts.aspect || "1:1",
        output_format: opts.format || "webp",
        input_fidelity: "low",
        number_of_images: opts.count || 1,
        output_compression: 90,
      };
      if (imageUri) input.input_images = [imageUri];
      return input;
    },
  },
  imagen4: {
    id: "google/imagen-4",
    name: "Imagen 4",
    supportsImage: false,
    supportsCount: false,
    cost: "$0.04",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => ({
      prompt,
      image_size: opts.resolution || "1K",
      aspect_ratio: opts.aspect || "1:1",
      output_format: opts.format || "jpg",
      safety_filter_level: "block_only_high",
    }),
  },
  imagen4u: {
    id: "google/imagen-4-ultra",
    name: "Imagen 4 Ultra",
    supportsImage: false,
    supportsCount: false,
    cost: "$0.06",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => ({
      prompt,
      image_size: opts.resolution || "1K",
      aspect_ratio: opts.aspect || "1:1",
      output_format: opts.format || "jpg",
      safety_filter_level: "block_only_high",
    }),
  },
  imagen4f: {
    id: "google/imagen-4-fast",
    name: "Imagen 4 Fast",
    supportsImage: false,
    supportsCount: false,
    cost: "$0.02",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => ({
      prompt,
      aspect_ratio: opts.aspect || "1:1",
      output_format: opts.format || "jpg",
      safety_filter_level: "block_only_high",
    }),
  },
  flux2max: {
    id: "black-forest-labs/flux-2-max",
    name: "FLUX 2 Max",
    supportsImage: true,
    supportsCount: false,
    cost: "variable",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        resolution: opts.resolution || "1 MP",
        aspect_ratio: opts.aspect || "1:1",
        output_format: opts.format || "webp",
        output_quality: 80,
        safety_tolerance: 2,
      };
      if (opts.seed != null) input.seed = opts.seed;
      if (imageUri) {
        input.input_images = [imageUri];
        input.aspect_ratio = "match_input_image";
      }
      if (opts.aspect === "custom" && opts.width && opts.height) {
        input.aspect_ratio = "custom";
        input.width = opts.width;
        input.height = opts.height;
      }
      return input;
    },
  },
  flux2pro: {
    id: "black-forest-labs/flux-2-pro",
    name: "FLUX 2 Pro",
    supportsImage: true,
    supportsCount: false,
    cost: "variable",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        resolution: opts.resolution || "1 MP",
        aspect_ratio: opts.aspect || "1:1",
        output_format: opts.format || "webp",
        output_quality: 80,
        safety_tolerance: 2,
      };
      if (opts.seed != null) input.seed = opts.seed;
      if (imageUri) {
        input.input_images = [imageUri];
        input.aspect_ratio = "match_input_image";
      }
      if (opts.aspect === "custom" && opts.width && opts.height) {
        input.aspect_ratio = "custom";
        input.width = opts.width;
        input.height = opts.height;
      }
      return input;
    },
  },
  seedream: {
    id: "bytedance/seedream-4.5",
    name: "Seedream 4.5",
    supportsImage: true,
    supportsCount: true,
    maxCount: 15,
    cost: "$0.04",
    outputArray: true,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        size: opts.resolution || "2K",
        aspect_ratio: opts.aspect || "match_input_image",
        max_images: opts.count || 1,
        sequential_image_generation: (opts.count || 1) > 1 ? "auto" : "disabled",
      };
      if (!imageUri) input.aspect_ratio = opts.aspect || "1:1";
      if (imageUri) input.image_input = [imageUri];
      if (opts.resolution === "custom" && opts.width && opts.height) {
        input.size = "custom";
        input.width = opts.width;
        input.height = opts.height;
      }
      return input;
    },
  },
  grok: {
    id: "xai/grok-imagine-image",
    name: "Grok Image",
    supportsImage: true,
    supportsCount: false,
    cost: "$0.02",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        aspect_ratio: opts.aspect || "1:1",
      };
      if (imageUri) input.image = imageUri;
      return input;
    },
  },
  ideoturbo: {
    id: "ideogram-ai/ideogram-v3-turbo",
    name: "Ideogram v3 Turbo",
    supportsImage: true,
    supportsCount: false,
    cost: "$0.03",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        aspect_ratio: opts.aspect || "1:1",
        magic_prompt_option: "Auto",
      };
      if (opts.resolution) input.resolution = opts.resolution;
      if (opts.style) input.style_type = opts.style;
      if (opts.seed != null) input.seed = opts.seed;
      if (imageUri) {
        input.image = imageUri;
        // Inpainting requires a mask — for style ref, use style_reference_images
        input.style_reference_images = [imageUri];
        delete input.image;
      }
      return input;
    },
  },
  ideoqual: {
    id: "ideogram-ai/ideogram-v3-quality",
    name: "Ideogram v3 Quality",
    supportsImage: true,
    supportsCount: false,
    cost: "$0.09",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        aspect_ratio: opts.aspect || "1:1",
        magic_prompt_option: "Auto",
      };
      if (opts.resolution) input.resolution = opts.resolution;
      if (opts.style) input.style_type = opts.style;
      if (opts.seed != null) input.seed = opts.seed;
      if (imageUri) {
        input.style_reference_images = [imageUri];
      }
      return input;
    },
  },
  recraft: {
    id: "recraft-ai/recraft-v4",
    name: "Recraft v4",
    supportsImage: false,
    supportsCount: false,
    cost: "$0.04",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        size: "1024x1024",
      };
      if (opts.aspect) input.aspect_ratio = opts.aspect;
      return input;
    },
  },
  minimax: {
    id: "minimax/image-01",
    name: "MiniMax Image-01",
    supportsImage: true,
    supportsCount: true,
    maxCount: 9,
    cost: "$0.01",
    outputArray: true,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        aspect_ratio: opts.aspect || "1:1",
        number_of_images: opts.count || 1,
        prompt_optimizer: true,
      };
      if (imageUri) input.subject_reference = imageUri;
      return input;
    },
  },
  photon: {
    id: "luma/photon-flash",
    name: "Photon Flash",
    supportsImage: true,
    supportsCount: false,
    cost: "$0.01",
    outputArray: false,
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        prompt,
        aspect_ratio: opts.aspect || "16:9",
      };
      if (opts.seed != null) input.seed = opts.seed;
      if (imageUri) {
        input.image_reference = imageUri;
        input.image_reference_weight = 0.85;
      }
      return input;
    },
  },
};

// ── CLI Argument Parsing ───────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    prompt: null,
    model: "nanapro",
    image: null,
    aspect: null,
    resolution: null,
    style: null,
    format: null,
    seed: null,
    count: null,
    width: null,
    height: null,
  };

  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" && args[i + 1]) {
      result.model = args[++i].toLowerCase();
    } else if (args[i] === "--image" && args[i + 1]) {
      result.image = args[++i];
    } else if ((args[i] === "--aspect" || args[i] === "--ratio") && args[i + 1]) {
      result.aspect = args[++i];
    } else if (args[i] === "--resolution" && args[i + 1]) {
      result.resolution = args[++i];
    } else if (args[i] === "--style" && args[i + 1]) {
      result.style = args[++i];
    } else if (args[i] === "--format" && args[i + 1]) {
      result.format = args[++i];
    } else if (args[i] === "--seed" && args[i + 1]) {
      result.seed = parseInt(args[++i], 10);
    } else if (args[i] === "--count" && args[i + 1]) {
      result.count = parseInt(args[++i], 10);
    } else if (args[i] === "--width" && args[i + 1]) {
      result.width = parseInt(args[++i], 10);
    } else if (args[i] === "--height" && args[i + 1]) {
      result.height = parseInt(args[++i], 10);
    } else {
      positional.push(args[i]);
    }
  }

  result.prompt = positional.join(" ");
  return result;
}

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

// ── Extract Image URLs from Output ─────────────────────────────────
function extractImageUrls(output) {
  if (typeof output === "string") return [output];
  if (Array.isArray(output)) {
    return output.map((item) => (typeof item === "string" ? item : item?.url || String(item)));
  }
  if (output?.url) return [typeof output.url === "function" ? output.url().toString() : output.url];
  if (output?.output) return Array.isArray(output.output) ? output.output : [output.output];
  return null;
}

// ── Determine file extension from URL or format ────────────────────
function getExtension(url, requestedFormat) {
  if (requestedFormat) {
    return requestedFormat === "jpg" ? "jpg" : requestedFormat;
  }
  if (url.includes(".png")) return "png";
  if (url.includes(".webp")) return "webp";
  if (url.includes(".jpg") || url.includes(".jpeg")) return "jpg";
  return "png";
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const { prompt, model: modelKey, image, aspect, resolution, style, format, seed, count, width, height } = parseArgs();

  if (!prompt) {
    console.log('Usage: node generate-image.js "Your prompt here" [--model nanapro] [--image photo.jpg]');
    console.log("\nModels:");
    for (const [key, m] of Object.entries(MODELS)) {
      const img = m.supportsImage ? "🖼️" : "  ";
      const batch = m.supportsCount ? `📦${m.maxCount}` : "    ";
      const defaultTag = key === "nanapro" ? " (default)" : "";
      const price = m.cost ? ` [${m.cost}]` : "";
      console.log(`  ${key.padEnd(10)} ${img} ${batch} ${m.name}${defaultTag}${price}`);
    }
    console.log("\nOptions:");
    console.log("  --model <name>       Image model (default: nanapro)");
    console.log("  --image <path>       Reference/input image (local file or URL)");
    console.log("  --aspect <ratio>     Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:2)");
    console.log("  --resolution <res>   Resolution (1K, 2K, 4K, 1MP, 2MP)");
    console.log("  --style <type>       Style type (model-specific)");
    console.log("  --format <fmt>       Output format (jpg, png, webp)");
    console.log("  --seed <number>      Random seed for reproducibility");
    console.log("  --count <n>          Number of images (batch-capable models)");
    console.log("  --width <px>         Custom width (flux2max, flux2pro, seedream)");
    console.log("  --height <px>        Custom height (flux2max, flux2pro, seedream)");
    process.exit(1);
  }

  const modelDef = MODELS[modelKey];
  if (!modelDef) {
    console.error(`Unknown model: "${modelKey}". Available: ${Object.keys(MODELS).join(", ")}`);
    process.exit(1);
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN in .env file");
    process.exit(1);
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const opts = { aspect, resolution, style, format, seed, count, width, height };

  // Ensure output directory
  const outputDir = path.join(__dirname, "media/images");
  fs.mkdirSync(outputDir, { recursive: true });

  // Resolve reference image if provided
  let imageUri = null;
  if (image) {
    if (!modelDef.supportsImage) {
      const imageModels = Object.entries(MODELS)
        .filter(([, m]) => m.supportsImage)
        .map(([k]) => k)
        .join(", ");
      console.error(`❌ ${modelDef.name} does not support image input. Try: ${imageModels}`);
      process.exit(1);
    }
    imageUri = imageToDataUri(image);
  }

  console.log(`\n🎨 Generating image with ${modelDef.name}`);
  console.log(`   Prompt:   "${prompt}"`);
  console.log(`   Model:    ${modelDef.id}`);
  if (aspect) console.log(`   Aspect:   ${aspect}`);
  if (resolution) console.log(`   Res:      ${resolution}`);
  if (style) console.log(`   Style:    ${style}`);
  if (format) console.log(`   Format:   ${format}`);
  if (seed != null) console.log(`   Seed:     ${seed}`);
  if (count) console.log(`   Count:    ${count}`);
  console.log(`   Mode:     ${imageUri ? "Image-to-Image 🖼️" : "Text-to-Image"}\n`);

  const startTime = Date.now();

  try {
    const input = modelDef.buildInput(prompt, imageUri, opts);
    console.log("⏳ Running prediction (this may take a few seconds)...\n");
    const output = await runWithRetry(replicate, modelDef.id, input);

    const imageUrls = extractImageUrls(output);
    if (!imageUrls || imageUrls.length === 0) {
      console.log("Raw output:", JSON.stringify(output, null, 2));
      throw new Error("Could not extract image URL(s) from model output");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const sanitizedPrompt = prompt
      .substring(0, 40)
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    const savedFiles = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const ext = getExtension(url, format);
      const suffix = imageUrls.length > 1 ? `_${i + 1}` : "";
      const filename = `${timestamp}_${modelKey}_${sanitizedPrompt}${suffix}.${ext}`;
      const outputPath = path.join(outputDir, filename);

      console.log(`📥 Downloading image${imageUrls.length > 1 ? ` ${i + 1}/${imageUrls.length}` : ""}...`);
      await downloadFile(url, outputPath);
      const fileSize = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
      savedFiles.push({ filename, fileSize, url });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Save generation report
    const report = {
      prompt,
      model: modelDef.id,
      modelName: modelDef.name,
      aspectRatio: aspect || "default",
      resolution: resolution || "default",
      style: style || null,
      outputFormat: format || "default",
      seed: seed ?? null,
      count: imageUrls.length,
      mode: imageUri ? "image-to-image" : "text-to-image",
      referenceImage: image || null,
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}s`,
      files: savedFiles.map((f) => ({ name: f.filename, size: `${f.fileSize}MB`, url: f.url })),
    };
    const reportFilename = `${timestamp}_${modelKey}_${sanitizedPrompt}.json`;
    const reportPath = path.join(outputDir, reportFilename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Image${savedFiles.length > 1 ? "s" : ""} saved!`);
    for (const f of savedFiles) {
      console.log(`   File: media/images/${f.filename} (${f.fileSize} MB)`);
    }
    console.log(`   Time: ${elapsed}s`);
    console.log(`   Report: media/images/${reportFilename}`);
  } catch (err) {
    console.error(`\n❌ Generation failed: ${err.message}`);
    if (err.message?.includes("safety") || err.message?.includes("blocked")) {
      console.error("   Hint: Try adjusting safety_filter_level or moderation settings");
    }
    process.exit(1);
  }
}

main();
