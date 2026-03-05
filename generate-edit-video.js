/**
 * Alex Video Editor — Edit Videos via Replicate
 *
 * Usage:
 *   node generate-edit-video.js "make it anime" --video clip.mp4
 *   node generate-edit-video.js --video clip.mp4 --model reframe --aspect 9:16
 *   node generate-edit-video.js --video clip.mp4 --model trim --start 00:05 --end 00:15
 *   node generate-edit-video.js --video clip.mp4 --model upscale --resolution 4K
 *   node generate-edit-video.js --video clip.mp4 --model caption
 *   node generate-edit-video.js --video clip.mp4 --audio song.mp3 --model avmerge
 *   node generate-edit-video.js --video clip.mp4 --model frames
 *   node generate-edit-video.js --video clip.mp4 --model extract
 *   node generate-edit-video.js --video clip.mp4 --model utils --task reverse
 *   node generate-edit-video.js --video clip1.mp4 --extra clip2.mp4 --model merge
 *
 * Models:
 *   modify     — Luma Modify (default, style transfer + prompt-based editing)
 *   reframe    — Luma Reframe (change aspect ratio, up to 30s, 720p output)
 *   trim       — Trim Video (cut clips by start/end time or duration)
 *   merge      — Video Merge (concatenate multiple video clips)
 *   avmerge    — Audio-Video Merge (combine video + audio tracks)
 *   extract    — Extract Audio (pull audio track from video as MP3)
 *   frames     — Frame Extractor (extract first or last frame as image)
 *   upscale    — Real-ESRGAN Video (upscale video to FHD/4K)
 *   caption    — AutoCaption (add karaoke-style captions automatically)
 *   utils      — Video Utils (convert, gif, reverse, bounce, metadata, etc.)
 *
 * Options:
 *   --model <name>       Video editing model (default: modify)
 *   --video <path>       Input video file (required, local file or URL)
 *   --audio <path>       Audio file for avmerge model
 *   --extra <paths>      Additional video files for merge (comma-separated)
 *   --aspect <ratio>     Target aspect ratio (reframe: 1:1, 9:16, 16:9)
 *   --mode <mode>        Modify mode (adhere_1, flex_1, reimagine_1)
 *   --start <time>       Start time for trim (HH:MM:SS, MM:SS, or seconds)
 *   --end <time>         End time for trim
 *   --duration <time>    Duration for trim (alternative to --end)
 *   --resolution <res>   Upscale resolution (FHD, 4K)
 *   --task <task>        Task for utils model (see below)
 *   --format <fmt>       Output format (mp4, mov, webm, avi, mkv)
 *   --first-frame        Extract first frame instead of last (frames model)
 *
 * Utils Tasks:
 *   convert_to_mp4, convert_to_gif, extract_audio_mp3,
 *   extract_frames, reverse, bounce, create_preview_video,
 *   get_metadata, reencode_audio, encode_instagram, reencode_web
 */

