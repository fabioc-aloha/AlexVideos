/**
 * Alex Music Generator — AI Music Generation via Replicate
 *
 * Usage:
 *   node generate-music.js "epic orchestral battle music" --model stableaudio --duration 120
 *   node generate-music.js "upbeat pop" --model music15 --lyrics "[verse]\nLa la la\nFeel the beat"
 *   node generate-music.js "chill lo-fi hip hop" --model lyria2
 *   node generate-music.js "ambient electronic" --model elevenmusic --lengthms 120000
 *   node generate-music.js "[verse]\nWalking down the road" --model music01 --voicefile ./singer.mp3
 *
 * Models:
 *   music15     — MiniMax Music 1.5 (default, full songs up to 4 min, lyrics + prompt, $0.03)
 *   music01     — MiniMax Music 01 (up to 1 min, reference tracks, $0.035)
 *   stableaudio — Stable Audio 2.5 (Stability AI, up to 190s, $0.20)
 *   elevenmusic — ElevenLabs Music (up to 5 min, $8.30/1K sec)
 *   lyria2      — Google Lyria 2 (48kHz stereo, $2/1K sec)
 *
 * Options:
 *   --model <name>       Music model to use (default: music15)
 *   --seed <n>           Random seed for reproducibility
 *   --format <str>       Audio format (mp3, wav)
 *   --bitrate <n>        Audio bitrate in bps
 *   --samplerate <n>     Sample rate in Hz
 *   --lyrics <str>       Song lyrics (MiniMax Music)
 *   --duration <n>       Duration in seconds (Stable Audio, 1-190)
 *   --steps <n>          Diffusion steps 4-8 (Stable Audio)
 *   --cfgscale <n>       CFG scale 1-25 (Stable Audio)
 *   --negprompt <str>    Negative prompt (Lyria 2)
 *   --lengthms <n>       Music length in ms (ElevenLabs Music, 5000-300000)
 *   --vocals             Include vocals (ElevenLabs Music, default is instrumental)
 *   --voice <name>       Voice ID (MiniMax Music 01)
 *   --songfile <path>    Reference song file (MiniMax Music 01)
 *   --voicefile <path>   Voice reference file (MiniMax Music 01)
 *   --instrfile <path>   Instrumental reference file (MiniMax Music 01)
 */

