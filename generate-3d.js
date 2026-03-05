/**
 * Alex 3D Generator — Image/Text to 3D via Replicate
 *
 * Usage:
 *   node generate-3d.js --model trellis --image ./chair.png
 *   node generate-3d.js --model rodin --image ./character.png --quality high --material PBR
 *   node generate-3d.js --model hunyuan --image ./toy.jpg --faces 40000
 *   node generate-3d.js --model hunyuan2mv --front ./front.png --back ./back.png
 *   node generate-3d.js "an astronaut riding a camel" --model mvdream
 *   node generate-3d.js "a red fire hydrant" --model shape --mesh
 *
 * Models:
 *   trellis    — TRELLIS (default, best all-around, image→3D GLB, 679K runs)
 *   rodin      — Rodin Gen-2 (Official, complex models, $0.40/output)
 *   hunyuan    — Hunyuan3D-2 (Tencent/Pruna, image→GLB, fast modes)
 *   hunyuan2mv — Hunyuan3D-2mv (multi-view images → GLB, 4 view inputs)
 *   mvdream    — MVDream (text→3D, multi-view diffusion)
 *   shape      — Shap-E (OpenAI, text/image→3D, fast prototyping)
 *
 * Options:
 *   --model <name>       3D model to use (default: trellis)
 *   --image <path>       Input image (local file or URL)
 *   --front <path>       Front view image (hunyuan2mv)
 *   --back <path>        Back view image (hunyuan2mv)
 *   --left <path>        Left view image (hunyuan2mv)
 *   --right <path>       Right view image (hunyuan2mv)
 *   --seed <n>           Random seed for reproducibility
 *   --format <str>       Output file type (glb, obj)
 *   --faces <n>          Target face count for mesh simplification
 *   --quality <str>      Generation quality: low, medium, high (rodin)
 *   --material <str>     Material type: PBR (rodin)
 *   --meshmode <str>     Mesh face type: Quad, Raw (rodin)
 *   --tpose              Generate T/A pose for humans (rodin)
 *   --preview            Generate preview render (rodin)
 *   --steps <n>          Number of inference/denoising steps
 *   --guidance <n>       Guidance scale/strength
 *   --texture <n>        Texture size 512-2048 (trellis)
 *   --simplify <n>       Mesh simplification ratio 0.9-0.98 (trellis)
 *   --color              Generate color video render (trellis)
 *   --normal             Generate normal video render (trellis)
 *   --ply                Save Gaussian PLY file (trellis)
 *   --nobg               Remove/return images without background
 *   --chunks <n>         Number of chunks (hunyuan variants)
 *   --octree <n>         Octree resolution (hunyuan variants)
 *   --speedmode <str>    Speed optimization level (hunyuan)
 *   --negative <str>     Negative prompt (mvdream)
 *   --maxsteps <n>       Max training steps (mvdream)
 *   --mesh               Save as mesh output (shape)
 *   --rendermode <str>   Render mode: nerf or stf (shape)
 *   --rendersize <n>     Render size (shape)
 *   --count <n>          Batch count (shape, rodin)
 *   --prompt <str>       Text prompt (rodin, also positional arg)
 *   --bbox <w,h,l>       Bounding box condition (rodin)
 *   --addons <a,b>       Addons comma-separated (rodin)
 *   --stl                Convert output to STL (3D printer format)
 *   --obj                Export as OBJ (all models; native on rodin, hunyuan, hunyuan2mv)
 *   --fbx                Export as FBX (Rodin native; other models output OBJ — re-export in Blender/Maya)
 *   --3mf                Reserved for future 3MF support
 *   --format <str>       Output file type: glb, obj, stl, fbx (native models only; use flags above otherwise)
 */