require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ── Model Definitions ──────────────────────────────────────────────
const MODELS = {
  modify: {
    id: "luma/modify-video",
    name: "Luma Modify",
    needsPrompt: true,
    needsVideo: true,
    needsAudio: false,
    outputType: "video",
    cost: "variable",
    buildInput: (prompt, videoUri, audioUri, opts) => {
      const input = {
        mode: opts.mode || "flex_1",
      };
      if (videoUri.startsWith("http://") || videoUri.startsWith("https://")) {
        input.video_url = videoUri;
      } else {
        input.video = videoUri;
      }
      if (prompt) input.prompt = prompt;
      return input;
    },
  },
  reframe: {
    id: "luma/reframe-video",
    name: "Luma Reframe",
    needsPrompt: false,
    needsVideo: true,
    needsAudio: false,
    outputType: "video",
    cost: "$0.06/sec",
    buildInput: (prompt, videoUri, audioUri, opts) => {
      const input = {
        aspect_ratio: opts.aspect || "9:16",
      };
      if (videoUri.startsWith("http://") || videoUri.startsWith("https://")) {
        input.video_url = videoUri;
      } else {
        input.video = videoUri;
      }
      if (prompt) input.prompt = prompt;
      return input;
    },
  },
  trim: {
    id: "lucataco/trim-video",
    name: "Trim Video",
    needsPrompt: false,
    needsVideo: true,
    needsAudio: false,
    outputType: "video",
    cost: "<$0.001",
    buildInput: (prompt, videoUri, audioUri, opts) => {
      const input = {
        video: videoUri,
        start_time: opts.start || "00:00:00",
        output_format: opts.format || "mp4",
        quality: "medium",
      };
      if (opts.end) input.end_time = opts.end;
      if (opts.duration) input.duration = opts.duration;
      return input;
    },
  },
  merge: {
    id: "lucataco/video-merge",
    name: "Video Merge",
    needsPrompt: false,
    needsVideo: true,
    needsAudio: false,
    outputType: "video",
    cost: "variable",
    buildInput: (prompt, videoUri, audioUri, opts) => {
      const videos = [videoUri];
      if (opts.extraVideos) {
        videos.push(...opts.extraVideos);
      }
      return {
        videos,
      };
    },
  },
  avmerge: {
    id: "local/ffmpeg",
    name: "Audio-Video Merge (local FFmpeg)",
    needsPrompt: false,
    needsVideo: true,
    needsAudio: true,
    outputType: "video",
    local: true, // Runs via ffmpeg-static, no Replicate call
    cost: "free",
    buildInput: (prompt, videoUri, audioUri, opts) => ({ videoUri, audioUri }),
  },
  extract: {
    id: "lucataco/extract-audio",
    name: "Extract Audio",
    needsPrompt: false,
    needsVideo: true,
    needsAudio: false,
    outputType: "audio",
    cost: "variable",
    buildInput: (prompt, videoUri, audioUri, opts) => ({
      video: videoUri,
    }),
  },
  frames: {
    id: "lucataco/frame-extractor",
    name: "Frame Extractor",
    needsPrompt: false,
    needsVideo: true,
    needsAudio: false,
    outputType: "image",
    cost: "<$0.001",
    buildInput: (prompt, videoUri, audioUri, opts) => ({
      video: videoUri,
      return_first_frame: opts.firstFrame || false,
    }),
  },
  upscale: {
    id: "lucataco/real-esrgan-video",
    name: "Real-ESRGAN Video",
    needsPrompt: false,
    needsVideo: true,
    needsAudio: false,
    outputType: "video",
    cost: "~$0.46",
    buildInput: (prompt, videoUri, audioUri, opts) => ({
      video_path: videoUri,
      resolution: opts.resolution || "FHD",
      model: "RealESRGAN_x4plus",
    }),
  },
  caption: {
    id: "fictions-ai/autocaption",
    name: "AutoCaption",
    needsPrompt: false,
    needsVideo: true,
    needsAudio: false,
    outputType: "video",
    cost: "~$0.07",
    buildInput: (prompt, videoUri, audioUri, opts) => ({
      video_file_input: videoUri,
      output_video: true,
      output_transcript: true,
      subs_position: "bottom75",
      color: "white",
      highlight_color: "yellow",
      fontsize: 7,
      MaxChars: 20,
      opacity: 0,
      font: "Poppins/Poppins-ExtraBold.ttf",
      stroke_color: "black",
      stroke_width: 2.6,
      kerning: -5,
    }),
  },
  utils: {
    id: "nicolascoutureau/video-utils",
    name: "Video Utils",
    needsPrompt: false,
    needsVideo: true,
    needsAudio: false,
    outputType: "varies",
    cost: "<$0.002",
    buildInput: (prompt, videoUri, audioUri, opts) => {
      const input = {
        task: opts.task || "convert_to_mp4",
        input_file: videoUri,
        fps: 0,
      };
      return input;
    },
  },
};

// ── CLI Argument Parsing ───────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    prompt: null,
    model: "modify",
    video: null,
    audio: null,
    extra: null,
    aspect: null,
    mode: null,
    start: null,
    end: null,
    duration: null,
    resolution: null,
    task: null,
    format: null,
    firstFrame: false,
  };

  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" && args[i + 1]) {
      result.model = args[++i].toLowerCase();
    } else if (args[i] === "--video" && args[i + 1]) {
      result.video = args[++i];
    } else if (args[i] === "--audio" && args[i + 1]) {
      result.audio = args[++i];
    } else if (args[i] === "--extra" && args[i + 1]) {
      result.extra = args[++i];
    } else if ((args[i] === "--aspect" || args[i] === "--ratio") && args[i + 1]) {
      result.aspect = args[++i];
    } else if (args[i] === "--mode" && args[i + 1]) {
      result.mode = args[++i];
    } else if (args[i] === "--start" && args[i + 1]) {
      result.start = args[++i];
    } else if (args[i] === "--end" && args[i + 1]) {
      result.end = args[++i];
    } else if (args[i] === "--duration" && args[i + 1]) {
      result.duration = args[++i];
    } else if (args[i] === "--resolution" && args[i + 1]) {
      result.resolution = args[++i];
    } else if (args[i] === "--task" && args[i + 1]) {
      result.task = args[++i];
    } else if (args[i] === "--format" && args[i + 1]) {
      result.format = args[++i];
    } else if (args[i] === "--first-frame") {
      result.firstFrame = true;
    } else {
      positional.push(args[i]);
    }
  }

  result.prompt = positional.join(" ") || null;
  return result;
}

