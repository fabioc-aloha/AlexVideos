/**
 * Alex Image Editor — Edit Images via Replicate
 *
 * Usage:
 *   node generate-edit-image.js "Make the dress red" --image photo.jpg
 *   node generate-edit-image.js "Remove the person" --image photo.jpg --model eraser --mask mask.png
 *   node generate-edit-image.js "A beach at sunset" --image photo.jpg --model bggen
 *   node generate-edit-image.js --image old-photo.jpg --model restore
 *   node generate-edit-image.js --image photo.jpg --model rembg
 *   node generate-edit-image.js --image photo.jpg --model upscale --scale 4
 *   node generate-edit-image.js "Expand to widescreen" --image photo.jpg --model expand --aspect 16:9
 *   node generate-edit-image.js "Add a hat" --image photo.jpg --model genfill --mask mask.png
 *
 * Models:
 *   nana       — Nano Banana (default, Google Gemini 2.5, general editing, multi-image)
 *   pedit      — P-Image-Edit (sub 1 second, $0.01, fast/cheap editing)
 *   kontext    — FLUX Kontext Pro (text-based editing, style transfer, object changes)
 *   kontextmax — FLUX Kontext Max (premium text-based editing, better typography)
 *   fillpro    — FLUX Fill Pro (inpainting/outpainting with mask, $0.05)
 *   eraser     — Bria Eraser (SOTA object removal with mask, $0.04)
 *   genfill    — Bria GenFill (generative fill/add objects with mask+prompt)
 *   expand     — Bria Expand (outpainting, expand image beyond borders)
 *   bggen      — Bria Background Gen (background replacement via prompt)
 *   restore    — FLUX Restore (fix scratches, colorize old photos)
 *   rembg      — Bria Remove BG (background removal, transparent output)
 *   upscale    — Real-ESRGAN (image upscaling 2x–10x, optional face enhance)
 *
 * Options:
 *   --model <name>       Editing model to use (default: nana)
 *   --image <path>       Input image to edit (required, local file or URL)
 *   --mask <path>        Mask image for inpainting (white=edit, black=keep)
 *   --aspect <ratio>     Target aspect ratio (e.g., 1:1, 16:9, 9:16)
 *   --format <fmt>       Output format (jpg, png, webp)
 *   --seed <number>      Random seed for reproducible results
 *   --scale <number>     Upscale factor for upscale model (2–10, default: 4)
 *   --outpaint <preset>  Outpaint preset for fillpro (e.g., "Zoom out 2x")
 */