require("dotenv").config();
const Replicate = require("replicate");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { NodeIO } = require("@gltf-transform/core");

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
  trellis: {
    id: "firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c",
    name: "TRELLIS",
    type: "image-to-3d",
    cost: "per-second GPU",
    supportsImage: true,
    supportsText: false,
    nativeStl: false,
    nativeObj: false,
    nativeFbx: false,
    outputType: "structured", // { model_file, color_video, gaussian_ply, ... }
    buildInput: (prompt, imageUri, opts) => {
      const input = {
        generate_model: true,
        generate_color: opts.color !== false,
      };
      if (imageUri) input.images = [imageUri];
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.texture != null) input.texture_size = opts.texture;
      if (opts.simplify != null) input.mesh_simplify = opts.simplify;
      if (opts.normal) input.generate_normal = true;
      if (opts.ply) input.save_gaussian_ply = true;
      if (opts.nobg) input.return_no_background = true;
      if (opts.ss_steps != null) input.ss_sampling_steps = opts.ss_steps;
      if (opts.slat_steps != null) input.slat_sampling_steps = opts.slat_steps;
      if (opts.guidance != null) input.ss_guidance_strength = opts.guidance;
      if (opts.slat_guidance != null) input.slat_guidance_strength = opts.slat_guidance;
      // For trellis, steps maps to both stages
      if (opts.steps != null) {
        input.ss_sampling_steps = opts.steps;
        input.slat_sampling_steps = opts.steps;
      }
      return input;
    },
  },
  rodin: {
    id: "hyper3d/rodin",
    name: "Rodin Gen-2",
    type: "multi",
    cost: "$0.40/output",
    supportsImage: true,
    supportsText: true,
    nativeStl: true, // geometry_file_format supports stl, obj, glb, fbx, usdz
    nativeObj: true,
    nativeFbx: true,
    outputType: "uri",
    buildInput: (prompt, imageUri, opts) => {
      const input = {};
      if (prompt) input.prompt = prompt;
      if (imageUri) input.images = [imageUri];
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.quality) input.quality = opts.quality;
      if (opts.material) input.material = opts.material;
      if (opts.meshmode) input.mesh_mode = opts.meshmode;
      if (opts.format) input.geometry_file_format = opts.format;
      if (opts.tpose) input.tapose = true;
      if (opts.preview) input.preview_render = true;
      if (opts.count != null) input.quality_override = opts.count;
      if (opts.nobg) input.use_original_alpha = true;
      if (opts.addons) input.addons = opts.addons.split(",").map((s) => s.trim());
      if (opts.bbox) input.bbox_condition = opts.bbox.split(",").map(Number);
      return input;
    },
  },
  hunyuan: {
    id: "prunaai/hunyuan3d-2:6dd3e3e1f8a29a38807e8f23aaf8953a0051996ccc8c1861f709a5b1ee6826b5",
    name: "Hunyuan3D-2",
    type: "image-to-3d",
    cost: "per-second GPU",
    supportsImage: true,
    supportsText: false,
    nativeStl: false, // file_type supports glb, obj only
    nativeObj: true,
    nativeFbx: false,
    outputType: "structured", // { mesh_paint }
    buildInput: (prompt, imageUri, opts) => {
      const input = {};
      if (imageUri) input.image_path = imageUri;
      if (opts.format) input.file_type = opts.format;
      if (opts.faces != null) input.face_count = opts.faces;
      if (opts.chunks != null) input.num_chunks = opts.chunks;
      if (opts.speedmode) input.speed_mode = opts.speedmode;
      if (opts.seed != null) input.generator_seed = opts.seed;
      if (opts.octree != null) input.octree_resolution = opts.octree;
      if (opts.steps != null) input.num_inference_steps = opts.steps;
      return input;
    },
  },
  hunyuan2mv: {
    id: "tencent/hunyuan3d-2mv:71798fbc3c9f7b7097e3bb85496e5a797d8b8f616b550692e7c3e176a8e9e5db",
    name: "Hunyuan3D-2mv",
    type: "multiview-to-3d",
    cost: "per-second GPU",
    supportsImage: true,
    supportsText: false,
    nativeStl: true, // file_type supports glb, obj, ply, stl
    nativeObj: true,
    nativeFbx: false,
    outputType: "uri",
    buildInput: (prompt, imageUri, opts) => {
      const input = {};
      // Multi-view images
      if (opts.front) input.front_image = imageToDataUri(opts.front);
      else if (imageUri) input.front_image = imageUri;
      if (opts.back) input.back_image = imageToDataUri(opts.back);
      if (opts.left) input.left_image = imageToDataUri(opts.left);
      if (opts.right) input.right_image = imageToDataUri(opts.right);
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.steps != null) input.steps = opts.steps;
      if (opts.format) input.file_type = opts.format;
      if (opts.chunks != null) input.num_chunks = opts.chunks;
      if (opts.guidance != null) input.guidance_scale = opts.guidance;
      if (opts.faces != null) input.target_face_num = opts.faces;
      if (opts.octree != null) input.octree_resolution = opts.octree;
      if (opts.nobg) input.remove_background = true;
      return input;
    },
  },
  mvdream: {
    id: "adirik/mvdream:38af22609c9a779c2203c2009ff7451f115b44cde8d9a65ad132980714b82f34",
    name: "MVDream",
    type: "text-to-3d",
    cost: "per-second GPU",
    supportsImage: false,
    supportsText: true,
    nativeStl: false, // outputs renders only, no mesh
    nativeObj: false,
    nativeFbx: false,
    outputType: "uri-array", // uri[]
    buildInput: (prompt, imageUri, opts) => {
      const input = { prompt };
      if (opts.seed != null) input.seed = opts.seed;
      if (opts.maxsteps != null) input.max_steps = opts.maxsteps;
      if (opts.guidance != null) input.guidance_scale = opts.guidance;
      if (opts.negative) input.negative_prompt = opts.negative;
      return input;
    },
  },
  shape: {
    id: "cjwbw/shap-e:5957069d5c509126a73c7cb68abcddbb985aeefa4d318e7c63ec1352ce6da68c",
    name: "Shap-E",
    type: "multi",
    cost: "per-second GPU",
    supportsImage: true,
    supportsText: true,
    nativeStl: false, // outputs obj mesh or renders
    nativeObj: false,
    nativeFbx: false,
    outputType: "uri-array", // uri[]
    buildInput: (prompt, imageUri, opts) => {
      const input = {};
      if (prompt) input.prompt = prompt;
      if (imageUri) input.image = imageUri;
      if (opts.mesh) input.save_mesh = true;
      if (opts.count != null) input.batch_size = opts.count;
      if (opts.rendermode) input.render_mode = opts.rendermode;
      if (opts.rendersize != null) input.render_size = opts.rendersize;
      if (opts.guidance != null) input.guidance_scale = opts.guidance;
      return input;
    },
  },
};

