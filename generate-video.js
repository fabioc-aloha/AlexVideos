/**
 * Alex Video Generator — Text-to-Video via Replicate
 *
 * Usage:
 *   node generate-video.js "A cat playing piano in a jazz club"
 *   node generate-video.js "A cat playing piano" --model veo3
 *   node generate-video.js "A cat playing piano" --model grok --duration 10
 *   node generate-video.js "Person running" --model grok --image ./photo.jpg
 *   node generate-video.js "Sunset scene" --aspect 9:16 --resolution 1080p
 *
 * Models:
 *   veo3fast   — Veo 3.1 Fast (default, 4-8s, audio, last-frame interpolation)
 *   veo3       — Veo 3.1 (highest fidelity, 4-8s, audio, R2V reference images)
 *   grok       — Grok Video (1-15s, auto audio + lip-sync, video editing)
 *   gen45      — Gen-4.5 Runway (motion quality, 5-10s, img2vid)
 *   kling      — Kling v3 (cinematic 1080p, 3-15s, multi-shot, native audio)
 *   kling26    — Kling v2.6 (cinematic i2v, native audio, 5-10s)
 *   kling3omni — Kling v3 Omni (multimodal, ref images, video edit, audio, 3-15s)
 *   sora       — Sora-2 (realistic, synced audio, 4-12s)
 *   sora2pro   — Sora-2 Pro (highest quality, 4-12s, 1024p option)
 *   seedance   — Seedance Lite (budget, fast, 2-12s, reference images)
 *   seedpro    — Seedance Pro (pro, 2-12s, 1080p, multi-shot)
 *   pixverse   — PixVerse v5.6 (physics, effects, 5-10s, audio, thinking)
 *   hailuo     — Hailuo-02 (real-world physics, 6-10s, 1080p)
 *   hailuo23   — Hailuo-2.3 (human motion, VFX, 6-10s)
 *   ray2       — Ray 2 Luma (720p, 5/9s, camera concepts)
 *   rayflash   — Ray Flash 2 Luma (720p, 5/9s, fast + cheap)
 *   wan        — WAN 2.5 fast (budget, 5-10s, audio sync)
 *
 * Options:
 *   --model <name>       Video model to use (default: veo3fast)
 *   --duration <secs>    Video length in seconds
 *   --image <path>       Reference image (local file or URL) for image-to-video
 *   --aspect <ratio>     Aspect ratio (e.g., 16:9, 9:16, 1:1)
 *   --resolution <res>   Resolution (e.g., 720p, 1080p)
 *   --negative <text>    Negative prompt (things to avoid)
 */