require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ── Model Definitions ──────────────────────────────────────────────
const MODELS = {
  nana: {
    id: "google/nano-banana",
    name: "Nano Banana",
    needsPrompt: true,
    needsMask: false,
    cost: "$0.039",
    buildInput: (prompt, imageUri, maskUri, opts) => {
      const input = {
        prompt,
        image_input: [imageUri],
        aspect_ratio: opts.aspect || "match_input_image",
        output_format: opts.format || "jpg",
      };
      return input;
    },
  },
  pedit: {
    id: "prunaai/p-image-edit",
    name: "P-Image-Edit",
    needsPrompt: true,
    needsMask: false,
    cost: "$0.01",
    buildInput: (prompt, imageUri, maskUri, opts) => {
      const input = {
        prompt,
        images: [imageUri],
        turbo: true,
        aspect_ratio: opts.aspect || "match_input_image",
      };
      if (opts.seed != null) input.seed = opts.seed;
      return input;
    },
  },
  kontext: {
    id: "black-forest-labs/flux-kontext-pro",
    name: "FLUX Kontext Pro",
    needsPrompt: true,
    needsMask: false,
    cost: "$0.04",
    buildInput: (prompt, imageUri, maskUri, opts) => {
      const input = {
        prompt,
        input_image: imageUri,
        aspect_ratio: opts.aspect || "match_input_image",
        output_format: opts.format || "png",
        safety_tolerance: 2,
      };
      if (opts.seed != null) input.seed = opts.seed;
      return input;
    },
  },
  kontextmax: {
    id: "black-forest-labs/flux-kontext-max",
    name: "FLUX Kontext Max",
    needsPrompt: true,
    needsMask: false,
    cost: "variable",
    buildInput: (prompt, imageUri, maskUri, opts) => {
      const input = {
        prompt,
        input_image: imageUri,
        aspect_ratio: opts.aspect || "match_input_image",
        output_format: opts.format || "png",
        safety_tolerance: 2,
      };
      if (opts.seed != null) input.seed = opts.seed;
      return input;
    },
  },
  fillpro: {
    id: "black-forest-labs/flux-fill-pro",
    name: "FLUX Fill Pro",
    needsPrompt: true,
    needsMask: true,
    cost: "$0.05",
    buildInput: (prompt, imageUri, maskUri, opts) => {
      const input = {
        prompt,
        image: imageUri,
        output_format: opts.format || "jpg",
        steps: 50,
        guidance: 60,
        safety_tolerance: 2,
      };
      if (maskUri) input.mask = maskUri;
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.outpaint) input.outpaint = opts.outpaint;
      return input;
    },
  },
  eraser: {
    id: "bria/eraser",
    name: "Bria Eraser",
    needsPrompt: false,
    needsMask: true,
    cost: "$0.04",
    buildInput: (prompt, imageUri, maskUri, opts) => {
      const input = {
        image: imageUri,
        sync: true,
        preserve_alpha: true,
      };
      if (maskUri) input.mask = maskUri;
      return input;
    },
  },
  genfill: {
    id: "bria/genfill",
    name: "Bria GenFill",
    needsPrompt: true,
    needsMask: true,
    cost: "variable",
    buildInput: (prompt, imageUri, maskUri, opts) => {
      const input = {
        prompt,
        image: imageUri,
        sync: true,
        preserve_alpha: true,
      };
      if (maskUri) input.mask = maskUri;
      if (opts.seed != null) input.seed = opts.seed;
      return input;
    },
  },
  expand: {
    id: "bria/expand-image",
    name: "Bria Expand",
    needsPrompt: false,
    needsMask: false,
    cost: "$0.04",
    buildInput: (prompt, imageUri, maskUri, opts) => {
      const input = {
        image: imageUri,
        aspect_ratio: opts.aspect || "16:9",
        sync: true,
        preserve_alpha: true,
      };
      if (prompt) input.prompt = prompt;
      if (opts.seed != null) input.seed = opts.seed;
      return input;
    },
  },
  bggen: {
    id: "bria/generate-background",
    name: "Bria Background Gen",
    needsPrompt: true,
    needsMask: false,
    cost: "$0.04",
    buildInput: (prompt, imageUri, maskUri, opts) => {
      const input = {
        image: imageUri,
        bg_prompt: prompt,
        sync: true,
        refine_prompt: true,
      };
      if (opts.seed != null) input.seed = opts.seed;
      return input;
    },
  },
  restore: {
    id: "flux-kontext-apps/restore-image",
    name: "FLUX Restore",
    needsPrompt: false,
    needsMask: false,
    cost: "$0.04",
    buildInput: (prompt, imageUri, maskUri, opts) => {
      const input = {
        input_image: imageUri,
        output_format: opts.format || "png",
        safety_tolerance: 2,
      };
      if (opts.seed != null) input.seed = opts.seed;
      return input;
    },
  },
  rembg: {
    id: "bria/remove-background",
    name: "Bria Remove BG",
    needsPrompt: false,
    needsMask: false,
    cost: "variable",
    buildInput: (prompt, imageUri, maskUri, opts) => ({
      image: imageUri,
      sync: true,
    }),
  },
  upscale: {
    id: "nightmareai/real-esrgan",
    name: "Real-ESRGAN",
    needsPrompt: false,
    needsMask: false,
    cost: "variable",
    buildInput: (prompt, imageUri, maskUri, opts) => ({
      image: imageUri,
      scale: opts.scale || 4,
      face_enhance: opts.faceEnhance || false,
    }),
  },
};