// ── Argument Parser ────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    prompt: "",
    model: "trellis",
    image: null,
    seed: null,
    format: null,
    faces: null,
    quality: null,
    material: null,
    meshmode: null,
    tpose: false,
    preview: false,
    steps: null,
    guidance: null,
    texture: null,
    simplify: null,
    color: null,
    normal: false,
    ply: false,
    nobg: false,
    chunks: null,
    octree: null,
    speedmode: null,
    negative: null,
    maxsteps: null,
    mesh: false,
    rendermode: null,
    rendersize: null,
    count: null,
    bbox: null,
    addons: null,
    // Multi-view (hunyuan2mv)
    front: null,
    back: null,
    left: null,
    right: null,
    // Trellis advanced
    ss_steps: null,
    slat_steps: null,
    slat_guidance: null,
    // 3D printing
    stl: false,
    obj: false,
    fbx: false,
  };

  const positional = [];

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--model": result.model = args[++i]; break;
      case "--image": result.image = args[++i]; break;
      case "--seed": result.seed = parseInt(args[++i], 10); break;
      case "--format": result.format = args[++i]; break;
      case "--faces": result.faces = parseInt(args[++i], 10); break;
      case "--quality": result.quality = args[++i]; break;
      case "--material": result.material = args[++i]; break;
      case "--meshmode": result.meshmode = args[++i]; break;
      case "--tpose": result.tpose = true; break;
      case "--preview": result.preview = true; break;
      case "--steps": result.steps = parseInt(args[++i], 10); break;
      case "--guidance": result.guidance = parseFloat(args[++i]); break;
      case "--texture": result.texture = parseInt(args[++i], 10); break;
      case "--simplify": result.simplify = parseFloat(args[++i]); break;
      case "--color": result.color = true; break;
      case "--nocolor": result.color = false; break;
      case "--normal": result.normal = true; break;
      case "--ply": result.ply = true; break;
      case "--nobg": result.nobg = true; break;
      case "--chunks": result.chunks = parseInt(args[++i], 10); break;
      case "--octree": result.octree = parseInt(args[++i], 10); break;
      case "--speedmode": result.speedmode = args[++i]; break;
      case "--negative": result.negative = args[++i]; break;
      case "--maxsteps": result.maxsteps = parseInt(args[++i], 10); break;
      case "--mesh": result.mesh = true; break;
      case "--rendermode": result.rendermode = args[++i]; break;
      case "--rendersize": result.rendersize = parseInt(args[++i], 10); break;
      case "--count": result.count = parseInt(args[++i], 10); break;
      case "--bbox": result.bbox = args[++i]; break;
      case "--addons": result.addons = args[++i]; break;
      case "--prompt": result.prompt = args[++i]; break;
      case "--stl": result.stl = true; break;
      case "--obj": result.obj = true; break;
      case "--fbx": result.fbx = true; break;
      case "--front": result.front = args[++i]; break;
      case "--back": result.back = args[++i]; break;
      case "--left": result.left = args[++i]; break;
      case "--right": result.right = args[++i]; break;
      case "--ss_steps": result.ss_steps = parseInt(args[++i], 10); break;
      case "--slat_steps": result.slat_steps = parseInt(args[++i], 10); break;
      case "--slat_guidance": result.slat_guidance = parseFloat(args[++i]); break;
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