require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ── Model Definitions ──────────────────────────────────────────────
const MODELS = {
  veo3fast: {
    id: "google/veo-3.1-fast",
    name: "Veo 3.1 Fast",
    minDuration: 4,
    maxDuration: 8,
    defaultDuration: 8,
    durationNote: "Only accepts 4, 6, or 8",
    hasAudio: true,
    supportsImage: true,
    cost: "$0.15/sec (audio), $0.10/sec (silent)",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: Math.min(Math.max(duration, 4), 8),
        aspect_ratio: opts.aspect || "16:9",
        resolution: opts.resolution || "1080p",
        generate_audio: true,
      };
      if (imageUri) input.image = imageUri;
      if (opts.negative) input.negative_prompt = opts.negative;
      return input;
    },
  },
  veo3: {
    id: "google/veo-3.1",
    name: "Veo 3.1",
    minDuration: 4,
    maxDuration: 8,
    defaultDuration: 8,
    durationNote: "Only accepts 4, 6, or 8",
    hasAudio: true,
    supportsImage: true,
    cost: "$0.40/sec (audio), $0.20/sec (silent)",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: Math.min(Math.max(duration, 4), 8),
        aspect_ratio: opts.aspect || "16:9",
        resolution: opts.resolution || "1080p",
        generate_audio: true,
      };
      if (imageUri) input.image = imageUri;
      if (opts.negative) input.negative_prompt = opts.negative;
      return input;
    },
  },
  grok: {
    id: "xai/grok-imagine-video",
    name: "Grok Video",
    minDuration: 1,
    maxDuration: 15,
    defaultDuration: 5,
    hasAudio: false, // i2v mode outputs empty audio shell — no actual audio data generated
    supportsImage: true,
    cost: "$0.05/sec",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: Math.min(Math.max(duration, 1), 15),
        aspect_ratio: opts.aspect || "auto",
        resolution: opts.resolution || "720p",
      };
      if (imageUri) input.image = imageUri;
      return input;
    },
  },
  kling: {
    id: "kwaivgi/kling-v3-video",
    name: "Kling v3",
    minDuration: 3,
    maxDuration: 15,
    defaultDuration: 5,
    hasAudio: false,
    supportsImage: true,
    cost: "$0.22/sec (pro), $0.17/sec (standard)",
    durationNote: "Audio adds ~50% cost. Use --audio flag.",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: Math.min(Math.max(duration, 3), 15),
        mode: opts.resolution === "720p" ? "standard" : "pro",
        aspect_ratio: opts.aspect || "16:9",
        generate_audio: false,
      };
      if (imageUri) input.start_image = imageUri;
      if (opts.negative) input.negative_prompt = opts.negative;
      return input;
    },
  },
  sora: {
    id: "openai/sora-2",
    name: "Sora-2",
    minDuration: 4,
    maxDuration: 12,
    defaultDuration: 4,
    hasAudio: true,
    supportsImage: true,
    cost: "$0.10/sec",
    buildInput: (prompt, duration, imageUri, opts) => {
      const aspect = opts.aspect || "landscape";
      const input = {
        prompt,
        seconds: Math.min(Math.max(duration, 4), 12),
        aspect_ratio: aspect === "16:9" ? "landscape" : aspect === "9:16" ? "portrait" : aspect,
      };
      if (imageUri) input.input_reference = imageUri;
      return input;
    },
  },
  sora2pro: {
    id: "openai/sora-2-pro",
    name: "Sora-2 Pro",
    minDuration: 4,
    maxDuration: 12,
    defaultDuration: 4,
    durationNote: "Accepts 4, 8, or 12",
    hasAudio: true,
    supportsImage: true,
    cost: "$0.30/sec (standard), $0.50/sec (high)",
    buildInput: (prompt, duration, imageUri, opts) => {
      const aspect = opts.aspect || "landscape";
      const input = {
        prompt,
        seconds: Math.min(Math.max(duration, 4), 12),
        aspect_ratio: aspect === "16:9" ? "landscape" : aspect === "9:16" ? "portrait" : aspect,
        resolution: opts.resolution === "1024p" ? "high" : "standard",
      };
      if (imageUri) input.input_reference = imageUri;
      return input;
    },
  },
  seedance: {
    id: "bytedance/seedance-1-lite",
    name: "Seedance Lite",
    minDuration: 2,
    maxDuration: 12,
    defaultDuration: 5,
    hasAudio: false,
    supportsImage: true,
    cost: "$0.036/sec (720p)",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: Math.min(Math.max(duration, 2), 12),
        resolution: opts.resolution || "720p",
        aspect_ratio: opts.aspect || "16:9",
        fps: 24,
      };
      if (imageUri) input.image = imageUri;
      return input;
    },
  },
  seedpro: {
    id: "bytedance/seedance-1-pro",
    name: "Seedance Pro",
    minDuration: 2,
    maxDuration: 12,
    defaultDuration: 5,
    hasAudio: false,
    supportsImage: true,
    cost: "$0.15/sec (1080p)",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: Math.min(Math.max(duration, 2), 12),
        resolution: opts.resolution || "1080p",
        aspect_ratio: opts.aspect || "16:9",
        fps: 24,
      };
      if (imageUri) input.image = imageUri;
      return input;
    },
  },
  pixverse: {
    id: "pixverse/pixverse-v5.6",
    name: "PixVerse v5.6",
    minDuration: 5,
    maxDuration: 10,
    defaultDuration: 5,
    durationNote: "10s only at 360p/540p/720p",
    hasAudio: true,
    supportsImage: true,
    cost: "variable",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: duration >= 8 ? 10 : 5,
        quality: opts.resolution || "540p",
        aspect_ratio: opts.aspect || "16:9",
        thinking_type: "auto",
      };
      if (imageUri) input.image = imageUri;
      if (opts.negative) input.negative_prompt = opts.negative;
      return input;
    },
  },
  wan: {
    id: "wan-video/wan-2.5-t2v-fast",
    name: "WAN 2.5 Fast",
    minDuration: 5,
    maxDuration: 10,
    defaultDuration: 5,
    hasAudio: true,
    supportsImage: false,
    cost: "$0.068/sec (720p)",
    buildInput: (prompt, duration, imageUri, opts) => {
      const sizeMap = { "16:9": "1280*720", "9:16": "720*1280", "1:1": "720*720" };
      const input = {
        prompt,
        duration: Math.min(Math.max(duration, 5), 10),
        size: sizeMap[opts.aspect] || "1280*720",
        enable_prompt_expansion: true,
      };
      if (opts.negative) input.negative_prompt = opts.negative;
      return input;
    },
  },
  gen45: {
    id: "runwayml/gen-4.5",
    name: "Gen-4.5 (Runway)",
    minDuration: 5,
    maxDuration: 10,
    defaultDuration: 5,
    hasAudio: false,
    supportsImage: true,
    cost: "$0.12/sec",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: Math.min(Math.max(duration, 5), 10),
        aspect_ratio: opts.aspect || "16:9",
      };
      if (imageUri) input.image = imageUri;
      return input;
    },
  },
  kling26: {
    id: "kwaivgi/kling-v2.6",
    name: "Kling v2.6",
    minDuration: 5,
    maxDuration: 10,
    defaultDuration: 5,
    hasAudio: true,
    supportsImage: true,
    cost: "variable",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: Math.min(Math.max(duration, 5), 10),
        aspect_ratio: opts.aspect || "16:9",
        generate_audio: true,
      };
      if (imageUri) input.start_image = imageUri;
      if (opts.negative) input.negative_prompt = opts.negative;
      return input;
    },
  },
  kling3omni: {
    id: "kwaivgi/kling-v3-omni-video",
    name: "Kling v3 Omni",
    minDuration: 3,
    maxDuration: 15,
    defaultDuration: 5,
    hasAudio: true,
    supportsImage: true,
    cost: "variable",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: Math.min(Math.max(duration, 3), 15),
        mode: opts.resolution === "720p" ? "standard" : "pro",
        aspect_ratio: opts.aspect || "16:9",
      };
      if (imageUri) input.start_image = imageUri;
      return input;
    },
  },
  hailuo: {
    id: "minimax/hailuo-02",
    name: "Hailuo-02",
    minDuration: 6,
    maxDuration: 10,
    defaultDuration: 6,
    durationNote: "6 or 10s; 10s only at 768p",
    hasAudio: false,
    supportsImage: true,
    cost: "variable",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: duration >= 8 ? 10 : 6,
        resolution: opts.resolution || "1080p",
        prompt_optimizer: true,
      };
      if (imageUri) input.first_frame_image = imageUri;
      return input;
    },
  },
  hailuo23: {
    id: "minimax/hailuo-2.3",
    name: "Hailuo-2.3",
    minDuration: 6,
    maxDuration: 10,
    defaultDuration: 6,
    durationNote: "6 or 10s; 10s only at 768p; 1080p only 6s",
    hasAudio: false,
    supportsImage: true,
    cost: "variable",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: duration >= 8 ? 10 : 6,
        resolution: opts.resolution || "768p",
        prompt_optimizer: true,
      };
      if (imageUri) input.first_frame_image = imageUri;
      return input;
    },
  },
  ray2: {
    id: "luma/ray-2-720p",
    name: "Ray 2 (Luma)",
    minDuration: 5,
    maxDuration: 9,
    defaultDuration: 5,
    durationNote: "5 or 9 seconds only",
    hasAudio: false,
    supportsImage: true,
    cost: "$0.18/sec",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: duration >= 7 ? 9 : 5,
        aspect_ratio: opts.aspect || "16:9",
      };
      if (imageUri) input.start_image = imageUri;
      return input;
    },
  },
  rayflash: {
    id: "luma/ray-flash-2-720p",
    name: "Ray Flash 2 (Luma)",
    minDuration: 5,
    maxDuration: 9,
    defaultDuration: 5,
    durationNote: "5 or 9 seconds only",
    hasAudio: false,
    supportsImage: true,
    cost: "$0.06/sec",
    buildInput: (prompt, duration, imageUri, opts) => {
      const input = {
        prompt,
        duration: duration >= 7 ? 9 : 5,
        aspect_ratio: opts.aspect || "16:9",
      };
      if (imageUri) input.start_image = imageUri;
      return input;
    },
  },
};