// ── CLI Argument Parsing ───────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    prompt: null,
    model: "nana",
    image: null,
    mask: null,
    aspect: null,
    format: null,
    seed: null,
    scale: null,
    outpaint: null,
    faceEnhance: false,
  };

  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" && args[i + 1]) {
      result.model = args[++i].toLowerCase();
    } else if (args[i] === "--image" && args[i + 1]) {
      result.image = args[++i];
    } else if (args[i] === "--mask" && args[i + 1]) {
      result.mask = args[++i];
    } else if ((args[i] === "--aspect" || args[i] === "--ratio") && args[i + 1]) {
      result.aspect = args[++i];
    } else if (args[i] === "--format" && args[i + 1]) {
      result.format = args[++i];
    } else if (args[i] === "--seed" && args[i + 1]) {
      result.seed = parseInt(args[++i], 10);
    } else if (args[i] === "--scale" && args[i + 1]) {
      result.scale = parseInt(args[++i], 10);
    } else if (args[i] === "--outpaint" && args[i + 1]) {
      result.outpaint = args[++i];
    } else if (args[i] === "--face-enhance") {
      result.faceEnhance = true;
    } else {
      positional.push(args[i]);
    }
  }

  result.prompt = positional.join(" ") || null;
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
  console.log(`   File:     ${path.basename(resolved)} (${sizeMB} MB, ${mime})`);
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
  const { prompt, model: modelKey, image, mask, aspect, format, seed, scale, outpaint, faceEnhance } = parseArgs();

  if (!image) {
    console.log('Usage: node generate-edit-image.js "Your edit instruction" --image photo.jpg [options]');
    console.log("\nModels:");
    for (const [key, m] of Object.entries(MODELS)) {
      const p = m.needsPrompt ? "💬" : "  ";
      const mk = m.needsMask ? "🎭" : "  ";
      const defaultTag = key === "nana" ? " (default)" : "";
      const price = m.cost ? ` [${m.cost}]` : "";
      console.log(`  ${key.padEnd(12)} ${p} ${mk} ${m.name}${defaultTag}${price}`);
    }
    console.log("\n  💬 = needs prompt   🎭 = supports mask");
    console.log("\nOptions:");
    console.log("  --model <name>       Editing model (default: nana)");
    console.log("  --image <path>       Input image to edit (required)");
    console.log("  --mask <path>        Mask image (white=edit, black=keep)");
    console.log("  --aspect <ratio>     Target aspect ratio (1:1, 16:9, 9:16)");
    console.log("  --format <fmt>       Output format (jpg, png, webp)");
    console.log("  --seed <number>      Random seed for reproducibility");
    console.log("  --scale <number>     Upscale factor (2–10, upscale model only)");
    console.log("  --outpaint <preset>  Outpaint preset (fillpro: 'Zoom out 2x')");
    console.log("  --face-enhance       Enable face enhancement (upscale model)");
    console.log("\nExamples:");
    console.log('  node generate-edit-image.js "Make the dress red" --image photo.jpg');
    console.log('  node generate-edit-image.js --image photo.jpg --model eraser --mask mask.png');
    console.log('  node generate-edit-image.js --image photo.jpg --model restore');
    console.log('  node generate-edit-image.js --image photo.jpg --model rembg');
    console.log('  node generate-edit-image.js --image photo.jpg --model upscale --scale 4');
    console.log('  node generate-edit-image.js "In a park" --image photo.jpg --model bggen');
    process.exit(1);
  }

  const modelDef = MODELS[modelKey];
  if (!modelDef) {
    console.error(`Unknown model: "${modelKey}". Available: ${Object.keys(MODELS).join(", ")}`);
    process.exit(1);
  }

  if (modelDef.needsPrompt && !prompt) {
    console.error(`❌ ${modelDef.name} requires a text prompt. Usage:`);
    console.error(`   node generate-edit-image.js "Your edit instruction" --image photo.jpg --model ${modelKey}`);
    process.exit(1);
  }

  if (modelDef.needsMask && !mask) {
    const noMaskOk = modelKey === "fillpro" || modelKey === "genfill";
    if (!noMaskOk) {
      console.error(`❌ ${modelDef.name} requires a mask image. Usage:`);
      console.error(`   node generate-edit-image.js "prompt" --image photo.jpg --model ${modelKey} --mask mask.png`);
      process.exit(1);
    }
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN in .env file");
    process.exit(1);
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const opts = { aspect, format, seed, scale, outpaint, faceEnhance };

  // Ensure output directory
  const outputDir = path.join(__dirname, "media/images");
  fs.mkdirSync(outputDir, { recursive: true });

  // Resolve input image
  const imageUri = imageToDataUri(image);

  // Resolve mask if provided
  let maskUri = null;
  if (mask) {
    maskUri = imageToDataUri(mask);
  }

  const editType = modelDef.needsMask && mask ? "Mask-based" : modelDef.needsPrompt ? "Prompt-based" : "Automatic";

  console.log(`\n✏️  Editing image with ${modelDef.name}`);
  if (prompt) console.log(`   Prompt:   "${prompt}"`);
  console.log(`   Model:    ${modelDef.id}`);
  console.log(`   Input:    ${path.basename(image)}`);
  if (mask) console.log(`   Mask:     ${path.basename(mask)}`);
  if (aspect) console.log(`   Aspect:   ${aspect}`);
  if (format) console.log(`   Format:   ${format}`);
  if (seed != null) console.log(`   Seed:     ${seed}`);
  if (scale) console.log(`   Scale:    ${scale}x`);
  if (outpaint) console.log(`   Outpaint: ${outpaint}`);
  console.log(`   Mode:     ${editType}\n`);

  const startTime = Date.now();

  try {
    const input = modelDef.buildInput(prompt, imageUri, maskUri, opts);
    console.log("⏳ Running prediction (this may take a few seconds)...\n");
    const output = await runWithRetry(replicate, modelDef.id, input);

    const imageUrls = extractImageUrls(output);
    if (!imageUrls || imageUrls.length === 0) {
      console.log("Raw output:", JSON.stringify(output, null, 2));
      throw new Error("Could not extract image URL(s) from model output");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const sanitizedPrompt = (prompt || modelKey)
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
      prompt: prompt || null,
      model: modelDef.id,
      modelName: modelDef.name,
      editType,
      inputImage: path.basename(image),
      maskImage: mask ? path.basename(mask) : null,
      aspectRatio: aspect || "default",
      outputFormat: format || "default",
      seed: seed ?? null,
      scale: scale || null,
      outpaint: outpaint || null,
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}s`,
      files: savedFiles.map((f) => ({ name: f.filename, size: `${f.fileSize}MB`, url: f.url })),
    };
    const reportFilename = `${timestamp}_${modelKey}_${sanitizedPrompt}.json`;
    const reportPath = path.join(outputDir, reportFilename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Edited image${savedFiles.length > 1 ? "s" : ""} saved!`);
    for (const f of savedFiles) {
      console.log(`   File: media/images/${f.filename} (${f.fileSize} MB)`);
    }
    console.log(`   Time: ${elapsed}s`);
    console.log(`   Report: media/images/${reportFilename}`);
  } catch (err) {
    console.error(`\n❌ Editing failed: ${err.message}`);
    if (err.message?.includes("safety") || err.message?.includes("blocked")) {
      console.error("   Hint: Try adjusting safety settings or rephrasing your prompt");
    }
    if (err.message?.includes("mask")) {
      console.error("   Hint: This model requires a mask image. Use --mask mask.png");
    }
    process.exit(1);
  }
}

main();