// ── GLB → STL Conversion ───────────────────────────────────────────
async function convertGlbToStl(glbPath, stlPath) {
  const io = new NodeIO();
  const document = await io.read(glbPath);
  const root = document.getRoot();

  // Collect all triangle data from all meshes
  const allTriangles = [];

  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const positionAccessor = primitive.getAttribute("POSITION");
      if (!positionAccessor) continue;

      const positions = positionAccessor.getArray();
      const indexAccessor = primitive.getIndices();

      let indices;
      if (indexAccessor) {
        indices = indexAccessor.getArray();
      } else {
        // Non-indexed geometry: sequential indices
        indices = new Uint32Array(positions.length / 3);
        for (let i = 0; i < indices.length; i++) indices[i] = i;
      }

      // Extract triangles
      for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i], i1 = indices[i + 1], i2 = indices[i + 2];
        const ax = positions[i0 * 3], ay = positions[i0 * 3 + 1], az = positions[i0 * 3 + 2];
        const bx = positions[i1 * 3], by = positions[i1 * 3 + 1], bz = positions[i1 * 3 + 2];
        const cx = positions[i2 * 3], cy = positions[i2 * 3 + 1], cz = positions[i2 * 3 + 2];

        // Compute face normal via cross product
        const ux = bx - ax, uy = by - ay, uz = bz - az;
        const vx = cx - ax, vy = cy - ay, vz = cz - az;
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len > 0) { nx /= len; ny /= len; nz /= len; }

        allTriangles.push({ nx, ny, nz, ax, ay, az, bx, by, bz, cx, cy, cz });
      }
    }
  }

  // Write binary STL
  const headerSize = 80;
  const triangleCount = allTriangles.length;
  const bufferSize = headerSize + 4 + triangleCount * 50; // 50 bytes per triangle
  const buffer = Buffer.alloc(bufferSize);

  // Header (80 bytes, can be anything)
  buffer.write("Binary STL generated by AlexMedia generate-3d.js", 0, "ascii");

  // Triangle count (uint32 LE)
  buffer.writeUInt32LE(triangleCount, headerSize);

  let offset = headerSize + 4;
  for (const tri of allTriangles) {
    buffer.writeFloatLE(tri.nx, offset); offset += 4;
    buffer.writeFloatLE(tri.ny, offset); offset += 4;
    buffer.writeFloatLE(tri.nz, offset); offset += 4;
    buffer.writeFloatLE(tri.ax, offset); offset += 4;
    buffer.writeFloatLE(tri.ay, offset); offset += 4;
    buffer.writeFloatLE(tri.az, offset); offset += 4;
    buffer.writeFloatLE(tri.bx, offset); offset += 4;
    buffer.writeFloatLE(tri.by, offset); offset += 4;
    buffer.writeFloatLE(tri.bz, offset); offset += 4;
    buffer.writeFloatLE(tri.cx, offset); offset += 4;
    buffer.writeFloatLE(tri.cy, offset); offset += 4;
    buffer.writeFloatLE(tri.cz, offset); offset += 4;
    buffer.writeUInt16LE(0, offset); offset += 2; // attribute byte count
  }

  fs.writeFileSync(stlPath, buffer);
  const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
  return { triangles: triangleCount, sizeMB };
}