require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ── Audio to Data URI Helper ───────────────────────────────────────
function audioToDataUri(audioPath) {
  if (audioPath.startsWith("http://") || audioPath.startsWith("https://") || audioPath.startsWith("data:")) {
    return audioPath;
  }

  const resolved = path.resolve(audioPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Audio file not found: ${resolved}`);
  }

  const ext = path.extname(resolved).toLowerCase();
  const mimeTypes = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".pcm": "audio/pcm",
    ".aac": "audio/aac",
  };
  const mime = mimeTypes[ext] || "audio/mpeg";
  const data = fs.readFileSync(resolved);
  const base64 = data.toString("base64");
  const sizeMB = (data.length / (1024 * 1024)).toFixed(2);
  console.log(`   Audio:    ${path.basename(resolved)} (${sizeMB} MB, ${mime})`);
  return `data:${mime};base64,${base64}`;
}

// ── Model Definitions ──────────────────────────────────────────────
const MODELS = {
  // ── Music: MiniMax ───────────────────────────────────────────
  music15: {
    id: "minimax/music-1.5",
    name: "MiniMax Music 1.5",
    cost: "$0.03/file",
    supportsAudio: false,
    buildInput: (text, audioUri, opts) => {
      const input = {};
      if (text) input.prompt = text;
      if (opts.lyrics) input.lyrics = opts.lyrics;
      if (opts.bitrate != null) input.bitrate = opts.bitrate;
      if (opts.samplerate != null) input.sample_rate = opts.samplerate;
      if (opts.format) input.audio_format = opts.format;
      return input;
    },
  },
  music01: {
    id: "minimax/music-01",
    name: "MiniMax Music 01",
    cost: "$0.035/file",
    supportsAudio: true,
    buildInput: (text, audioUri, opts) => {
      const input = {};
      if (text) input.lyrics = text;
      if (opts.lyrics) input.lyrics = opts.lyrics;
      if (opts.bitrate != null) input.bitrate = opts.bitrate;
      if (opts.voice) input.voice_id = opts.voice;
      if (opts.samplerate != null) input.sample_rate = opts.samplerate;
      if (opts.songfile) input.song_file = audioToDataUri(opts.songfile);
      if (opts.voicefile) input.voice_file = audioToDataUri(opts.voicefile);
      if (opts.instrfile) input.instrumental_file = audioToDataUri(opts.instrfile);
      return input;
    },
  },

  // ── Music: Stability AI ──────────────────────────────────────
  stableaudio: {
    id: "stability-ai/stable-audio-2.5",
    name: "Stable Audio 2.5",
    cost: "$0.20/file",
    supportsAudio: false,
    buildInput: (text, audioUri, opts) => {
      const input = { prompt: text };
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.steps != null) input.steps = opts.steps;
      if (opts.duration != null) input.duration = opts.duration;
      if (opts.cfgscale != null) input.cfg_scale = opts.cfgscale;
      return input;
    },
  },

  // ── Music: ElevenLabs ────────────────────────────────────────
  elevenmusic: {
    id: "elevenlabs/music",
    name: "ElevenLabs Music",
    cost: "$8.30/1K sec",
    supportsAudio: false,
    buildInput: (text, audioUri, opts) => {
      const input = { prompt: text };
      if (opts.format) input.output_format = opts.format;
      if (opts.lengthms != null) input.music_length_ms = opts.lengthms;
      if (opts.vocals) input.force_instrumental = false;
      return input;
    },
  },

  // ── Music: Google ────────────────────────────────────────────
  lyria2: {
    id: "google/lyria-2",
    name: "Google Lyria 2",
    cost: "$2/1K sec",
    supportsAudio: false,
    buildInput: (text, audioUri, opts) => {
      const input = { prompt: text };
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.negprompt) input.negative_prompt = opts.negprompt;
      return input;
    },
  },
};

// ── Argument Parser ────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    prompt: "",
    model: "music15",
    // Common
    voice: null,
    seed: null,
    format: null,
    bitrate: null,
    samplerate: null,
    // Music-specific
    lyrics: null,
    duration: null,
    steps: null,
    cfgscale: null,
    negprompt: null,
    lengthms: null,
    vocals: false,
    songfile: null,
    voicefile: null,
    instrfile: null,
  };

  const positional = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--model": result.model = args[++i]; break;
      case "--voice": result.voice = args[++i]; break;
      case "--seed": result.seed = parseInt(args[++i], 10); break;
      case "--format": result.format = args[++i]; break;
      case "--bitrate": result.bitrate = parseInt(args[++i], 10); break;
      case "--samplerate": result.samplerate = parseInt(args[++i], 10); break;
      case "--lyrics": result.lyrics = args[++i]; break;
      case "--duration": result.duration = parseInt(args[++i], 10); break;
      case "--steps": result.steps = parseInt(args[++i], 10); break;
      case "--cfgscale": result.cfgscale = parseFloat(args[++i]); break;
      case "--negprompt": result.negprompt = args[++i]; break;
      case "--lengthms": result.lengthms = parseInt(args[++i], 10); break;
      case "--vocals": result.vocals = true; break;
      case "--songfile": result.songfile = args[++i]; break;
      case "--voicefile": result.voicefile = args[++i]; break;
      case "--instrfile": result.instrfile = args[++i]; break;
      default:
        if (args[i].startsWith("--")) {
          console.warn(`Unknown option: ${args[i]}`);
        } else {
          positional.push(args[i]);
        }
    }
  }

  result.prompt = positional.join(" ");
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

// ── Extract Audio URL from Output ──────────────────────────────────
function extractAudioResult(output) {
  if (typeof output === "string") return { url: output };

  if (output && typeof output === "object" && !Array.isArray(output)) {
    if (output.url) {
      return { url: typeof output.url === "function" ? output.url().toString() : output.url };
    }
    if (output.output) {
      return typeof output.output === "string" ? { url: output.output } : null;
    }
    if (output.audio) {
      return { url: typeof output.audio === "function" ? output.audio().toString() : output.audio };
    }
  }

  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") return { url: first };
    if (first?.url) return { url: first.url };
  }

  return null;
}

// ── Determine Audio Extension ──────────────────────────────────────
function getAudioExtension(url, requestedFormat) {
  if (requestedFormat) {
    if (requestedFormat.startsWith("mp3")) return "mp3";
    if (requestedFormat.startsWith("wav")) return "wav";
    return requestedFormat;
  }
  if (url.includes(".wav")) return "wav";
  if (url.includes(".flac")) return "flac";
  if (url.includes(".ogg")) return "ogg";
  if (url.includes(".m4a")) return "m4a";
  return "mp3";
}

// ── Show Help ──────────────────────────────────────────────────────
function showHelp() {
  console.log('Usage: node generate-music.js "epic orchestral battle music" [--model music15] [options]');
  console.log('       node generate-music.js "upbeat pop" --model music15 --lyrics "[verse]\\nLa la la"');
  console.log("\nMusic Models:");
  for (const [key, m] of Object.entries(MODELS)) {
    const audio = m.supportsAudio ? "🎵🎙️" : "🎵  ";
    const defaultTag = key === "music15" ? " (default)" : "";
    const price = m.cost ? ` [${m.cost}]` : "";
    console.log(`  ${key.padEnd(12)} ${audio} ${m.name}${defaultTag}${price}`);
  }
  console.log("\nCommon Options:");
  console.log("  --model <name>       Music model (default: music15)");
  console.log("  --seed <n>           Random seed for reproducibility");
  console.log("  --format <str>       Audio format (mp3, wav)");
  console.log("  --bitrate <n>        Bitrate in bps");
  console.log("  --samplerate <n>     Sample rate in Hz");
  console.log("\nMiniMax Music Options:");
  console.log("  --lyrics <str>       Song lyrics (both music15 and music01)");
  console.log("  --voice <name>       Voice ID (music01)");
  console.log("  --songfile <path>    Reference song (music01)");
  console.log("  --voicefile <path>   Voice reference (music01)");
  console.log("  --instrfile <path>   Instrumental reference (music01)");
  console.log("\nStable Audio Options:");
  console.log("  --duration <n>       Duration in seconds (1-190)");
  console.log("  --steps <n>          Diffusion steps (4-8)");
  console.log("  --cfgscale <n>       CFG scale (1-25)");
  console.log("\nElevenLabs Music Options:");
  console.log("  --lengthms <n>       Music length in ms (5000-300000)");
  console.log("  --vocals             Include vocals (default: instrumental)");
  console.log("\nLyria 2 Options:");
  console.log("  --negprompt <str>    Negative prompt");
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();
  const modelKey = opts.model;

  if (!opts.prompt && !opts.lyrics) {
    showHelp();
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

  // Ensure output directory
  const outputDir = path.join(__dirname, "media/audio");
  fs.mkdirSync(outputDir, { recursive: true });

  // Display generation info
  console.log(`\n🎵 Generating music with ${modelDef.name}`);
  if (opts.prompt) console.log(`   Prompt:   "${opts.prompt}"`);
  console.log(`   Model:    ${modelDef.id}`);
  if (opts.seed != null) console.log(`   Seed:     ${opts.seed}`);
  if (opts.format) console.log(`   Format:   ${opts.format}`);
  if (opts.lyrics) console.log(`   Lyrics:   "${opts.lyrics.substring(0, 60)}${opts.lyrics.length > 60 ? "..." : ""}"`);
  if (opts.duration != null) console.log(`   Duration: ${opts.duration}s`);
  if (opts.lengthms != null) console.log(`   Length:   ${opts.lengthms}ms`);
  if (opts.songfile) console.log(`   Song:     ${opts.songfile}`);
  if (opts.voicefile) console.log(`   Voice:    ${opts.voicefile}`);
  if (opts.instrfile) console.log(`   Instr:    ${opts.instrfile}`);
  console.log("");

  const startTime = Date.now();

  try {
    const input = modelDef.buildInput(opts.prompt, null, opts);
    console.log("⏳ Running prediction (music generation may take a minute)...\n");
    const output = await runWithRetry(replicate, modelDef.id, input);

    const result = extractAudioResult(output);
    if (!result || !result.url) {
      console.log("Raw output:", JSON.stringify(output, null, 2));
      throw new Error("Could not extract audio URL from model output");
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const textForFilename = opts.prompt || "music";
    const sanitizedText = textForFilename
      .substring(0, 40)
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const ext = getAudioExtension(result.url, opts.format);
    const filename = `${timestamp}_${modelKey}_${sanitizedText}.${ext}`;
    const outputPath = path.join(outputDir, filename);

    console.log("📥 Downloading music...");
    await downloadFile(result.url, outputPath);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const fileSize = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);

    // Save generation report
    const report = {
      prompt: opts.prompt || null,
      model: modelDef.id,
      modelName: modelDef.name,
      seed: opts.seed ?? null,
      format: opts.format || null,
      lyrics: opts.lyrics || null,
      duration: opts.duration ?? null,
      lengthMs: opts.lengthms ?? null,
      vocals: opts.vocals || false,
      referenceFiles: {
        song: opts.songfile || null,
        voice: opts.voicefile || null,
        instrumental: opts.instrfile || null,
      },
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}s`,
      fileSize: `${fileSize}MB`,
      outputFile: filename,
      audioUrl: result.url,
    };
    const reportPath = path.join(outputDir, filename.replace(`.${ext}`, ".json"));
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Music saved!`);
    console.log(`   File: media/audio/${filename}`);
    console.log(`   Size: ${fileSize} MB`);
    console.log(`   Time: ${elapsed}s`);
    console.log(`   Report: media/audio/${path.basename(reportPath)}`);
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
