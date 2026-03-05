/**
 * Alex 3D Print Service — Upload 3D models to online printing services & get quotes
 *
 * Usage:
 *   node generate-3d-print.js --file ./model.stl --service shapeways
 *   node generate-3d-print.js --file ./model.stl --service sculpteo --material white_plastic
 *   node generate-3d-print.js --file ./model.glb --service all --quantity 2
 *   node generate-3d-print.js --list --service shapeways
 *   node generate-3d-print.js --file ./model.stl --service craftcloud
 *
 * Services:
 *   shapeways    — Shapeways (full API: upload + instant pricing, 40+ materials)
 *   sculpteo     — Sculpteo/BASF (full API: upload + instant pricing, 50+ materials)
 *   materialise  — Materialise OnSite (browser handoff)
 *   pcbway       — PCBWay 3D Printing (browser handoff)
 *   xometry      — Xometry Instant Quoting (browser handoff)
 *   craftcloud   — Craftcloud by All3DP (browser handoff)
 *   all          — Try all API services, show browser links for the rest
 *
 * Options:
 *   --file <path>        3D model file to upload (STL, OBJ, GLB, 3MF, STEP)
 *   --service <name>     Target service (default: all)
 *   --material <name>    Filter by material name
 *   --quantity <n>       Number of copies (default: 1)
 *   --unit <str>         Unit: mm, cm, in (default: mm)
 *   --currency <str>     Currency: USD, EUR, GBP (default: USD)
 *   --scale <n>          Scale factor (default: 1.0)
 *   --list               List available materials for a service
 *   --open               Open browser for all services (including API ones)
 *   --json               Output results as JSON
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const FormData = require("form-data");

// ── Service Definitions ────────────────────────────────────────────
const SERVICES = {
  shapeways: {
    name: "Shapeways",
    type: "api",
    description: "Professional 3D printing with 40+ materials (OAuth2 API)",
    uploadUrl: "https://www.shapeways.com/upload",
    apiBase: "https://api.shapeways.com",
    formats: ["stl", "obj", "x3d", "dae", "wrl", "3ds", "step", "iges", "3mf"],
    envVars: ["SHAPEWAYS_CLIENT_ID", "SHAPEWAYS_CLIENT_SECRET"],
  },
  sculpteo: {
    name: "Sculpteo (BASF)",
    type: "api",
    description: "Industrial 3D printing with 50+ materials (REST API, no auth needed)",
    uploadUrl: "https://www.sculpteo.com/en/upload/",
    apiBase: "https://www.sculpteo.com",
    formats: ["stl", "obj", "3ds", "dae", "zip", "3mf", "step", "iges", "wrl"],
    envVars: [], // No auth needed for upload + pricing
  },
  materialise: {
    name: "Materialise OnSite",
    type: "browser",
    description: "Industrial 3D printing from Materialise (20+ materials, 100+ combos)",
    uploadUrl: "https://onsite.materialise.com/",
    formats: ["stl", "obj", "3mf", "step", "iges"],
  },
  pcbway: {
    name: "PCBWay 3D Printing",
    type: "browser",
    description: "3D printing + CNC machining + sheet metal (SLA, SLS, MJF, FDM, DMLS)",
    uploadUrl: "https://www.pcbway.com/rapid-prototyping/manufacture/?type=2",
    formats: ["stl", "obj", "step", "stp"],
  },
  xometry: {
    name: "Xometry",
    type: "browser",
    description: "AI-powered instant quoting for 3D printing, CNC, sheet metal, injection molding",
    uploadUrl: "https://www.xometry.com/quoting/home",
    formats: ["stl", "obj", "step", "stp", "iges", "3mf"],
  },
  craftcloud: {
    name: "Craftcloud (All3DP)",
    type: "browser",
    description: "Price comparison across 150+ manufacturers worldwide (35+ file formats)",
    uploadUrl: "https://craftcloud3d.com/en/upload",
    formats: ["stl", "obj", "step", "3mf", "zip"],
  },
};

// ── Argument Parser ────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    file: null,
    service: "all",
    material: null,
    quantity: 1,
    unit: "mm",
    currency: "USD",
    scale: 1.0,
    list: false,
    open: false,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--file": result.file = args[++i]; break;
      case "--service": result.service = args[++i]; break;
      case "--material": result.material = args[++i]; break;
      case "--quantity": result.quantity = parseInt(args[++i], 10); break;
      case "--unit": result.unit = args[++i]; break;
      case "--currency": result.currency = args[++i]; break;
      case "--scale": result.scale = parseFloat(args[++i]); break;
      case "--list": result.list = true; break;
      case "--open": result.open = true; break;
      case "--json": result.json = true; break;
      case "--help":
      case "-h":
        showHelp();
        process.exit(0);
      default:
        if (args[i].startsWith("--")) {
          console.warn(`Unknown option: ${args[i]}`);
        } else if (!result.file) {
          result.file = args[i];
        }
    }
  }
  return result;
}

// ── HTTP Request Helper ────────────────────────────────────────────
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const proto = parsedUrl.protocol === "https:" ? https : http;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {},
    };

    const req = proto.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ── Form Upload Helper ─────────────────────────────────────────────
function formUpload(url, formData, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const proto = parsedUrl.protocol === "https:" ? https : http;

    const headers = {
      ...formData.getHeaders(),
      ...extraHeaders,
    };

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers,
    };

    const req = proto.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
      });
    });

    req.on("error", reject);
    formData.pipe(req);
  });
}

// ── Open Browser ───────────────────────────────────────────────────
async function openBrowser(url) {
  try {
    const open = (await import("open")).default;
    await open(url);
    return true;
  } catch {
    console.log(`   Please open manually: ${url}`);
    return false;
  }
}

// ── File Info ──────────────────────────────────────────────────────
function getFileInfo(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const stats = fs.statSync(resolved);
  const ext = path.extname(resolved).toLowerCase().replace(".", "");
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  return {
    path: resolved,
    name: path.basename(resolved),
    ext,
    size: stats.size,
    sizeMB,
  };
}

// ════════════════════════════════════════════════════════════════════
// SHAPEWAYS API INTEGRATION
// ════════════════════════════════════════════════════════════════════

async function shapewaysAuth() {
  const clientId = process.env.SHAPEWAYS_CLIENT_ID;
  const clientSecret = process.env.SHAPEWAYS_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await httpRequest("https://api.shapeways.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = JSON.parse(response.body);
  if (!data.access_token) {
    throw new Error(`Shapeways auth failed: ${response.body}`);
  }
  return data.access_token;
}

async function shapewaysListMaterials(token) {
  const response = await httpRequest("https://api.shapeways.com/materials/v1", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = JSON.parse(response.body);
  if (data.result !== "success") {
    throw new Error(`Failed to list materials: ${response.body}`);
  }
  return data.materials;
}

async function shapewaysUpload(token, fileInfo, opts) {
  const fileData = fs.readFileSync(fileInfo.path);
  const base64 = fileData.toString("base64");

  const postData = JSON.stringify({
    fileName: fileInfo.name,
    file: encodeURIComponent(base64),
    description: `Uploaded via AlexMedia generate-3d-print.js`,
    hasRightsToModel: 1,
    acceptTermsAndConditions: 1,
  });

  const response = await httpRequest("https://api.shapeways.com/models/v1", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
    body: postData,
  });

  const data = JSON.parse(response.body);
  if (data.result !== "success") {
    throw new Error(`Shapeways upload failed: ${response.body}`);
  }
  return data;
}

async function shapewaysGetPricing(token, modelId) {
  const response = await httpRequest(`https://api.shapeways.com/models/${modelId}/v1`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = JSON.parse(response.body);
  if (data.result !== "success") {
    throw new Error(`Failed to get pricing: ${response.body}`);
  }
  return data;
}

async function runShapeways(fileInfo, opts) {
  console.log("\n ── Shapeways ──────────────────────────────────────────");

  const token = await shapewaysAuth();
  if (!token) {
    console.log("   ⚠️  Missing SHAPEWAYS_CLIENT_ID and/or SHAPEWAYS_CLIENT_SECRET in .env");
    console.log("   Register at: https://developers.shapeways.com/manage-apps");
    if (opts.list) return null;
    console.log("   → Opening browser for manual upload...");
    await openBrowser(SERVICES.shapeways.uploadUrl);
    return null;
  }

  // List materials mode
  if (opts.list) {
    console.log("   Fetching materials...");
    const materials = await shapewaysListMaterials(token);
    const entries = Object.values(materials);
    console.log(`\n   📋 Shapeways Materials (${entries.length}):\n`);
    console.log("   " + "ID".padEnd(8) + "Name");
    console.log("   " + "─".repeat(50));
    for (const mat of entries) {
      const name = mat.title || mat.name || "Unknown";
      const id = String(mat.materialId || mat.id);
      console.log(`   ${id.padEnd(8)}${name}`);
    }
    return { service: "shapeways", type: "materials", materials: entries };
  }

  // Upload + quote mode
  console.log(`   Uploading ${fileInfo.name} (${fileInfo.sizeMB} MB)...`);
  const uploadResult = await shapewaysUpload(token, fileInfo, opts);
  console.log(`   ✅ Upload complete! Model ID: ${uploadResult.modelId}`);

  // Get pricing for all materials
  console.log("   Fetching pricing...");

  // Brief delay to let Shapeways process the model
  await new Promise((r) => setTimeout(r, 2000));
  const modelInfo = await shapewaysGetPricing(token, uploadResult.modelId);

  const materials = modelInfo.materials || {};
  const materialEntries = Object.values(materials);

  // Also get material names
  const matList = await shapewaysListMaterials(token);

  const quotes = [];
  for (const mat of materialEntries) {
    if (!mat.isActive) continue;
    const matInfo = matList[String(mat.materialId)] || {};
    const name = matInfo.title || `Material ${mat.materialId}`;
    const price = mat.price != null ? parseFloat(mat.price) : null;

    if (price == null || price <= 0) continue;
    if (opts.material && !name.toLowerCase().includes(opts.material.toLowerCase())) continue;

    const totalPrice = price * opts.quantity;
    quotes.push({
      materialId: mat.materialId,
      name,
      unitPrice: price.toFixed(2),
      quantity: opts.quantity,
      totalPrice: totalPrice.toFixed(2),
      currency: "USD",
    });
  }

  // Sort by price
  quotes.sort((a, b) => parseFloat(a.unitPrice) - parseFloat(b.unitPrice));

  if (quotes.length === 0) {
    console.log("   ⚠️  No printable materials found for this model.");
    console.log("   The model may be too large, too small, or have geometry issues.");
    return { service: "shapeways", type: "quote", quotes: [] };
  }

  // Display pricing table
  console.log(`\n   💰 Shapeways Quotes (${quotes.length} materials):\n`);
  console.log("   " + "Material".padEnd(40) + "Unit Price".padEnd(14) + "Qty".padEnd(6) + "Total");
  console.log("   " + "─".repeat(70));
  for (const q of quotes.slice(0, 20)) {
    const name = q.name.length > 38 ? q.name.substring(0, 35) + "..." : q.name;
    console.log(`   ${name.padEnd(40)}$${q.unitPrice.padEnd(13)}${String(q.quantity).padEnd(6)}$${q.totalPrice}`);
  }
  if (quotes.length > 20) {
    console.log(`   ... and ${quotes.length - 20} more materials`);
  }

  console.log(`\n   🔗 View online: https://www.shapeways.com/model/${uploadResult.modelId}`);

  return { service: "shapeways", type: "quote", modelId: uploadResult.modelId, quotes };
}

// ════════════════════════════════════════════════════════════════════
// SCULPTEO API INTEGRATION
// ════════════════════════════════════════════════════════════════════

async function sculpteoListMaterials() {
  const response = await httpRequest("https://www.sculpteo.com/en/api/material/list/");
  const data = JSON.parse(response.body);
  return data;
}

async function sculpteoUpload(fileInfo, opts) {
  const form = new FormData();
  form.append("file", fs.createReadStream(fileInfo.path), {
    filename: fileInfo.name,
    contentType: "application/octet-stream",
  });
  form.append("name", path.basename(fileInfo.name, path.extname(fileInfo.name)).substring(0, 64));
  form.append("unit", opts.unit || "mm");
  form.append("scale", String(opts.scale || 1.0));

  // If Sculpteo credentials are available, associate the upload
  if (process.env.SCULPTEO_USER && process.env.SCULPTEO_PASSWORD) {
    form.append("designer", process.env.SCULPTEO_USER);
    form.append("password", process.env.SCULPTEO_PASSWORD);
  }

  const response = await formUpload(
    "https://www.sculpteo.com/en/upload_design/a/3D/",
    form,
    { "X-Requested-With": "XMLHttpRequest" }
  );

  if (response.statusCode >= 400) {
    throw new Error(`Sculpteo upload failed (HTTP ${response.statusCode}): ${response.body}`);
  }

  const data = JSON.parse(response.body);
  if (data.error) {
    throw new Error(`Sculpteo upload error: ${data.error}`);
  }
  return data;
}

async function sculpteoGetPrice(uuid, materials, opts) {
  const productNames = materials.join(",");
  const params = new URLSearchParams({
    uuid,
    quantity: String(opts.quantity || 1),
    scale: String(opts.scale || 1.0),
    unit: opts.unit || "mm",
    currency: opts.currency || "USD",
    productname: productNames,
  });

  const url = `https://www.sculpteo.com/en/api/design/3D/price_by_uuid/?${params}`;
  const response = await httpRequest(url);

  if (response.statusCode >= 400) {
    throw new Error(`Sculpteo price query failed (HTTP ${response.statusCode}): ${response.body}`);
  }

  return JSON.parse(response.body);
}

async function runSculpteo(fileInfo, opts) {
  console.log("\n ── Sculpteo (BASF) ────────────────────────────────────");

  // List materials mode
  if (opts.list) {
    console.log("   Fetching materials...");
    const materials = await sculpteoListMaterials();
    console.log(`\n   📋 Sculpteo Materials (${materials.length}):\n`);
    console.log("   " + "ID".padEnd(30) + "Name".padEnd(30) + "Min Thickness");
    console.log("   " + "─".repeat(75));
    for (const mat of materials) {
      const id = (mat.id || "").padEnd(30);
      const name = (mat.name || "").substr(0, 28).padEnd(30);
      const thickness = mat.dimensions_mm?.minimum_thickness
        ? `${mat.dimensions_mm.minimum_thickness} mm`
        : "—";
      if (opts.material && !mat.id.includes(opts.material) && !mat.name.toLowerCase().includes(opts.material.toLowerCase())) {
        continue;
      }
      console.log(`   ${id}${name}${thickness}`);
    }
    return { service: "sculpteo", type: "materials", materials };
  }

  // Upload + quote mode
  console.log(`   Uploading ${fileInfo.name} (${fileInfo.sizeMB} MB)...`);
  const uploadResult = await sculpteoUpload(fileInfo, opts);
  console.log(`   ✅ Upload complete! UUID: ${uploadResult.uuid}`);
  console.log(`   Model: "${uploadResult.name}" (${uploadResult.dimx?.toFixed(1)}×${uploadResult.dimy?.toFixed(1)}×${uploadResult.dimz?.toFixed(1)} ${uploadResult.unit})`);

  // Get available materials for pricing
  console.log("   Fetching materials & pricing...");
  const allMaterials = await sculpteoListMaterials();

  // Filter materials if specified
  let targetMaterials = allMaterials.map((m) => m.id);
  if (opts.material) {
    targetMaterials = allMaterials
      .filter((m) => m.id.includes(opts.material) || m.name.toLowerCase().includes(opts.material.toLowerCase()))
      .map((m) => m.id);
  }

  // Query pricing in batches (API may limit productname length)
  const batchSize = 10;
  const quotes = [];
  const matMap = {};
  for (const m of allMaterials) {
    matMap[m.id] = m;
  }

  for (let i = 0; i < targetMaterials.length; i += batchSize) {
    const batch = targetMaterials.slice(i, i + batchSize);
    try {
      const priceData = await sculpteoGetPrice(uploadResult.uuid, batch, opts);
      if (priceData.body && priceData.body.success !== false) {
        // Price response may be keyed by material or contain a single price
        if (priceData.body.price) {
          // Single material response
          const mat = batch[0];
          const matInfo = matMap[mat] || {};
          quotes.push({
            materialId: mat,
            name: matInfo.name || mat,
            unitPrice: priceData.body.price.unit_price_raw || "—",
            quantity: opts.quantity,
            totalPrice: priceData.body.price.total_cost_raw || "—",
            currency: opts.currency || "USD",
            delivery: priceData.body.delivery?.receipt_date || "—",
          });
        }
      }
    } catch (err) {
      // Some materials may not be compatible with the model — skip silently
      if (err.message?.includes("400") || err.message?.includes("error")) continue;
    }

    // Brief delay between batches to be nice to the API
    if (i + batchSize < targetMaterials.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Sort by price
  quotes.sort((a, b) => {
    const pa = parseFloat(a.unitPrice) || Infinity;
    const pb = parseFloat(b.unitPrice) || Infinity;
    return pa - pb;
  });

  if (quotes.length === 0) {
    console.log("   ⚠️  No pricing available. The model may need time to process.");
    console.log(`   Check online: https://www.sculpteo.com/gallery/design/ext/${uploadResult.uuid}`);
    return { service: "sculpteo", type: "quote", uuid: uploadResult.uuid, quotes: [] };
  }

  // Display pricing table
  console.log(`\n   💰 Sculpteo Quotes (${quotes.length} materials):\n`);
  console.log("   " + "Material".padEnd(30) + "Unit Price".padEnd(14) + "Qty".padEnd(6) + "Total".padEnd(14) + "Delivery");
  console.log("   " + "─".repeat(80));
  for (const q of quotes.slice(0, 20)) {
    const name = q.name.length > 28 ? q.name.substring(0, 25) + "..." : q.name;
    const up = q.unitPrice !== "—" ? `$${q.unitPrice}` : "—";
    const tp = q.totalPrice !== "—" ? `$${q.totalPrice}` : "—";
    console.log(`   ${name.padEnd(30)}${up.padEnd(14)}${String(q.quantity).padEnd(6)}${tp.padEnd(14)}${q.delivery}`);
  }
  if (quotes.length > 20) {
    console.log(`   ... and ${quotes.length - 20} more materials`);
  }

  console.log(
    `\n   🔗 View online: https://www.sculpteo.com/gallery/design/ext/${uploadResult.uuid}`
  );

  return { service: "sculpteo", type: "quote", uuid: uploadResult.uuid, quotes };
}

// ════════════════════════════════════════════════════════════════════
// BROWSER HANDOFF SERVICES
// ════════════════════════════════════════════════════════════════════

async function runBrowserService(serviceKey, fileInfo, opts) {
  const service = SERVICES[serviceKey];
  console.log(`\n ── ${service.name} ──${"─".repeat(Math.max(0, 50 - service.name.length))}`);
  console.log(`   ${service.description}`);

  // Check file format compatibility
  if (fileInfo) {
    const supported = service.formats.includes(fileInfo.ext);
    if (!supported) {
      console.log(`   ⚠️  ${fileInfo.ext.toUpperCase()} may not be supported. Preferred: ${service.formats.join(", ").toUpperCase()}`);
    }
    console.log(`   File: ${fileInfo.name} (${fileInfo.sizeMB} MB)`);
  }

  console.log(`   → Opening browser: ${service.uploadUrl}`);
  await openBrowser(service.uploadUrl);
  console.log("   Upload your file manually on the website to get a quote.");

  return { service: serviceKey, type: "browser", url: service.uploadUrl };
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

async function main() {
  const opts = parseArgs();

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║         🖨️  Alex 3D Print Service — Upload & Quote      ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // Validate inputs
  if (!opts.list && !opts.file) {
    console.error("\n   ❌ No file specified. Use --file <path> or --list");
    console.error("   Run: node generate-3d-print.js --help");
    process.exit(1);
  }

  // Get file info
  let fileInfo = null;
  if (opts.file) {
    try {
      fileInfo = getFileInfo(opts.file);
      console.log(`\n   📁 File: ${fileInfo.name}`);
      console.log(`   Format: ${fileInfo.ext.toUpperCase()} (${fileInfo.sizeMB} MB)`);
    } catch (err) {
      console.error(`\n   ❌ ${err.message}`);
      process.exit(1);
    }
  }

  // Determine which services to run
  const serviceKey = opts.service.toLowerCase();
  const results = [];
  const startTime = Date.now();

  if (serviceKey === "all") {
    // Run API services first, then show browser links
    console.log("\n   🔄 Querying all services...\n");

    // API services
    for (const key of ["shapeways", "sculpteo"]) {
      try {
        const result = await runServiceByKey(key, fileInfo, opts);
        if (result) results.push(result);
      } catch (err) {
        console.log(`\n   ⚠️  ${SERVICES[key].name}: ${err.message}`);
      }
    }

    // Browser services
    console.log("\n\n   🌐 Browser-based services (upload manually for quotes):");
    for (const key of ["craftcloud", "xometry", "materialise", "pcbway"]) {
      const s = SERVICES[key];
      console.log(`\n   ● ${s.name}`);
      console.log(`     ${s.description}`);
      console.log(`     🔗 ${s.uploadUrl}`);
      if (fileInfo && !s.formats.includes(fileInfo.ext)) {
        console.log(`     ⚠️  ${fileInfo.ext.toUpperCase()} may not be supported`);
      }
      results.push({ service: key, type: "browser", url: s.uploadUrl });
    }

    if (opts.open) {
      console.log("\n   Opening all browser services...");
      for (const key of ["craftcloud", "xometry", "materialise", "pcbway"]) {
        await openBrowser(SERVICES[key].uploadUrl);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } else if (SERVICES[serviceKey]) {
    try {
      const result = await runServiceByKey(serviceKey, fileInfo, opts);
      if (result) results.push(result);
    } catch (err) {
      console.error(`\n   ❌ ${SERVICES[serviceKey].name}: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.error(`\n   ❌ Unknown service: ${serviceKey}`);
    console.error(`   Available: ${Object.keys(SERVICES).join(", ")}, all`);
    process.exit(1);
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`   Done in ${elapsed}s`);
  if (fileInfo) console.log(`   File: ${fileInfo.name} (${fileInfo.ext.toUpperCase()}, ${fileInfo.sizeMB} MB)`);

  const apiResults = results.filter((r) => r.type === "quote");
  const browserResults = results.filter((r) => r.type === "browser");
  if (apiResults.length > 0) {
    const totalQuotes = apiResults.reduce((sum, r) => sum + (r.quotes?.length || 0), 0);
    console.log(`   API quotes: ${totalQuotes} materials across ${apiResults.length} service(s)`);
  }
  if (browserResults.length > 0) {
    console.log(`   Browser services: ${browserResults.length} link(s) provided`);
  }
  console.log("");

  // JSON output
  if (opts.json) {
    console.log(JSON.stringify(results, null, 2));
  }

  return results;
}

async function runServiceByKey(key, fileInfo, opts) {
  switch (key) {
    case "shapeways":
      return await runShapeways(fileInfo, opts);
    case "sculpteo":
      return await runSculpteo(fileInfo, opts);
    default:
      if (SERVICES[key]?.type === "browser") {
        return await runBrowserService(key, fileInfo, opts);
      }
      throw new Error(`No handler for service: ${key}`);
  }
}

// ── Help ───────────────────────────────────────────────────────────
function showHelp() {
  console.log('Usage: node generate-3d-print.js --file ./model.stl --service shapeways');
  console.log('       node generate-3d-print.js --file ./model.stl --service all');
  console.log('       node generate-3d-print.js --list --service sculpteo\n');
  console.log('Upload 3D models to online printing services and get instant price quotes.\n');

  console.log("Services:");
  for (const [key, svc] of Object.entries(SERVICES)) {
    const tag = svc.type === "api" ? " [API]" : " [Browser]";
    console.log(`  ${key.padEnd(14)}${svc.name}${tag}`);
    console.log(`  ${"".padEnd(14)}${svc.description}`);
  }

  console.log("\nOptions:");
  console.log("  --file <path>        3D model file (STL, OBJ, GLB, 3MF, STEP)");
  console.log("  --service <name>     Target service (default: all)");
  console.log("  --material <name>    Filter by material name");
  console.log("  --quantity <n>       Number of copies (default: 1)");
  console.log("  --unit <str>         Measurement unit: mm, cm, in (default: mm)");
  console.log("  --currency <str>     Currency: USD, EUR, GBP (default: USD)");
  console.log("  --scale <n>          Scale factor (default: 1.0)");
  console.log("  --list               List available materials for a service");
  console.log("  --open               Open browser for all services");
  console.log("  --json               Output results as JSON");

  console.log("\nEnvironment Variables (.env):");
  console.log("  SHAPEWAYS_CLIENT_ID       Shapeways API client ID");
  console.log("  SHAPEWAYS_CLIENT_SECRET   Shapeways API client secret");
  console.log("  SCULPTEO_USER             Sculpteo username (optional)");
  console.log("  SCULPTEO_PASSWORD         Sculpteo password (optional)");

  console.log("\nExamples:");
  console.log("  # Get quotes from all services");
  console.log("  node generate-3d-print.js --file ./model.stl --service all");
  console.log("");
  console.log("  # Quote a specific material on Shapeways");
  console.log("  node generate-3d-print.js --file ./part.stl --service shapeways --material plastic");
  console.log("");
  console.log("  # List Sculpteo materials");
  console.log("  node generate-3d-print.js --list --service sculpteo");
  console.log("");
  console.log("  # Get quote for 5 copies in EUR");
  console.log("  node generate-3d-print.js --file ./gear.stl --service sculpteo --quantity 5 --currency EUR");
  console.log("");
  console.log("  # Open all browser-based services");
  console.log("  node generate-3d-print.js --file ./figure.stl --service all --open");
  console.log("");
  console.log("  # Pipeline: generate 3D model, then get print quotes");
  console.log("  node generate-3d.js --model rodin --image ./obj.png --stl && \\");
  console.log("    node generate-3d-print.js --file ./media/3d/*rodin*.stl --service all");
}

// ── Run ────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error(`\n   ❌ Fatal error: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