// ── GLB → OBJ Conversion ──────────────────────────────────────────
async function convertGlbToObj(glbPath, objPath) {
  const io = new NodeIO();
  const document = await io.read(glbPath);
  const root = document.getRoot();

  const lines = ["# Generated by AlexMedia generate-3d.js"];
  let globalVertexOffset = 1; // OBJ indices are 1-based
  let totalVertices = 0;
  let meshIdx = 0;

  for (const mesh of root.listMeshes()) {
    lines.push(`o ${mesh.getName() || `mesh_${meshIdx++}`}`);

    for (const primitive of mesh.listPrimitives()) {
      const positionAccessor = primitive.getAttribute("POSITION");
      if (!positionAccessor) continue;

      const normalAccessor = primitive.getAttribute("NORMAL");
      const texcoordAccessor = primitive.getAttribute("TEXCOORD_0");
      const positions = positionAccessor.getArray();
      const normals = normalAccessor ? normalAccessor.getArray() : null;
      const texcoords = texcoordAccessor ? texcoordAccessor.getArray() : null;
      const indexAccessor = primitive.getIndices();
      const vertCount = positions.length / 3;

      // Write vertices (v)
      for (let i = 0; i < vertCount; i++) {
        lines.push(`v ${positions[i * 3]} ${positions[i * 3 + 1]} ${positions[i * 3 + 2]}`);
      }

      // Write normals (vn)
      if (normals) {
        for (let i = 0; i < vertCount; i++) {
          lines.push(`vn ${normals[i * 3]} ${normals[i * 3 + 1]} ${normals[i * 3 + 2]}`);
        }
      }

      // Write texcoords (vt)
      if (texcoords) {
        const uvCount = texcoords.length / 2;
        for (let i = 0; i < uvCount; i++) {
          lines.push(`vt ${texcoords[i * 2]} ${texcoords[i * 2 + 1]}`);
        }
      }

      // Build index list
      let indices;
      if (indexAccessor) {
        indices = indexAccessor.getArray();
      } else {
        indices = new Uint32Array(vertCount);
        for (let i = 0; i < vertCount; i++) indices[i] = i;
      }

      // Write faces (f)
      for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] + globalVertexOffset;
        const i1 = indices[i + 1] + globalVertexOffset;
        const i2 = indices[i + 2] + globalVertexOffset;
        if (normals && texcoords) {
          lines.push(`f ${i0}/${i0}/${i0} ${i1}/${i1}/${i1} ${i2}/${i2}/${i2}`);
        } else if (normals) {
          lines.push(`f ${i0}//${i0} ${i1}//${i1} ${i2}//${i2}`);
        } else {
          lines.push(`f ${i0} ${i1} ${i2}`);
        }
      }

      globalVertexOffset += vertCount;
      totalVertices += vertCount;
    }
  }

  const content = lines.join("\n");
  fs.writeFileSync(objPath, content, "utf8");
  const sizeMB = (Buffer.byteLength(content, "utf8") / (1024 * 1024)).toFixed(2);
  return { vertices: totalVertices, sizeMB };
}

// ── Get Extension from URL ─────────────────────────────────────────
// Normalize any Replicate output item to a plain URL string.
// Handles: plain string, FileOutput (toString / .url property / .url() method), URL objects.
function toUrlString(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  // FileOutput / URL object with toString
  const str = String(item);
  if (str && str !== "[object Object]") return str;
  // Fallback: .url property or .url() method
  if (typeof item.url === "function") return String(item.url());
  if (item.url) return String(item.url);
  return "";
}

function getExtFromUrl(url, fallback = "glb") {
  if (url.includes(".stl")) return "stl";
  if (url.includes(".fbx")) return "fbx";
  if (url.includes(".glb")) return "glb";
  if (url.includes(".obj")) return "obj";
  if (url.includes(".ply")) return "ply";
  if (url.includes(".mp4")) return "mp4";
  if (url.includes(".gif")) return "gif";
  if (url.includes(".png")) return "png";
  if (url.includes(".jpg") || url.includes(".jpeg")) return "jpg";
  if (url.includes(".webp")) return "webp";
  return fallback;
}

