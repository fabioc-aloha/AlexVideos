/**
 * Alex Voice Generator — Text-to-Speech & Voice Cloning via Replicate
 *
 * Usage:
 *   node generate-voice.js "Hello, how are you today?"
 *   node generate-voice.js "Hello!" --model elevenv3 --voice Rachel
 *   node generate-voice.js "Speak slowly and calmly" --model qwentts --mode voice_design --voicedesc "Warm female"
 *   node generate-voice.js --model mmclone --audio ./voice-sample.mp3
 *
 * Models — Text-to-Speech:
 *   mm28turbo   — MiniMax Speech 2.8 Turbo (default, fast, $0.06/1K tokens)
 *   mm28hd      — MiniMax Speech 2.8 HD (high fidelity, $0.10/1K tokens)
 *   mm02turbo   — MiniMax Speech 02 Turbo (classic, 10M+ runs, $0.06/1K tokens)
 *   mm02hd      — MiniMax Speech 02 HD (classic HD, $0.10/1K tokens)
 *   mm26turbo   — MiniMax Speech 2.6 Turbo ($0.06/1K tokens)
 *   mm26hd      — MiniMax Speech 2.6 HD ($0.10/1K tokens)
 *   chatterbox  — Resemble Chatterbox (emotion tags, voice clone, $0.025/1K chars)
 *   chatturbo   — Resemble Chatterbox Turbo (low latency, paralinguistic tags, $0.025/1K chars)
 *   chatpro     — Resemble Chatterbox Pro (predefined voices, $0.04/1K chars)
 *   chatmlang   — Resemble Chatterbox Multilingual (23 languages, voice clone)
 *   qwentts     — Qwen3 TTS (3 modes: custom, clone, design, $0.02/1K chars)
 *   elevenv3    — ElevenLabs v3 (most expressive, $0.10/1K chars)
 *   eleventurbo — ElevenLabs Turbo v2.5 (low latency, 32 langs, $0.05/1K chars)
 *   kokoro      — Kokoro 82M (lightweight, fast, 81M+ runs)
 *
 * Models — Voice Cloning:
 *   mmclone     — MiniMax Voice Cloning (clone a voice, $3/output)
 *
 * Options:
 *   --model <name>       Voice model to use (default: mm28turbo)
 *   --voice <name>       Voice ID/name (maps to voice_id, voice, or speaker)
 *   --speed <n>          Speech speed multiplier
 *   --seed <n>           Random seed for reproducibility
 *   --audio <path>       Reference audio file (local file or URL)
 *   --pitch <val>        Pitch offset (int semitones for MiniMax, string for chatpro)
 *   --volume <n>         Volume level 0-10 (MiniMax)
 *   --emotion <str>      Emotion style (MiniMax, e.g. "happy", "sad", "auto")
 *   --bitrate <n>        Audio bitrate in bps
 *   --channel <str>      mono or stereo (MiniMax)
 *   --samplerate <n>     Sample rate in Hz
 *   --format <str>       Audio format (mp3, wav, flac, pcm)
 *   --language <str>     Language code/hint
 *   --subtitle           Enable subtitle metadata (MiniMax)
 *   --normalize          Enable English normalization (MiniMax)
 *   --temperature <n>    Generation temperature (Chatterbox, Qwen)
 *   --exaggeration <n>   Speech expressiveness (Chatterbox)
 *   --cfgweight <n>      CFG/pace weight (Chatterbox)
 *   --topk <n>           Top-K sampling (Chatterbox Turbo)
 *   --topp <n>           Top-P sampling (Chatterbox Turbo)
 *   --penalty <n>        Repetition penalty (Chatterbox Turbo)
 *   --customvoice <str>  Custom voice UUID (Chatterbox Pro)
 *   --mode <str>         TTS mode (Qwen: custom_voice, voice_clone, voice_design)
 *   --reftext <str>      Reference transcript (Qwen voice_clone mode)
 *   --styleinst <str>    Style instruction (Qwen, e.g. "speak slowly and calmly")
 *   --voicedesc <str>    Voice description (Qwen voice_design mode)
 *   --stability <n>      Voice stability 0-1 (ElevenLabs)
 *   --similarity <n>     Similarity boost 0-1 (ElevenLabs)
 *   --elstyle <n>        Style exaggeration 0-1 (ElevenLabs)
 *   --prevtext <str>     Previous text context (ElevenLabs)
 *   --nexttext <str>     Next text context (ElevenLabs)
 *   --accuracy <n>       Clone accuracy threshold 0-1 (MiniMax Clone)
 *   --noisereduction     Enable noise reduction (MiniMax Clone)
 *   --volumenorm         Enable volume normalization (MiniMax Clone)
 *   --clonemodel <str>   Target model for clone (speech-02-turbo or speech-02-hd)
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

// ── Shared Build Helpers ───────────────────────────────────────────
function buildMiniMaxSpeech(text, audioUri, opts) {
  const input = { text };
  if (opts.pitch != null) input.pitch = parseInt(opts.pitch, 10);
  if (opts.speed != null) input.speed = opts.speed;
  if (opts.volume != null) input.volume = opts.volume;
  if (opts.bitrate != null) input.bitrate = opts.bitrate;
  if (opts.channel) input.channel = opts.channel;
  if (opts.emotion) input.emotion = opts.emotion;
  if (opts.voice) input.voice_id = opts.voice;
  if (opts.samplerate != null) input.sample_rate = opts.samplerate;
  if (opts.format) input.audio_format = opts.format;
  if (opts.language) input.language_boost = opts.language;
  if (opts.subtitle) input.subtitle_enable = true;
  if (opts.normalize) input.english_normalization = true;
  return input;
}

function buildElevenLabsTTS(text, audioUri, opts) {
  const input = { prompt: text };
  if (opts.speed != null) input.speed = opts.speed;
  if (opts.elstyle != null) input.style = opts.elstyle;
  if (opts.voice) input.voice = opts.voice;
  if (opts.nexttext) input.next_text = opts.nexttext;
  if (opts.stability != null) input.stability = opts.stability;
  if (opts.language) input.language_code = opts.language;
  if (opts.prevtext) input.previous_text = opts.prevtext;
  if (opts.similarity != null) input.similarity_boost = opts.similarity;
  return input;
}

// ── Model Definitions ──────────────────────────────────────────────
const MODELS = {
  // ── TTS: MiniMax Speech ──────────────────────────────────────
  mm28turbo: {
    id: "minimax/speech-2.8-turbo",
    name: "MiniMax Speech 2.8 Turbo",
    type: "tts",
    cost: "$0.06/1K tokens",
    supportsAudio: false,
    buildInput: buildMiniMaxSpeech,
  },
  mm28hd: {
    id: "minimax/speech-2.8-hd",
    name: "MiniMax Speech 2.8 HD",
    type: "tts",
    cost: "$0.10/1K tokens",
    supportsAudio: false,
    buildInput: buildMiniMaxSpeech,
  },
  mm02turbo: {
    id: "minimax/speech-02-turbo",
    name: "MiniMax Speech 02 Turbo",
    type: "tts",
    cost: "$0.06/1K tokens",
    supportsAudio: false,
    buildInput: buildMiniMaxSpeech,
  },
  mm02hd: {
    id: "minimax/speech-02-hd",
    name: "MiniMax Speech 02 HD",
    type: "tts",
    cost: "$0.10/1K tokens",
    supportsAudio: false,
    buildInput: buildMiniMaxSpeech,
  },
  mm26turbo: {
    id: "minimax/speech-2.6-turbo",
    name: "MiniMax Speech 2.6 Turbo",
    type: "tts",
    cost: "$0.06/1K tokens",
    supportsAudio: false,
    buildInput: buildMiniMaxSpeech,
  },
  mm26hd: {
    id: "minimax/speech-2.6-hd",
    name: "MiniMax Speech 2.6 HD",
    type: "tts",
    cost: "$0.10/1K tokens",
    supportsAudio: false,
    buildInput: buildMiniMaxSpeech,
  },

  // ── TTS: MiniMax Voice Cloning ───────────────────────────────
  mmclone: {
    id: "minimax/voice-cloning",
    name: "MiniMax Voice Cloning",
    type: "clone",
    cost: "$3/output",
    supportsAudio: true,
    requiresAudio: true,
    buildInput: (text, audioUri, opts) => {
      const input = {};
      if (opts.clonemodel) input.model = opts.clonemodel;
      if (opts.accuracy != null) input.accuracy = opts.accuracy;
      if (audioUri) input.voice_file = audioUri;
      if (opts.noisereduction) input.need_noise_reduction = true;
      if (opts.volumenorm) input.need_volume_normalization = true;
      return input;
    },
  },

  // ── TTS: Resemble AI ─────────────────────────────────────────
  chatterbox: {
    id: "resemble-ai/chatterbox",
    name: "Resemble Chatterbox",
    type: "tts",
    cost: "$0.025/1K chars",
    supportsAudio: true,
    buildInput: (text, audioUri, opts) => {
      const input = { prompt: text };
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.cfgweight != null) input.cfg_weight = opts.cfgweight;
      if (opts.temperature != null) input.temperature = opts.temperature;
      if (opts.exaggeration != null) input.exaggeration = opts.exaggeration;
      if (audioUri) input.audio_prompt = audioUri;
      return input;
    },
  },
  chatturbo: {
    id: "resemble-ai/chatterbox-turbo",
    name: "Resemble Chatterbox Turbo",
    type: "tts",
    cost: "$0.025/1K chars",
    supportsAudio: true,
    buildInput: (text, audioUri, opts) => {
      const input = { text };
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.topk != null) input.top_k = opts.topk;
      if (opts.topp != null) input.top_p = opts.topp;
      if (opts.voice) input.voice = opts.voice;
      if (opts.temperature != null) input.temperature = opts.temperature;
      if (audioUri) input.reference_audio = audioUri;
      if (opts.penalty != null) input.repetition_penalty = opts.penalty;
      return input;
    },
  },
  chatpro: {
    id: "resemble-ai/chatterbox-pro",
    name: "Resemble Chatterbox Pro",
    type: "tts",
    cost: "$0.04/1K chars",
    supportsAudio: false,
    buildInput: (text, audioUri, opts) => {
      const input = { prompt: text };
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.pitch) input.pitch = opts.pitch;
      if (opts.voice) input.voice = opts.voice;
      if (opts.temperature != null) input.temperature = opts.temperature;
      if (opts.customvoice) input.custom_voice = opts.customvoice;
      if (opts.exaggeration != null) input.exaggeration = opts.exaggeration;
      return input;
    },
  },
  chatmlang: {
    id: "resemble-ai/chatterbox-multilingual",
    name: "Resemble Chatterbox Multilingual",
    type: "tts",
    cost: "per-second GPU",
    supportsAudio: true,
    buildInput: (text, audioUri, opts) => {
      const input = { text };
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.language) input.language = opts.language;
      if (opts.cfgweight != null) input.cfg_weight = opts.cfgweight;
      if (opts.temperature != null) input.temperature = opts.temperature;
      if (opts.exaggeration != null) input.exaggeration = opts.exaggeration;
      if (audioUri) input.reference_audio = audioUri;
      return input;
    },
  },

  // ── TTS: Qwen ────────────────────────────────────────────────
  qwentts: {
    id: "qwen/qwen3-tts",
    name: "Qwen3 TTS",
    type: "tts",
    cost: "$0.02/1K chars",
    supportsAudio: true,
    buildInput: (text, audioUri, opts) => {
      const input = { text };
      if (opts.mode) input.mode = opts.mode;
      if (opts.voice) input.speaker = opts.voice;
      if (opts.language) input.language = opts.language;
      if (opts.reftext) input.reference_text = opts.reftext;
      if (audioUri) input.reference_audio = audioUri;
      if (opts.styleinst) input.style_instruction = opts.styleinst;
      if (opts.voicedesc) input.voice_description = opts.voicedesc;
      return input;
    },
  },

  // ── TTS: ElevenLabs ──────────────────────────────────────────
  elevenv3: {
    id: "elevenlabs/v3",
    name: "ElevenLabs v3",
    type: "tts",
    cost: "$0.10/1K chars",
    supportsAudio: false,
    buildInput: buildElevenLabsTTS,
  },
  eleventurbo: {
    id: "elevenlabs/turbo-v2.5",
    name: "ElevenLabs Turbo v2.5",
    type: "tts",
    cost: "$0.05/1K chars",
    supportsAudio: false,
    buildInput: buildElevenLabsTTS,
  },

  // ── TTS: Kokoro ──────────────────────────────────────────────
  kokoro: {
    id: "jaaari/kokoro-82m",
    name: "Kokoro 82M",
    type: "tts",
    cost: "per-second GPU",
    supportsAudio: false,
    buildInput: (text, audioUri, opts) => {
      const input = { text };
      if (opts.speed != null) input.speed = opts.speed;
      if (opts.voice) input.voice = opts.voice;
      return input;
    },
  },
};

// ── Argument Parser ────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    prompt: "",
    model: "mm28turbo",
    // Common
    voice: null,
    speed: null,
    seed: null,
    audio: null,
    // MiniMax Speech
    pitch: null,
    volume: null,
    emotion: null,
    bitrate: null,
    channel: null,
    samplerate: null,
    format: null,
    language: null,
    subtitle: false,
    normalize: false,
    // Chatterbox
    temperature: null,
    exaggeration: null,
    cfgweight: null,
    topk: null,
    topp: null,
    penalty: null,
    customvoice: null,
    // Qwen
    mode: null,
    reftext: null,
    styleinst: null,
    voicedesc: null,
    // ElevenLabs
    stability: null,
    similarity: null,
    elstyle: null,
    prevtext: null,
    nexttext: null,
    // Clone
    clonemodel: null,
    accuracy: null,
    noisereduction: false,
    volumenorm: false,
  };

  const positional = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      // Common
      case "--model": result.model = args[++i]; break;
      case "--voice": result.voice = args[++i]; break;
      case "--speed": result.speed = parseFloat(args[++i]); break;
      case "--seed": result.seed = parseInt(args[++i], 10); break;
      case "--audio": result.audio = args[++i]; break;
      // MiniMax Speech
      case "--pitch": result.pitch = args[++i]; break;
      case "--volume": result.volume = parseFloat(args[++i]); break;
      case "--emotion": result.emotion = args[++i]; break;
      case "--bitrate": result.bitrate = parseInt(args[++i], 10); break;
      case "--channel": result.channel = args[++i]; break;
      case "--samplerate": result.samplerate = parseInt(args[++i], 10); break;
      case "--format": result.format = args[++i]; break;
      case "--language": result.language = args[++i]; break;
      case "--subtitle": result.subtitle = true; break;
      case "--normalize": result.normalize = true; break;
      // Chatterbox
      case "--temperature": result.temperature = parseFloat(args[++i]); break;
      case "--exaggeration": result.exaggeration = parseFloat(args[++i]); break;
      case "--cfgweight": result.cfgweight = parseFloat(args[++i]); break;
      case "--topk": result.topk = parseInt(args[++i], 10); break;
      case "--topp": result.topp = parseFloat(args[++i]); break;
      case "--penalty": result.penalty = parseFloat(args[++i]); break;
      case "--customvoice": result.customvoice = args[++i]; break;
      // Qwen
      case "--mode": result.mode = args[++i]; break;
      case "--reftext": result.reftext = args[++i]; break;
      case "--styleinst": result.styleinst = args[++i]; break;
      case "--voicedesc": result.voicedesc = args[++i]; break;
      // ElevenLabs
      case "--stability": result.stability = parseFloat(args[++i]); break;
      case "--similarity": result.similarity = parseFloat(args[++i]); break;
      case "--elstyle": result.elstyle = parseFloat(args[++i]); break;
      case "--prevtext": result.prevtext = args[++i]; break;
      case "--nexttext": result.nexttext = args[++i]; break;
      // Clone
      case "--clonemodel": result.clonemodel = args[++i]; break;
      case "--accuracy": result.accuracy = parseFloat(args[++i]); break;
      case "--noisereduction": result.noisereduction = true; break;
      case "--volumenorm": result.volumenorm = true; break;
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
    if (output.preview) {
      return {
        url: typeof output.preview === "function" ? output.preview().toString() : output.preview,
        voiceId: output.voice_id,
        cloneModel: output.model,
      };
    }
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
  if (url.includes(".pcm")) return "pcm";
  if (url.includes(".aac")) return "aac";
  return "mp3";
}

// ── Show Help ──────────────────────────────────────────────────────
function showHelp() {
  console.log('Usage: node generate-voice.js "Your text here" [--model mm28turbo] [options]');
  console.log("       node generate-voice.js --model mmclone --audio ./voice.mp3");
  console.log("\nText-to-Speech Models:");
  const ttsModels = Object.entries(MODELS).filter(([, m]) => m.type === "tts");
  for (const [key, m] of ttsModels) {
    const audio = m.supportsAudio ? "🎙️" : "🔊";
    const defaultTag = key === "mm28turbo" ? " (default)" : "";
    const price = m.cost ? ` [${m.cost}]` : "";
    console.log(`  ${key.padEnd(12)} ${audio} ${m.name}${defaultTag}${price}`);
  }
  console.log("\nVoice Cloning:");
  const cloneModels = Object.entries(MODELS).filter(([, m]) => m.type === "clone");
  for (const [key, m] of cloneModels) {
    const price = m.cost ? ` [${m.cost}]` : "";
    console.log(`  ${key.padEnd(12)} 🎙️ ${m.name}${price}`);
  }
  console.log("\nCommon Options:");
  console.log("  --model <name>       Voice model (default: mm28turbo)");
  console.log("  --voice <name>       Voice ID/name (model-specific)");
  console.log("  --speed <n>          Speech speed multiplier");
  console.log("  --seed <n>           Random seed for reproducibility");
  console.log("  --audio <path>       Reference audio file (local or URL)");
  console.log("  --format <str>       Audio format (mp3, wav, flac, pcm)");
  console.log("  --language <str>     Language code or hint");
  console.log("\nMiniMax Speech Options:");
  console.log("  --pitch <n>          Semitone offset (-12 to +12)");
  console.log("  --volume <n>         Volume level (0-10)");
  console.log("  --emotion <str>      Emotion style (auto, happy, sad, angry, ...)");
  console.log("  --bitrate <n>        Bitrate in bps (default: 128000)");
  console.log("  --channel <str>      mono or stereo");
  console.log("  --samplerate <n>     Sample rate in Hz");
  console.log("  --subtitle           Enable subtitle metadata");
  console.log("  --normalize          Enable English normalization");
  console.log("\nChatterbox Options:");
  console.log("  --temperature <n>    Generation temperature");
  console.log("  --exaggeration <n>   Speech expressiveness");
  console.log("  --cfgweight <n>      CFG/pace weight");
  console.log("  --topk <n>           Top-K sampling (chatturbo)");
  console.log("  --topp <n>           Top-P sampling (chatturbo)");
  console.log("  --penalty <n>        Repetition penalty (chatturbo)");
  console.log("  --customvoice <str>  Custom voice UUID (chatpro)");
  console.log("\nQwen TTS Options:");
  console.log("  --mode <str>         custom_voice, voice_clone, or voice_design");
  console.log("  --reftext <str>      Reference transcript (voice_clone mode)");
  console.log("  --styleinst <str>    Style instruction (e.g. \"speak slowly\")");
  console.log("  --voicedesc <str>    Voice description (voice_design mode)");
  console.log("\nElevenLabs Options:");
  console.log("  --stability <n>      Voice stability (0-1)");
  console.log("  --similarity <n>     Similarity boost (0-1)");
  console.log("  --elstyle <n>        Style exaggeration (0-1)");
  console.log("  --prevtext <str>     Previous text context");
  console.log("  --nexttext <str>     Next text context");
  console.log("\nVoice Cloning Options:");
  console.log("  --clonemodel <str>   Target model (speech-02-turbo or speech-02-hd)");
  console.log("  --accuracy <n>       Accuracy threshold (0-1, default: 0.7)");
  console.log("  --noisereduction     Enable noise reduction");
  console.log("  --volumenorm         Enable volume normalization");
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs();
  const modelKey = opts.model;

  // Show help if no prompt and not a clone operation
  if (!opts.prompt && modelKey !== "mmclone") {
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

  // Clone model requires an audio file
  if (modelDef.requiresAudio && !opts.audio) {
    console.error(`❌ ${modelDef.name} requires --audio <path> to a voice sample`);
    process.exit(1);
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  // Ensure output directory
  const outputDir = path.join(__dirname, "media/audio");
  fs.mkdirSync(outputDir, { recursive: true });

  // Resolve primary reference audio if provided
  let audioUri = null;
  if (opts.audio) {
    if (!modelDef.supportsAudio && modelDef.type !== "clone") {
      const audioModels = Object.entries(MODELS)
        .filter(([, m]) => m.supportsAudio)
        .map(([k]) => k)
        .join(", ");
      console.error(`❌ ${modelDef.name} does not support audio input. Try: ${audioModels}`);
      process.exit(1);
    }
    audioUri = audioToDataUri(opts.audio);
  }

  // Display generation info
  const typeEmoji = modelDef.type === "clone" ? "🎙️" : "🔊";
  const typeLabel = modelDef.type === "clone" ? "Voice Clone" : "Text-to-Speech";

  console.log(`\n${typeEmoji} Generating ${typeLabel.toLowerCase()} with ${modelDef.name}`);
  if (opts.prompt) console.log(`   Text:     "${opts.prompt}"`);
  console.log(`   Model:    ${modelDef.id}`);
  console.log(`   Type:     ${typeLabel}`);
  if (opts.voice) console.log(`   Voice:    ${opts.voice}`);
  if (opts.speed != null) console.log(`   Speed:    ${opts.speed}`);
  if (opts.seed != null) console.log(`   Seed:     ${opts.seed}`);
  if (opts.emotion) console.log(`   Emotion:  ${opts.emotion}`);
  if (opts.language) console.log(`   Language: ${opts.language}`);
  if (opts.format) console.log(`   Format:   ${opts.format}`);
  if (audioUri) console.log(`   Ref:      ${opts.audio}`);
  if (opts.mode) console.log(`   Mode:     ${opts.mode}`);
  console.log("");

  const startTime = Date.now();

  try {
    const input = modelDef.buildInput(opts.prompt, audioUri, opts);
    console.log("⏳ Running prediction (this may take a moment)...\n");
    const output = await runWithRetry(replicate, modelDef.id, input);

    const result = extractAudioResult(output);
    if (!result || !result.url) {
      console.log("Raw output:", JSON.stringify(output, null, 2));
      throw new Error("Could not extract audio URL from model output");
    }

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const textForFilename = opts.prompt || (opts.audio ? path.basename(opts.audio) : "clone");
    const sanitizedText = textForFilename
      .substring(0, 40)
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const ext = getAudioExtension(result.url, opts.format);
    const filename = `${timestamp}_${modelKey}_${sanitizedText}.${ext}`;
    const outputPath = path.join(outputDir, filename);

    console.log("📥 Downloading audio...");
    await downloadFile(result.url, outputPath);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const fileSize = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);

    // Save generation report
    const report = {
      text: opts.prompt || null,
      model: modelDef.id,
      modelName: modelDef.name,
      type: modelDef.type,
      voice: opts.voice || null,
      speed: opts.speed ?? null,
      seed: opts.seed ?? null,
      emotion: opts.emotion || null,
      language: opts.language || null,
      format: opts.format || null,
      mode: opts.mode || null,
      referenceAudio: opts.audio || null,
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}s`,
      fileSize: `${fileSize}MB`,
      outputFile: filename,
      audioUrl: result.url,
    };

    if (result.voiceId) {
      report.voiceId = result.voiceId;
      report.cloneModel = result.cloneModel;
    }

    const reportPath = path.join(outputDir, filename.replace(`.${ext}`, ".json"));
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Audio saved!`);
    console.log(`   File: media/audio/${filename}`);
    console.log(`   Size: ${fileSize} MB`);
    console.log(`   Time: ${elapsed}s`);
    console.log(`   Report: media/audio/${path.basename(reportPath)}`);

    if (result.voiceId) {
      console.log(`\n🎙️ Voice Clone Created!`);
      console.log(`   Voice ID:    ${result.voiceId}`);
      console.log(`   Clone Model: ${result.cloneModel}`);
      console.log(`   Use with:    node generate-voice.js "text" --model mm02turbo --voice ${result.voiceId}`);
    }
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