// ── CLI Argument Parsing ───────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    prompt: null,
    model: "veo3fast",
    duration: null,
    image: null,
    aspect: null,
    resolution: null,
    negative: null,
  };

  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" && args[i + 1]) {
      result.model = args[++i].toLowerCase();
    } else if (args[i] === "--duration" && args[i + 1]) {
      result.duration = parseInt(args[++i], 10);
    } else if (args[i] === "--image" && args[i + 1]) {
      result.image = args[++i];
    } else if ((args[i] === "--aspect" || args[i] === "--ratio") && args[i + 1]) {
      result.aspect = args[++i];
    } else if (args[i] === "--resolution" && args[i + 1]) {
      result.resolution = args[++i];
    } else if (args[i] === "--negative" && args[i + 1]) {
      result.negative = args[++i];
    } else {
      positional.push(args[i]);
    }
  }

  result.prompt = positional.join(" ");
  return result;
}

// ── Image to Data URI Helper ───────────────────────────────────────
function imageToDataUri(imagePath) {
  // If it's already a URL, return as-is
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) {
    return imagePath;
  }

  // Resolve relative paths
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
        // Follow redirects
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
        const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
        console.log(`  ⏳ Rate limited. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const { prompt, model: modelKey, duration: requestedDuration, image, aspect, resolution, negative } = parseArgs();

  if (!prompt) {
    console.log("Usage: node generate-video.js \"Your prompt here\" [--model veo3fast] [--duration 6] [--image photo.jpg]");
    console.log("\nModels:");
    for (const [key, m] of Object.entries(MODELS)) {
      const dur = `${m.minDuration}-${m.maxDuration}s`;
      const audio = m.hasAudio ? "🔊" : "🔇";
      const img = m.supportsImage ? "🖼️" : "  ";
      const defaultTag = key === "veo3fast" ? " (default)" : "";
      const price = m.cost ? ` [${m.cost}]` : "";
      console.log(`  ${key.padEnd(10)} ${audio} ${img} ${dur.padEnd(8)} ${m.name}${defaultTag}${price}`);
    }
    console.log("\nOptions:");
    console.log("  --model <name>       Video model (default: veo3fast)");
    console.log("  --duration <secs>    Video length in seconds");
    console.log("  --image <path>       Reference image (local file or URL)");
    console.log("  --aspect <ratio>     Aspect ratio (16:9, 9:16, 1:1)");
    console.log("  --resolution <res>   Resolution (720p, 1080p)");
    console.log("  --negative <text>    Negative prompt (things to avoid)");
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

  const duration = requestedDuration ?? modelDef.defaultDuration;
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const opts = { aspect, resolution, negative };

  // Ensure output directory
  const outputDir = path.join(__dirname, "media/video");
  fs.mkdirSync(outputDir, { recursive: true });

  // Resolve reference image if provided
  let imageUri = null;
  if (image) {
    if (!modelDef.supportsImage) {
      const imageModels = Object.entries(MODELS).filter(([, m]) => m.supportsImage).map(([k]) => k).join(", ");
      console.error(`❌ ${modelDef.name} does not support image-to-video. Try: ${imageModels}`);
      process.exit(1);
    }
    imageUri = imageToDataUri(image);
  }

  console.log(`\n🎬 Generating video with ${modelDef.name}`);
  console.log(`   Prompt:   "${prompt}"`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Model:    ${modelDef.id}`);
  console.log(`   Audio:    ${modelDef.hasAudio ? "Yes" : "No"}`);
  if (aspect) console.log(`   Aspect:   ${aspect}`);
  if (resolution) console.log(`   Res:      ${resolution}`);
  if (negative) console.log(`   Negative: "${negative}"`);
  console.log(`   Mode:     ${imageUri ? "Image-to-Video 🖼️" : "Text-to-Video"}\n`);

  const startTime = Date.now();

  try {
    const input = modelDef.buildInput(prompt, duration, imageUri, opts);
    console.log("⏳ Running prediction (this may take a few minutes)...\n");
    const output = await runWithRetry(replicate, modelDef.id, input);

    // Extract video URL from output (varies by model)
    let videoUrl;
    if (typeof output === "string") {
      videoUrl = output;
    } else if (output?.url) {
      videoUrl = typeof output.url === "function" ? output.url().toString() : output.url;
    } else if (output?.video) {
      videoUrl = typeof output.video === "function" ? output.video().toString() : output.video;
    } else if (output?.output) {
      videoUrl = output.output;
    } else if (Array.isArray(output) && output.length > 0) {
      videoUrl = typeof output[0] === "string" ? output[0] : output[0]?.url || output[0];
    } else {
      // Last resort: stringify and check
      console.log("Raw output:", JSON.stringify(output, null, 2));
      throw new Error("Could not extract video URL from model output");
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const sanitizedPrompt = prompt.substring(0, 40).replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "-");
    const ext = videoUrl.includes(".mp4") ? "mp4" : "mp4";
    const filename = `${timestamp}_${modelKey}_${sanitizedPrompt}.${ext}`;
    const outputPath = path.join(outputDir, filename);

    console.log("📥 Downloading video...");
    await downloadFile(videoUrl, outputPath);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const fileSize = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);

    // Save generation report
    const report = {
      prompt,
      model: modelDef.id,
      modelName: modelDef.name,
      duration,
      aspectRatio: aspect || "default",
      resolution: resolution || "default",
      negativePrompt: negative || null,
      mode: imageUri ? "image-to-video" : "text-to-video",
      referenceImage: image || null,
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}s`,
      fileSize: `${fileSize}MB`,
      outputFile: filename,
      videoUrl,
    };
    const reportPath = path.join(outputDir, filename.replace(`.${ext}`, ".json"));
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Video saved!`);
    console.log(`   File: media/video/${filename}`);
    console.log(`   Size: ${fileSize} MB`);
    console.log(`   Time: ${elapsed}s`);
    console.log(`   Report: media/video/${path.basename(reportPath)}`);
  } catch (err) {
    console.error(`\n❌ Generation failed: ${err.message}`);
    if (err.message?.includes("duration")) {
      console.error(`   Hint: ${modelDef.name} accepts duration ${modelDef.minDuration}-${modelDef.maxDuration}s`);
      if (modelDef.durationNote) console.error(`   Note: ${modelDef.durationNote}`);
    }
    process.exit(1);
  }
}

main();