// ── Show Help ──────────────────────────────────────────────────────
function showHelp() {
  console.log('Usage: node generate-3d.js --model trellis --image ./object.png');
  console.log('       node generate-3d.js "a red fire hydrant" --model shape --mesh');
  console.log("\nModels:");
  for (const [key, m] of Object.entries(MODELS)) {
    const img = m.supportsImage ? "🖼️" : "  ";
    const txt = m.supportsText ? "📝" : "  ";
    const defaultTag = key === "trellis" ? " (default)" : "";
    const price = m.cost ? ` [${m.cost}]` : "";
    console.log(`  ${key.padEnd(12)} ${img} ${txt} ${m.name}${defaultTag}${price}`);
  }
  console.log("\nCommon Options:");
  console.log("  --model <name>       3D model (default: trellis)");
  console.log("  --image <path>       Input image (local file or URL)");
  console.log("  --seed <n>           Random seed");
  console.log("  --format <str>       Output format: glb, obj, stl, fbx (native models only)");
  console.log("  --faces <n>          Target face count for simplification");
  console.log("  --steps <n>          Inference steps");
  console.log("  --guidance <n>       Guidance scale/strength");
  console.log("  --nobg               Remove image background");
  console.log("\n3D Printing & DCC Export Options:");
  console.log("  --stl                Export as STL (3D printing)");
  console.log("                       Native: rodin, hunyuan2mv | GLB→STL: trellis, hunyuan");
  console.log("  --obj                Export as OBJ (Maya, Blender, Cinema 4D)");
  console.log("                       Native: rodin, hunyuan, hunyuan2mv | GLB→OBJ: trellis");
  console.log("  --fbx                Export as FBX (Maya native format)");
  console.log("                       Native: rodin only | Other models: outputs OBJ (convert in Blender/Maya)");
  console.log("\nTRELLIS Options:");
  console.log("  --texture <n>        Texture size (512-2048, default: 1024)");
  console.log("  --simplify <n>       Mesh simplification (0.9-0.98)");
  console.log("  --color              Generate color video render");
  console.log("  --normal             Generate normal video render");
  console.log("  --ply                Save Gaussian PLY file");
  console.log("  --ss_steps <n>       Stage 1 sampling steps");
  console.log("  --slat_steps <n>     Stage 2 sampling steps");
  console.log("  --slat_guidance <n>  Stage 2 guidance strength");
  console.log("\nRodin Options:");
  console.log("  --quality <str>      Quality: low, medium, high");
  console.log("  --material <str>     Material type (PBR)");
  console.log("  --meshmode <str>     Mesh face: Quad or Raw");
  console.log("  --tpose              Generate T/A pose for humans");
  console.log("  --preview            Generate preview render");
  console.log("  --bbox <w,h,l>       Bounding box condition");
  console.log("  --addons <a,b,...>   Additional features (comma-separated)");
  console.log("\nHunyuan Options:");
  console.log("  --speedmode <str>    Speed optimization level");
  console.log("  --chunks <n>         Number of chunks");
  console.log("  --octree <n>         Octree resolution");
  console.log("\nHunyuan2mv Options:");
  console.log("  --front <path>       Front view image");
  console.log("  --back <path>        Back view image");
  console.log("  --left <path>        Left view image");
  console.log("  --right <path>       Right view image");
  console.log("\nMVDream Options:");
  console.log("  --maxsteps <n>       Max training steps (default: 10000)");
  console.log("  --negative <str>     Negative prompt");
  console.log("\nShap-E Options:");
  console.log("  --mesh               Save as mesh output");
  console.log("  --rendermode <str>   Render mode: nerf or stf");
  console.log("  --rendersize <n>     Render size (default: 128)");
  console.log("  --count <n>          Batch count (default: 1)");
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

  // Require either image or text depending on model
  const hasImage = opts.image || opts.front;
  const hasText = !!opts.prompt;

  if (!hasImage && !hasText) {
    showHelp();
    process.exit(1);
  }

  if (!hasImage && !modelDef.supportsText) {
    console.error(`❌ ${modelDef.name} requires --image input. It does not support text-only generation.`);
    process.exit(1);
  }

  if (!hasText && !modelDef.supportsImage) {
    console.error(`❌ ${modelDef.name} requires a text prompt. It does not support image input.`);
    process.exit(1);
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("Missing REPLICATE_API_TOKEN in .env file");
    process.exit(1);
  }

  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  // Handle --stl flag: set native format or mark for post-processing
  let convertToStl = false;
  if (opts.stl) {
    if (modelDef.nativeStl) {
      opts.format = "stl";
      console.log(`🖨️  STL mode: ${modelDef.name} supports native STL output`);
    } else {
      convertToStl = true;
      console.log(`🖨️  STL mode: Will convert ${modelDef.name} output (GLB → STL) after download`);
    }
  } else if (opts.format === "stl" && !modelDef.nativeStl) {
    convertToStl = true;
    opts.format = null; // Don't pass unsupported format to API
    console.log(`🖨️  STL requested: Will convert ${modelDef.name} output (GLB → STL) after download`);
  }

  // Handle --obj flag: set native format or mark for post-processing
  let convertToObj = false;
  if (opts.obj) {
    if (modelDef.nativeObj) {
      opts.format = "obj";
      console.log(`📐 OBJ mode: ${modelDef.name} supports native OBJ output`);
    } else {
      convertToObj = true;
      console.log(`📐 OBJ mode: Will convert ${modelDef.name} output (GLB → OBJ) after download`);
    }
  } else if (opts.format === "obj" && !modelDef.nativeObj) {
    convertToObj = true;
    opts.format = null;
    console.log(`📐 OBJ requested: Will convert ${modelDef.name} output (GLB → OBJ) after download`);
  }

  // Handle --fbx flag: native on Rodin, otherwise fall back to OBJ conversion
  if (opts.fbx) {
    if (modelDef.nativeFbx) {
      opts.format = "fbx";
      console.log(`📐 FBX mode: ${modelDef.name} supports native FBX output`);
    } else {
      convertToObj = true;
      console.log(`⚠️  FBX not natively supported by ${modelDef.name} — outputting OBJ instead (open in Maya or Blender to re-export as FBX)`);
    }
  }

  // Ensure output directory
  const outputDir = path.join(__dirname, "media/3d");
  fs.mkdirSync(outputDir, { recursive: true });

  // Resolve primary image
  let imageUri = null;
  if (opts.image) {
    imageUri = imageToDataUri(opts.image);
  }

  // Display generation info
  console.log(`\n🧊 Generating 3D with ${modelDef.name}`);
  if (hasText) console.log(`   Prompt:   "${opts.prompt}"`);
  console.log(`   Model:    ${modelDef.id}`);
  console.log(`   Type:     ${modelDef.type}`);
  if (opts.image) console.log(`   Image:    ${opts.image}`);
  if (opts.front) console.log(`   Front:    ${opts.front}`);
  if (opts.back) console.log(`   Back:     ${opts.back}`);
  if (opts.left) console.log(`   Left:     ${opts.left}`);
  if (opts.right) console.log(`   Right:    ${opts.right}`);
  if (opts.seed != null) console.log(`   Seed:     ${opts.seed}`);
  if (opts.format) console.log(`   Format:   ${opts.format}`);
  if (opts.faces != null) console.log(`   Faces:    ${opts.faces}`);
  if (opts.quality) console.log(`   Quality:  ${opts.quality}`);
  if (opts.steps != null) console.log(`   Steps:    ${opts.steps}`);
  if (opts.guidance != null) console.log(`   Guidance: ${opts.guidance}`);
  if (opts.stl) console.log(`   STL:      ${modelDef.nativeStl ? "native" : "GLB\u2192STL conversion"}`);
  if (opts.obj) console.log(`   OBJ:      ${modelDef.nativeObj ? "native" : "GLB\u2192OBJ conversion"}`);
  if (opts.fbx) console.log(`   FBX:      ${modelDef.nativeFbx ? "native" : "OBJ fallback (re-export as FBX in Blender/Maya)"}`);
  console.log("");

  const startTime = Date.now();

  try {
    const input = modelDef.buildInput(opts.prompt, imageUri, opts);
    console.log("⏳ Running prediction (3D generation may take a few minutes)...\n");
    const output = await runWithRetry(replicate, modelDef.id, input);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const textForName = opts.prompt || (opts.image ? path.basename(opts.image, path.extname(opts.image)) : "3d");
    const sanitized = textForName
      .substring(0, 40)
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    const savedFiles = [];

    // Handle different output structures per model
    if (modelDef.outputType === "structured" && typeof output === "object" && !Array.isArray(output)) {
      // Trellis: { model_file, color_video, gaussian_ply, normal_video, combined_video, no_background_images }
      // Hunyuan: { mesh_paint }
      for (const [key, value] of Object.entries(output)) {
        if (!value) continue;

        const urls = Array.isArray(value) ? value : [value];
        for (let j = 0; j < urls.length; j++) {
          const url = toUrlString(urls[j]);
          if (!url || !url.startsWith("http")) continue;

          const ext = getExtFromUrl(url);
          const suffix = urls.length > 1 ? `_${j + 1}` : "";
          const filename = `${timestamp}_${modelKey}_${sanitized}_${key}${suffix}.${ext}`;
          const outputPath = path.join(outputDir, filename);

          console.log(`📥 Downloading ${key}...`);
          await downloadFile(url, outputPath);
          const fileSize = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
          savedFiles.push({ filename, fileSize, type: key, url });
        }
      }
    } else if (modelDef.outputType === "uri-array" || Array.isArray(output)) {
      // Array of URLs (mvdream, shape)
      const urls = Array.isArray(output) ? output : [output];
      for (let i = 0; i < urls.length; i++) {
        const url = toUrlString(urls[i]);
        if (!url || !url.startsWith("http")) continue;

        const ext = getExtFromUrl(url, opts.mesh ? "obj" : "gif");
        const suffix = urls.length > 1 ? `_${i + 1}` : "";
        const filename = `${timestamp}_${modelKey}_${sanitized}${suffix}.${ext}`;
        const outputPath = path.join(outputDir, filename);

        console.log(`📥 Downloading output ${i + 1}/${urls.length}...`);
        await downloadFile(url, outputPath);
        const fileSize = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
        savedFiles.push({ filename, fileSize, url });
      }
    } else {
      // Single URI output (rodin, hunyuan2mv)
      const url = toUrlString(output) || null;
      if (!url) {
        console.log("Raw output:", JSON.stringify(output, null, 2));
        throw new Error("Could not extract output URL from model response");
      }
      const ext = getExtFromUrl(url, opts.format || "glb");
      const filename = `${timestamp}_${modelKey}_${sanitized}.${ext}`;
      const outputPath = path.join(outputDir, filename);

      console.log("📥 Downloading 3D model...");
      await downloadFile(url, outputPath);
      const fileSize = (fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2);
      savedFiles.push({ filename, fileSize, url });
    }

    if (savedFiles.length === 0) {
      console.log("Raw output:", JSON.stringify(output, null, 2));
      throw new Error("No downloadable files found in model output");
    }

    // Post-processing: convert GLB/OBJ files to STL for 3D printing
    if (convertToStl) {
      const convertibleExts = ["glb"];
      const convertedFiles = [];

      for (const file of savedFiles) {
        const ext = path.extname(file.filename).slice(1).toLowerCase();
        if (!convertibleExts.includes(ext)) continue;

        const srcPath = path.join(outputDir, file.filename);
        const stlFilename = file.filename.replace(/\.glb$/i, ".stl");
        const stlPath = path.join(outputDir, stlFilename);

        console.log(`🔄 Converting ${file.filename} → STL...`);
        try {
          const result = await convertGlbToStl(srcPath, stlPath);
          const stlSize = (fs.statSync(stlPath).size / (1024 * 1024)).toFixed(2);
          convertedFiles.push({
            filename: stlFilename,
            fileSize: stlSize,
            type: (file.type || "") + "_stl",
            url: file.url,
            triangles: result.triangles,
          });
          console.log(`   ✅ STL: ${result.triangles.toLocaleString()} triangles (${stlSize} MB)`);
        } catch (convErr) {
          console.warn(`   ⚠️ STL conversion failed for ${file.filename}: ${convErr.message}`);
        }
      }

      savedFiles.push(...convertedFiles);
    }

    // Post-processing: convert GLB files to OBJ (Maya / Blender / Cinema 4D)
    if (convertToObj) {
      const convertedObjFiles = [];
      for (const file of savedFiles) {
        const ext = path.extname(file.filename).slice(1).toLowerCase();
        if (ext !== "glb") continue;

        const srcPath = path.join(outputDir, file.filename);
        const objFilename = file.filename.replace(/\.glb$/i, ".obj");
        const objPath = path.join(outputDir, objFilename);

        console.log(`🔄 Converting ${file.filename} → OBJ...`);
        try {
          const result = await convertGlbToObj(srcPath, objPath);
          const objSize = (fs.statSync(objPath).size / (1024 * 1024)).toFixed(2);
          convertedObjFiles.push({
            filename: objFilename,
            fileSize: objSize,
            type: (file.type || "") + "_obj",
            url: file.url,
            vertices: result.vertices,
          });
          console.log(`   ✅ OBJ: ${result.vertices.toLocaleString()} vertices (${objSize} MB)`);
        } catch (convErr) {
          console.warn(`   ⚠️ OBJ conversion failed for ${file.filename}: ${convErr.message}`);
        }
      }
      savedFiles.push(...convertedObjFiles);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Save generation report
    const report = {
      prompt: opts.prompt || null,
      model: modelDef.id,
      modelName: modelDef.name,
      type: modelDef.type,
      referenceImage: opts.image || null,
      multiView: { front: opts.front, back: opts.back, left: opts.left, right: opts.right },
      seed: opts.seed ?? null,
      format: opts.format || null,
      faces: opts.faces ?? null,
      quality: opts.quality || null,
      steps: opts.steps ?? null,
      guidance: opts.guidance ?? null,
      stlConversion: convertToStl || false,
      timestamp: new Date().toISOString(),
      elapsed: `${elapsed}s`,
      files: savedFiles.map((f) => ({
        name: f.filename,
        size: `${f.fileSize}MB`,
        type: f.type || null,
        url: f.url,
      })),
    };
    const reportFilename = `${timestamp}_${modelKey}_${sanitized}.json`;
    const reportPath = path.join(outputDir, reportFilename);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ 3D generation complete!`);
    for (const f of savedFiles) {
      const typeLabel = f.type ? ` (${f.type})` : "";
      console.log(`   File: media/3d/${f.filename}${typeLabel} (${f.fileSize} MB)`);
    }
    console.log(`   Time: ${elapsed}s`);
    console.log(`   Report: media/3d/${reportFilename}`);
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