// ── File to Replicate Input Helper ─────────────────────────────────
function fileToInput(filePath, label) {
  if (filePath.startsWith("http://") || filePath.startsWith("https://") || filePath.startsWith("data:")) {
    return filePath;
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const sizeMB = (fs.statSync(resolved).size / (1024 * 1024)).toFixed(2);
  console.log(`   ${(label + ":").padEnd(9)} ${path.basename(resolved)} (${sizeMB} MB)`);

  // Use ReadableStream for large files (videos), data URI for small files (images/audio)
  const size = fs.statSync(resolved).size;
  if (size > 10 * 1024 * 1024) {
    // > 10MB: stream
    return fs.createReadStream(resolved);
  }

  // Small file: data URI
  const ext = path.extname(resolved).toLowerCase();
  const mimeTypes = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".aac": "audio/aac",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const mime = mimeTypes[ext] || "application/octet-stream";
  const data = fs.readFileSync(resolved);
  return `data:${mime};base64,${data.toString("base64")}`;
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

// ── Extract Output URLs ────────────────────────────────────────────
function extractOutputUrls(output) {
  if (typeof output === "string") return [output];
  if (Array.isArray(output)) {
    return output.map((item) => (typeof item === "string" ? item : item?.url || String(item)));
  }
  if (output?.url) return [typeof output.url === "function" ? output.url().toString() : output.url];
  if (output?.output) return Array.isArray(output.output) ? output.output : [output.output];
  return null;
}

// ── Determine file extension from URL or output type ───────────────
function getExtension(url, outputType, requestedFormat) {
  if (requestedFormat) return requestedFormat;
  if (url.includes(".mp4")) return "mp4";
  if (url.includes(".mov")) return "mov";
  if (url.includes(".webm")) return "webm";
  if (url.includes(".gif")) return "gif";
  if (url.includes(".mp3")) return "mp3";
  if (url.includes(".wav")) return "wav";
  if (url.includes(".jpg") || url.includes(".jpeg")) return "jpg";
  if (url.includes(".png")) return "png";
  if (url.includes(".json")) return "json";
  // Fallback based on output type
  if (outputType === "video") return "mp4";
  if (outputType === "audio") return "mp3";
  if (outputType === "image") return "jpg";
  return "mp4";
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  const {
    prompt,
    model: modelKey,
    video,
    audio,
    extra,
    aspect,
    mode,
    start,
    end,
    duration,
    resolution,
    task,
    format,
    firstFrame,
  } = parseArgs();

  if (!video) {
    console.log('Usage: node generate-edit-video.js "Your edit prompt" --video clip.mp4 [options]');
    console.log("\nModels:");
    for (const [key, m] of Object.entries(MODELS)) {
      const p = m.needsPrompt ? "💬" : "  ";
      const a = m.needsAudio ? "🎵" : "  ";
      const out = m.outputType === "video" ? "🎬" : m.outputType === "audio" ? "🔊" : m.outputType === "image" ? "🖼️" : "📦";
      const defaultTag = key === "modify" ? " (default)" : "";
      const price = m.cost ? ` [${m.cost}]` : "";
      console.log(`  ${key.padEnd(10)} ${p} ${a} ${out} ${m.name}${defaultTag}${price}`);
    }
    console.log("\n  💬 = needs prompt   🎵 = needs audio   🎬 = video out   🔊 = audio out   🖼️ = image out");
    console.log("\nOptions:");
    console.log("  --model <name>       Video editor (default: modify)");
    console.log("  --video <path>       Input video file (required)");
    console.log("  --audio <path>       Audio file (avmerge model)");
    console.log("  --extra <paths>      Extra videos for merge (comma-separated)");
    console.log("  --aspect <ratio>     Target aspect ratio (reframe: 9:16, 16:9)");
    console.log("  --mode <mode>        Modify mode (adhere_1, flex_1, reimagine_1)");
    console.log("  --start <time>       Start time for trim (HH:MM:SS or seconds)");
    console.log("  --end <time>         End time for trim");
    console.log("  --duration <time>    Duration for trim");
    console.log("  --resolution <res>   Upscale resolution (FHD, 4K)");
    console.log("  --task <task>        Task for utils model");
    console.log("  --format <fmt>       Output format (mp4, mov, webm)");
    console.log("  --first-frame        Extract first frame (frames model)");
    console.log("\nUtils Tasks:");
    console.log("  convert_to_mp4       convert_to_gif        extract_audio_mp3");
    console.log("  extract_frames       reverse               bounce");
    console.log("  create_preview_video get_metadata          reencode_audio");
    console.log("  encode_instagram     reencode_web");
    console.log("\nExamples:");
    console.log('  node generate-edit-video.js "make it anime" --video clip.mp4');
    console.log("  node generate-edit-video.js --video clip.mp4 --model reframe --aspect 9:16");
    console.log("  node generate-edit-video.js --video clip.mp4 --model trim --start 00:05 --end 00:15");
    console.log("  node generate-edit-video.js --video clip.mp4 --model upscale --resolution 4K");
    console.log("  node generate-edit-video.js --video clip.mp4 --model caption");
    console.log("  node generate-edit-video.js --video clip.mp4 --audio song.mp3 --model avmerge");
    process.exit(1);
  }

  const modelDef = MODELS[modelKey];
  if (!modelDef) {
    console.error(`Unknown model: "${modelKey}". Available: ${Object.keys(MODELS).join(", ")}`);
    process.exit(1);
  }

  if (modelDef.needsPrompt && !prompt) {
    console.error(`❌ ${modelDef.name} requires a text prompt. Usage:`);
    console.error(`   node generate-edit-video.js "Your instruction" --video clip.mp4 --model ${modelKey}`);
    process.exit(1);
  }

  if (modelDef.needsAudio && !audio) {
    console.error(`❌ ${modelDef.name} requires an audio file. Usage:`);
    console.error(`   node generate-edit-video.js --video clip.mp4 --audio audio.mp3 --model ${modelKey}`);
    process.exit(1);
  }

  if (modelKey === "utils" && !task) {
    console.error("❌ Video Utils requires a --task option. Available tasks:");
    console.error("   convert_to_mp4, convert_to_gif, extract_audio_mp3, extract_frames,");
    console.error("   reverse, bounce, create_preview_video, get_metadata,");
    console.error("   reencode_audio, encode_instagram, reencode_web");
    process.exit(1);
  }

  if (!modelDef.local && !process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN in .env file");
    process.exit(1);
  }

  const replicate = modelDef.local ? null : new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const opts = { aspect, mode, start, end, duration, resolution, task, format, firstFrame, extraVideos: null };

  // Ensure output directory
  const outputDir = path.join(__dirname, "media/video");
  fs.mkdirSync(outputDir, { recursive: true });

  // Resolve input video
  console.log(`\n🎬 Editing video with ${modelDef.name}`);
  const videoUri = fileToInput(video, "Video");

  // Resolve audio if provided
  let audioUri = null;
  if (audio) {
    audioUri = fileToInput(audio, "Audio");
  }

  // Resolve extra videos for merge
  if (extra) {
    const extraPaths = extra.split(",").map((p) => p.trim());
    opts.extraVideos = extraPaths.map((p) => fileToInput(p, "Extra"));
  }

  if (prompt) console.log(`   Prompt:   "${prompt}"`);
  console.log(`   Model:    ${modelDef.id}`);
  if (aspect) console.log(`   Aspect:   ${aspect}`);
  if (mode) console.log(`   Mode:     ${mode}`);
  if (start) console.log(`   Start:    ${start}`);
  if (end) console.log(`   End:      ${end}`);
  if (duration) console.log(`   Duration: ${duration}`);
  if (resolution) console.log(`   Res:      ${resolution}`);
  if (task) console.log(`   Task:     ${task}`);
  if (format) console.log(`   Format:   ${format}`);
  console.log(`   Output:   ${modelDef.outputType}\n`);

  const startTime = Date.now();

  // ── Local avmerge: ffmpeg-static ────────────────────────────────
  if (modelDef.local && modelKey === "avmerge") {
    let ffmpegPath;
    try {
      ffmpegPath = require("ffmpeg-static");
    } catch {
      console.error("❌ ffmpeg-static not installed. Run: npm install ffmpeg-static --save-dev");
      process.exit(1);
    }
    const { execFileSync } = require("child_process");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const videoBase = path.basename(video, path.extname(video));
    const outFilename = `${timestamp}_avmerge_${videoBase.slice(0, 40)}.mp4`;
    const outPath = path.join(outputDir, outFilename);
    const resolvedVideo = path.resolve(video);
    const resolvedAudio = path.resolve(audio);
    console.log("⏳ Merging audio + video with local FFmpeg...");
    execFileSync(ffmpegPath, [
      "-y", "-i", resolvedVideo, "-i", resolvedAudio,
      "-c:v", "copy", "-c:a", "aac", "-ac", "2", "-ar", "44100",
      "-map", "0:v:0", "-map", "1:a:0",
      "-shortest", outPath,
    ], { stdio: "inherit" });
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const fileSize = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
    const report = {
      model: "local/ffmpeg", modelName: "Audio-Video Merge (local FFmpeg)",
      inputVideo: path.basename(video), inputAudio: path.basename(audio),
      timestamp: new Date().toISOString(), elapsed: `${elapsed}s`, fileSize: `${fileSize}MB`,
      outputFile: outFilename,
    };
    fs.writeFileSync(path.join(outputDir, outFilename.replace(".mp4", ".json")), JSON.stringify(report, null, 2));
    console.log(`\n✅ Video saved!`);
    console.log(`   File: media/video/${outFilename} (${fileSize} MB)`);
    console.log(`   Time: ${elapsed}s`);
    return;
  }

  try {
    const input = modelDef.buildInput(prompt, videoUri, audioUri, opts);
    console.log("⏳ Running prediction (this may take a while for video processing)...\n");
    const output = await runWithRetry(replicate, modelDef.id, input);

    const outputUrls = extractOutputUrls(output);
    if (!outputUrls || outputUrls.length === 0) {
      console.log("Raw output:", JSON.stringify(output, null, 2));
      throw new Error("Could not extract output URL(s) from model output");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const sanitizedLabel = (prompt || task || modelKey)
      .substring(0, 40)
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    const savedFiles = [];

    for (let i = 0; i < outputUrls.length; i++) {
      const url = outputUrls[i];
      const ext = getExtension(url, modelDef.outputType, format);
      const suffix = outputUrls.length > 1 ? `_${i + 1}` : "";
      const filename = `${timestamp}_${modelKey}_${sanitizedLabel}${suffix}.${ext}`;
      const outputPath = path.join(outputDir, filename);

      console.log(`📥 Downloading ${modelDef.outputType}${outputUrls.length > 1 ? ` ${i + 1}/${outputUrls.length}` : ""}...`);
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
      outputType: modelDef.outputType,
      inputVideo: path.basename(video),
      inputAudio: audio ? path.basename(audio) : null,
      extraVideos: extra || null,
      aspectRatio: aspect || null,
      mode: mode || null,
      start: start || null,
      end: end || null,
      duration: duration || null,
      resolution: resolution || null,
      task: task || null,
      format: format || null,
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}s`,
      files: savedFiles.map((f) => ({ name: f.filename, size: `${f.fileSize}MB`, url: f.url })),
    };
    const reportFilename = `${timestamp}_${modelKey}_${sanitizedLabel}.json`;
    const reportPath = path.join(outputDir, reportFilename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Output saved!`);
    for (const f of savedFiles) {
      console.log(`   File: media/video/${f.filename} (${f.fileSize} MB)`);
    }
    console.log(`   Time: ${elapsed}s`);
    console.log(`   Report: media/video/${reportFilename}`);
  } catch (err) {
    console.error(`\n❌ Editing failed: ${err.message}`);
    if (err.message?.includes("duration") || err.message?.includes("30 seconds")) {
      console.error("   Hint: Video may be too long. Some models limit to 30 seconds.");
    }
    if (err.message?.includes("100mb") || err.message?.includes("size")) {
      console.error("   Hint: Video file may be too large. Try trimming first.");
    }
    process.exit(1);
  }
}

main();
