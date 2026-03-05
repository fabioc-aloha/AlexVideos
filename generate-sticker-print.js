/**
 * Alex Sticker Print Service — Order physical stickers & prints from online services
 *
 * Usage:
 *   node generate-sticker-print.js --file ./emoji.png --service all
 *   node generate-sticker-print.js --file ./sticker.png --service printify --type die-cut
 *   node generate-sticker-print.js --file ./design.png --service stickermule --quantity 50
 *   node generate-sticker-print.js --list --service printify
 *   node generate-sticker-print.js --file ./logo.png --service printful
 *
 * Services:
 *   printify      — Printify Print-on-Demand (full API: upload + catalog + pricing)
 *   printful      — Printful Print-on-Demand (full API: upload + catalog + pricing)
 *   stickermule   — StickerMule custom stickers (browser handoff)
 *   stickerapp    — StickerApp custom stickers (browser handoff)
 *   stickergiant  — StickerGiant professional printing (browser handoff)
 *   redbubble     — Redbubble print-on-demand marketplace (browser handoff)
 *   all           — Try all API services, show browser links for the rest
 *
 * Options:
 *   --file <path>        Image file to use as artwork (PNG, JPG, WebP)
 *   --service <name>     Target service or `all` (default: all)
 *   --type <style>       Sticker type: die-cut, kiss-cut, vinyl, holographic, clear, sheet, bumper
 *   --size <str>         Size: 2x2, 3x3, 4x4 or WxH in inches (default: 3x3)
 *   --quantity <n>       Number of stickers (default: 50)
 *   --finish <str>       Finish: matte, glossy, holographic (default: glossy)
 *   --list               List available sticker products from API services
 *   --open               Open browser for all services
 *   --json               Output results as JSON
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

// ── Service Definitions ────────────────────────────────────────────
const SERVICES = {
  printify: {
    name: "Printify",
    type: "api",
    description: "Print-on-demand platform with 100+ print providers, stickers, labels, and merch",
    uploadUrl: "https://printify.com/app/editor",
    apiBase: "https://api.printify.com/v1",
    formats: ["png", "jpg", "jpeg"],
    envVars: ["PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"],
    stickerKeywords: ["sticker", "decal", "label", "magnet"],
  },
  printful: {
    name: "Printful",
    type: "api",
    description: "Premium print-on-demand with high-quality stickers, kiss-cuts, and die-cuts",
    uploadUrl: "https://www.printful.com/custom/stickers",
    apiBase: "https://api.printful.com",
    formats: ["png", "jpg", "jpeg"],
    envVars: ["PRINTFUL_API_TOKEN"],
    stickerKeywords: ["sticker", "decal", "kiss-cut"],
  },
  stickermule: {
    name: "StickerMule",
    type: "browser",
    description: "Premium custom stickers: die-cut, kiss-cut, circle, rectangle, bumper, holographic, clear",
    uploadUrl: "https://www.stickermule.com/products/custom-stickers",
    formats: ["png", "jpg", "jpeg", "svg", "ai", "pdf", "eps"],
    typeUrls: {
      "die-cut": "https://www.stickermule.com/products/die-cut-stickers",
      "kiss-cut": "https://www.stickermule.com/products/kiss-cut-stickers",
      bumper: "https://www.stickermule.com/products/bumper-stickers",
      clear: "https://www.stickermule.com/products/clear-stickers",
      holographic: "https://www.stickermule.com/products/holographic-stickers",
      circle: "https://www.stickermule.com/products/circle-stickers",
      rectangle: "https://www.stickermule.com/products/rectangle-stickers",
      sheet: "https://www.stickermule.com/products/sticker-sheets",
    },
  },
  stickerapp: {
    name: "StickerApp",
    type: "browser",
    description: "Custom stickers with free online design tool, die-cut, kiss-cut, sheets, labels",
    uploadUrl: "https://stickerapp.com/custom-stickers",
    formats: ["png", "jpg", "jpeg", "svg", "ai", "pdf", "eps"],
    typeUrls: {
      "die-cut": "https://stickerapp.com/die-cut-stickers",
      "kiss-cut": "https://stickerapp.com/kiss-cut-stickers",
      vinyl: "https://stickerapp.com/vinyl-stickers",
      holographic: "https://stickerapp.com/holographic-stickers",
      clear: "https://stickerapp.com/clear-stickers",
      sheet: "https://stickerapp.com/sticker-sheets",
    },
  },
  stickergiant: {
    name: "StickerGiant",
    type: "browser",
    description: "Professional sticker & label printing, bulk orders, product labels, packaging",
    uploadUrl: "https://www.stickergiant.com/custom-stickers",
    formats: ["png", "jpg", "jpeg", "svg", "ai", "pdf", "eps"],
    typeUrls: {
      "die-cut": "https://www.stickergiant.com/die-cut-stickers",
      "kiss-cut": "https://www.stickergiant.com/kiss-cut-stickers",
      vinyl: "https://www.stickergiant.com/vinyl-stickers",
      bumper: "https://www.stickergiant.com/bumper-stickers",
      clear: "https://www.stickergiant.com/clear-stickers",
    },
  },
  redbubble: {
    name: "Redbubble",
    type: "browser",
    description: "Marketplace for print-on-demand stickers, merch, and art — sell or buy",
    uploadUrl: "https://www.redbubble.com/portfolio/images/new",
    formats: ["png", "jpg", "jpeg"],
  },
};

// ── Sticker Types Reference ────────────────────────────────────────
const STICKER_TYPES = {
  "die-cut": {
    description: "Cut to the exact shape of your design",
    minDPI: 300,
    bestFor: "logos, characters, custom shapes",
  },
  "kiss-cut": {
    description: "Cut around design on a square backing sheet",
    minDPI: 300,
    bestFor: "easy peel-off, sticker packs, giveaways",
  },
  vinyl: {
    description: "Durable waterproof vinyl material",
    minDPI: 300,
    bestFor: "outdoor use, laptops, water bottles",
  },
  holographic: {
    description: "Rainbow holographic finish that shifts in light",
    minDPI: 300,
    bestFor: "eye-catching designs, collectibles",
  },
  clear: {
    description: "Transparent background around design",
    minDPI: 300,
    bestFor: "glass, windows, transparent surfaces",
  },
  sheet: {
    description: "Multiple stickers printed on a single sheet",
    minDPI: 300,
    bestFor: "sticker packs, samplers, economy printing",
  },
  bumper: {
    description: "Large format rectangular sticker for vehicles",
    minDPI: 150,
    bestFor: "cars, bumpers, large surfaces",
  },
};

// ── Argument Parser ────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    file: null,
    service: "all",
    type: null,
    size: "3x3",
    quantity: 50,
    finish: "glossy",
    list: false,
    open: false,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--file": result.file = args[++i]; break;
      case "--service": result.service = args[++i]; break;
      case "--type": result.type = args[++i]; break;
      case "--size": result.size = args[++i]; break;
      case "--quantity": result.quantity = parseInt(args[++i], 10); break;
      case "--finish": result.finish = args[++i]; break;
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

// ── Image Quality Check ───────────────────────────────────────────
function checkImageQuality(fileInfo, opts) {
  const warnings = [];

  // File size check
  if (fileInfo.size < 50 * 1024) {
    warnings.push("Image is very small (< 50 KB) — may produce low-quality prints");
  }

  // Format check
  if (!["png", "jpg", "jpeg", "webp"].includes(fileInfo.ext)) {
    warnings.push(`${fileInfo.ext.toUpperCase()} may not be accepted — PNG is preferred for stickers`);
  }

  // Transparency check
  if (fileInfo.ext !== "png" && (opts.type === "die-cut" || opts.type === "clear")) {
    warnings.push(`${opts.type} stickers work best with PNG (transparency support)`);
  }

  return warnings;
}

// ════════════════════════════════════════════════════════════════════
// PRINTIFY API INTEGRATION
// ════════════════════════════════════════════════════════════════════

function printifyHeaders() {
  const token = process.env.PRINTIFY_API_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "AlexMedia/1.0",
  };
}

async function printifyListBlueprints() {
  const headers = printifyHeaders();
  if (!headers) throw new Error("PRINTIFY_API_TOKEN not set in .env");

  const response = await httpRequest("https://api.printify.com/v1/catalog/blueprints.json", { headers });
  if (response.statusCode !== 200) {
    throw new Error(`Printify API error (${response.statusCode}): ${response.body.substring(0, 200)}`);
  }

  const blueprints = JSON.parse(response.body);
  // Filter to sticker-related products
  const keywords = SERVICES.printify.stickerKeywords;
  return blueprints.filter((bp) =>
    keywords.some((kw) => bp.title.toLowerCase().includes(kw) || (bp.description || "").toLowerCase().includes(kw))
  );
}

async function printifyGetPrintProviders(blueprintId) {
  const headers = printifyHeaders();
  const response = await httpRequest(
    `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers.json`,
    { headers }
  );
  if (response.statusCode !== 200) return [];
  return JSON.parse(response.body);
}

async function printifyGetVariants(blueprintId, providerId) {
  const headers = printifyHeaders();
  const response = await httpRequest(
    `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`,
    { headers }
  );
  if (response.statusCode !== 200) return [];
  const data = JSON.parse(response.body);
  return data.variants || [];
}

async function printifyGetShipping(blueprintId, providerId) {
  const headers = printifyHeaders();
  const response = await httpRequest(
    `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/shipping.json`,
    { headers }
  );
  if (response.statusCode !== 200) return null;
  return JSON.parse(response.body);
}

async function printifyUploadImage(fileInfo) {
  const headers = printifyHeaders();
  const fileData = fs.readFileSync(fileInfo.path);
  const base64 = fileData.toString("base64");

  const postData = JSON.stringify({
    file_name: fileInfo.name,
    contents: base64,
  });

  const response = await httpRequest("https://api.printify.com/v1/uploads/images.json", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Length": Buffer.byteLength(postData),
    },
    body: postData,
  });

  if (response.statusCode !== 200) {
    throw new Error(`Upload failed (${response.statusCode}): ${response.body.substring(0, 200)}`);
  }
  return JSON.parse(response.body);
}

async function runPrintify(fileInfo, opts) {
  console.log("\n ── Printify ──────────────────────────────────────────────");
  console.log("   Print-on-demand platform with stickers, labels, and merch\n");

  const headers = printifyHeaders();
  if (!headers) {
    console.log("   ⚠️  PRINTIFY_API_TOKEN not set in .env");
    console.log("   Get your token: https://printify.com/app/account/api");
    console.log("   Add to .env: PRINTIFY_API_TOKEN=your_token_here\n");
    console.log("   → Opening browser: https://printify.com/app/editor");
    await openBrowser("https://printify.com/app/editor");
    return { service: "printify", type: "browser", url: "https://printify.com/app/editor" };
  }

  if (opts.list) {
    console.log("   📋 Searching sticker products in Printify catalog...\n");
    const blueprints = await printifyListBlueprints();

    if (blueprints.length === 0) {
      console.log("   No sticker products found in catalog.");
      return { service: "printify", type: "catalog", blueprints: [] };
    }

    console.log(`   Found ${blueprints.length} sticker product(s):\n`);
    console.log("   " + "ID".padEnd(8) + "Product".padEnd(40) + "Brand");
    console.log("   " + "─".repeat(70));

    for (const bp of blueprints.slice(0, 30)) {
      console.log(`   ${String(bp.id).padEnd(8)}${bp.title.substring(0, 38).padEnd(40)}${bp.brand || "—"}`);
    }
    if (blueprints.length > 30) {
      console.log(`   ... and ${blueprints.length - 30} more`);
    }

    return { service: "printify", type: "catalog", blueprints };
  }

  // Upload artwork
  if (fileInfo) {
    console.log(`   📤 Uploading artwork: ${fileInfo.name} (${fileInfo.sizeMB} MB)...`);
    try {
      const uploaded = await printifyUploadImage(fileInfo);
      console.log(`   ✅ Uploaded: ${uploaded.id}`);
      console.log(`   Dimensions: ${uploaded.width}×${uploaded.height} px`);
      console.log(`   Preview: ${uploaded.preview_url || "—"}`);

      // Find sticker blueprints and show pricing
      console.log("\n   📋 Searching sticker products...");
      const blueprints = await printifyListBlueprints();

      if (blueprints.length > 0) {
        console.log(`   Found ${blueprints.length} sticker product(s)\n`);

        // Show first few with pricing
        for (const bp of blueprints.slice(0, 5)) {
          console.log(`   📦 ${bp.title} (Blueprint #${bp.id})`);
          try {
            const providers = await printifyGetPrintProviders(bp.id);
            if (providers.length > 0) {
              const provider = providers[0];
              console.log(`      Provider: ${provider.title} (${provider.location?.country || "—"})`);

              const variants = await printifyGetVariants(bp.id, provider.id);
              if (variants.length > 0) {
                const sample = variants[0];
                console.log(`      Variants: ${variants.length} options`);
                console.log(`      Example: ${sample.title || "—"}`);
              }
            }
          } catch {
            // Skip variant details on error
          }
          console.log("");
        }
      }

      return {
        service: "printify",
        type: "upload",
        imageId: uploaded.id,
        dimensions: `${uploaded.width}×${uploaded.height}`,
        blueprints: blueprints.length,
      };
    } catch (err) {
      console.log(`   ❌ Upload failed: ${err.message}`);
      console.log("   → Opening browser instead...");
      await openBrowser("https://printify.com/app/editor");
      return { service: "printify", type: "browser-fallback", error: err.message };
    }
  }

  return { service: "printify", type: "info" };
}

// ════════════════════════════════════════════════════════════════════
// PRINTFUL API INTEGRATION
// ════════════════════════════════════════════════════════════════════

function printfulHeaders() {
  const token = process.env.PRINTFUL_API_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function printfulListProducts() {
  const headers = printfulHeaders();
  if (!headers) throw new Error("PRINTFUL_API_TOKEN not set in .env");

  const response = await httpRequest("https://api.printful.com/catalog/categories", { headers });
  if (response.statusCode !== 200) {
    throw new Error(`Printful API error (${response.statusCode}): ${response.body.substring(0, 200)}`);
  }

  const data = JSON.parse(response.body);
  const categories = data.result || [];

  // Find sticker/label categories
  const keywords = SERVICES.printful.stickerKeywords;
  return categories.filter((cat) =>
    keywords.some((kw) => cat.title.toLowerCase().includes(kw))
  );
}

async function printfulGetCatalogProducts(categoryId) {
  const headers = printfulHeaders();
  const response = await httpRequest(
    `https://api.printful.com/catalog/products?category_id=${categoryId}`,
    { headers }
  );
  if (response.statusCode !== 200) return [];
  const data = JSON.parse(response.body);
  return data.result || [];
}

async function printfulGetProduct(productId) {
  const headers = printfulHeaders();
  const response = await httpRequest(
    `https://api.printful.com/catalog/products/${productId}`,
    { headers }
  );
  if (response.statusCode !== 200) return null;
  const data = JSON.parse(response.body);
  return data.result || null;
}

async function printfulUploadFile(fileInfo) {
  const headers = printfulHeaders();
  const fileData = fs.readFileSync(fileInfo.path);
  const base64 = fileData.toString("base64");

  const mimeTypes = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  const mime = mimeTypes[fileInfo.ext] || "image/png";

  const postData = JSON.stringify({
    url: `data:${mime};base64,${base64}`,
  });

  const response = await httpRequest("https://api.printful.com/files", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Length": Buffer.byteLength(postData),
    },
    body: postData,
  });

  if (response.statusCode !== 200) {
    throw new Error(`Upload failed (${response.statusCode}): ${response.body.substring(0, 200)}`);
  }
  return JSON.parse(response.body);
}

async function runPrintful(fileInfo, opts) {
  console.log("\n ── Printful ─────────────────────────────────────────────");
  console.log("   Premium print-on-demand with high-quality stickers & merch\n");

  const headers = printfulHeaders();
  if (!headers) {
    console.log("   ⚠️  PRINTFUL_API_TOKEN not set in .env");
    console.log("   Get your token: https://www.printful.com/dashboard/developer");
    console.log("   Add to .env: PRINTFUL_API_TOKEN=your_token_here\n");
    console.log("   → Opening browser: https://www.printful.com/custom/stickers");
    await openBrowser("https://www.printful.com/custom/stickers");
    return { service: "printful", type: "browser", url: SERVICES.printful.uploadUrl };
  }

  if (opts.list) {
    console.log("   📋 Searching sticker products in Printful catalog...\n");
    try {
      const categories = await printfulListProducts();

      if (categories.length === 0) {
        // Try listing all products and filter
        console.log("   Searching full product catalog...");
        const response = await httpRequest("https://api.printful.com/catalog/products", { headers });
        if (response.statusCode === 200) {
          const data = JSON.parse(response.body);
          const products = (data.result || []).filter((p) =>
            SERVICES.printful.stickerKeywords.some((kw) =>
              p.title.toLowerCase().includes(kw) || (p.type_name || "").toLowerCase().includes(kw)
            )
          );

          if (products.length > 0) {
            console.log(`   Found ${products.length} sticker product(s):\n`);
            console.log("   " + "ID".padEnd(8) + "Product".padEnd(45) + "Type");
            console.log("   " + "─".repeat(70));

            for (const p of products.slice(0, 25)) {
              console.log(`   ${String(p.id).padEnd(8)}${p.title.substring(0, 43).padEnd(45)}${p.type_name || "—"}`);
            }
            if (products.length > 25) {
              console.log(`   ... and ${products.length - 25} more`);
            }
            return { service: "printful", type: "catalog", products };
          }
        }
        console.log("   No sticker products found.");
        return { service: "printful", type: "catalog", products: [] };
      }

      console.log(`   Found ${categories.length} sticker categor(ies):`);
      for (const cat of categories) {
        console.log(`   📦 ${cat.title} (Category #${cat.id})`);
        try {
          const products = await printfulGetCatalogProducts(cat.id);
          for (const p of products.slice(0, 5)) {
            console.log(`      • ${p.title} (#${p.id})`);
          }
        } catch {
          // Skip
        }
      }
      return { service: "printful", type: "catalog", categories };
    } catch (err) {
      console.log(`   ❌ ${err.message}`);
      return { service: "printful", type: "error", error: err.message };
    }
  }

  // Upload artwork
  if (fileInfo) {
    console.log(`   📤 Uploading artwork: ${fileInfo.name} (${fileInfo.sizeMB} MB)...`);
    try {
      const uploaded = await printfulUploadFile(fileInfo);
      const result = uploaded.result || uploaded;
      console.log(`   ✅ Uploaded: ${result.id || "OK"}`);
      if (result.size) console.log(`   Dimensions: ${result.width || "?"}×${result.height || "?"} px`);
      if (result.preview_url) console.log(`   Preview: ${result.preview_url}`);

      console.log("\n   → Next: Create a product using the uploaded artwork.");
      console.log("   → Dashboard: https://www.printful.com/dashboard");

      return {
        service: "printful",
        type: "upload",
        fileId: result.id,
        url: result.preview_url || result.url,
      };
    } catch (err) {
      console.log(`   ❌ Upload failed: ${err.message}`);
      console.log("   → Opening browser instead...");
      await openBrowser(SERVICES.printful.uploadUrl);
      return { service: "printful", type: "browser-fallback", error: err.message };
    }
  }

  return { service: "printful", type: "info" };
}

// ════════════════════════════════════════════════════════════════════
// BROWSER HANDOFF SERVICES
// ════════════════════════════════════════════════════════════════════

async function runBrowserService(serviceKey, fileInfo, opts) {
  const service = SERVICES[serviceKey];
  console.log(`\n ── ${service.name} ──${"─".repeat(Math.max(0, 50 - service.name.length))}`);
  console.log(`   ${service.description}`);

  // Determine URL based on sticker type
  let url = service.uploadUrl;
  if (opts.type && service.typeUrls && service.typeUrls[opts.type]) {
    url = service.typeUrls[opts.type];
    console.log(`   Type: ${opts.type} (${STICKER_TYPES[opts.type]?.description || "custom"})`);
  }

  // Check file format compatibility
  if (fileInfo) {
    const supported = service.formats.includes(fileInfo.ext);
    if (!supported) {
      console.log(`   ⚠️  ${fileInfo.ext.toUpperCase()} may not be supported. Preferred: ${service.formats.join(", ").toUpperCase()}`);
    }
    console.log(`   File: ${fileInfo.name} (${fileInfo.sizeMB} MB)`);
  }

  // Show type-specific URLs if available
  if (service.typeUrls && !opts.type) {
    console.log("\n   Available sticker types:");
    for (const [type, typeUrl] of Object.entries(service.typeUrls)) {
      const info = STICKER_TYPES[type];
      console.log(`   • ${type.padEnd(14)} ${info ? info.description : ""}`);
      console.log(`     ${typeUrl}`);
    }
  }

  console.log(`\n   → Opening browser: ${url}`);
  await openBrowser(url);
  console.log("   Upload your artwork on the website to configure and order.");

  return { service: serviceKey, type: "browser", url };
}

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════

async function main() {
  const opts = parseArgs();

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║      🏷️  Alex Sticker Print Service — Order Physical    ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  // Validate inputs
  if (!opts.list && !opts.file) {
    console.error("\n   ❌ No file specified. Use --file <path> or --list");
    console.error("   Run: node generate-sticker-print.js --help");
    process.exit(1);
  }

  // Get file info
  let fileInfo = null;
  if (opts.file) {
    try {
      fileInfo = getFileInfo(opts.file);
      console.log(`\n   📁 File: ${fileInfo.name}`);
      console.log(`   Format: ${fileInfo.ext.toUpperCase()} (${fileInfo.sizeMB} MB)`);

      // Quality check
      const warnings = checkImageQuality(fileInfo, opts);
      if (warnings.length > 0) {
        console.log("\n   ⚠️  Quality warnings:");
        for (const w of warnings) {
          console.log(`      • ${w}`);
        }
      }
    } catch (err) {
      console.error(`\n   ❌ ${err.message}`);
      process.exit(1);
    }
  }

  // Print order details
  if (opts.type) {
    const typeInfo = STICKER_TYPES[opts.type];
    console.log(`\n   Type: ${opts.type}${typeInfo ? ` — ${typeInfo.description}` : ""}`);
  }
  if (opts.quantity !== 50) console.log(`   Quantity: ${opts.quantity}`);
  if (opts.size !== "3x3") console.log(`   Size: ${opts.size} inches`);
  if (opts.finish !== "glossy") console.log(`   Finish: ${opts.finish}`);

  // Determine which services to run
  const serviceKey = opts.service.toLowerCase();
  const results = [];
  const startTime = Date.now();

  if (serviceKey === "all") {
    console.log("\n   🔄 Querying all services...\n");

    // API services
    for (const key of ["printify", "printful"]) {
      try {
        const result = await runServiceByKey(key, fileInfo, opts);
        if (result) results.push(result);
      } catch (err) {
        console.log(`\n   ⚠️  ${SERVICES[key].name}: ${err.message}`);
      }
    }

    // Browser services
    console.log("\n\n   🌐 Browser-based services (upload manually to order):");
    for (const key of ["stickermule", "stickerapp", "stickergiant", "redbubble"]) {
      const s = SERVICES[key];
      let url = s.uploadUrl;
      if (opts.type && s.typeUrls && s.typeUrls[opts.type]) {
        url = s.typeUrls[opts.type];
      }

      console.log(`\n   ● ${s.name}`);
      console.log(`     ${s.description}`);
      console.log(`     🔗 ${url}`);

      if (fileInfo && !s.formats.includes(fileInfo.ext)) {
        console.log(`     ⚠️  ${fileInfo.ext.toUpperCase()} may not be supported`);
      }
      results.push({ service: key, type: "browser", url });
    }

    if (opts.open) {
      console.log("\n   Opening all browser services...");
      for (const key of ["stickermule", "stickerapp", "stickergiant", "redbubble"]) {
        const s = SERVICES[key];
        let url = s.uploadUrl;
        if (opts.type && s.typeUrls && s.typeUrls[opts.type]) {
          url = s.typeUrls[opts.type];
        }
        await openBrowser(url);
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

  // Print design tips
  if (fileInfo && !opts.json) {
    console.log("\n\n   💡 Sticker Design Tips:");
    console.log("   • Use 300 DPI minimum for sharp prints");
    console.log("   • Add 1/8\" (3mm) bleed around the design");
    console.log("   • PNG with transparency for die-cut & clear stickers");
    console.log("   • CMYK color mode for accurate color reproduction");
    console.log("   • Keep important elements 1/16\" from the cut line");
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`   Done in ${elapsed}s`);
  if (fileInfo) console.log(`   File: ${fileInfo.name} (${fileInfo.ext.toUpperCase()}, ${fileInfo.sizeMB} MB)`);

  const apiResults = results.filter((r) => r.type === "upload" || r.type === "catalog");
  const browserResults = results.filter((r) => r.type === "browser" || r.type === "browser-fallback");
  if (apiResults.length > 0) {
    console.log(`   API services: ${apiResults.length} responded`);
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
    case "printify":
      return await runPrintify(fileInfo, opts);
    case "printful":
      return await runPrintful(fileInfo, opts);
    default:
      if (SERVICES[key]?.type === "browser") {
        return await runBrowserService(key, fileInfo, opts);
      }
      throw new Error(`No handler for service: ${key}`);
  }
}

// ── Help ───────────────────────────────────────────────────────────
function showHelp() {
  console.log("Usage: node generate-sticker-print.js --file ./sticker.png --service stickermule");
  console.log("       node generate-sticker-print.js --file ./emoji.png --service all --type die-cut");
  console.log("       node generate-sticker-print.js --list --service printify\n");
  console.log("Order physical stickers and prints from online production services.\n");

  console.log("Services:");
  for (const [key, svc] of Object.entries(SERVICES)) {
    const tag = svc.type === "api" ? " [API]" : " [Browser]";
    console.log(`  ${key.padEnd(16)}${svc.name}${tag}`);
    console.log(`  ${"".padEnd(16)}${svc.description}`);
  }

  console.log("\nSticker Types:");
  for (const [type, info] of Object.entries(STICKER_TYPES)) {
    console.log(`  ${type.padEnd(16)}${info.description}`);
    console.log(`  ${"".padEnd(16)}Best for: ${info.bestFor}`);
  }

  console.log("\nOptions:");
  console.log("  --file <path>        Image file to use as artwork (PNG, JPG, WebP)");
  console.log("  --service <name>     Target service (default: all)");
  console.log("  --type <style>       Sticker type: die-cut, kiss-cut, vinyl, holographic, clear, sheet, bumper");
  console.log("  --size <str>         Size in inches: 2x2, 3x3, 4x4 or WxH (default: 3x3)");
  console.log("  --quantity <n>       Number of stickers (default: 50)");
  console.log("  --finish <str>       Finish: matte, glossy, holographic (default: glossy)");
  console.log("  --list               List available sticker products from API services");
  console.log("  --open               Open browser for all services");
  console.log("  --json               Output results as JSON");

  console.log("\nEnvironment Variables (.env):");
  console.log("  PRINTIFY_API_TOKEN   Printify personal access token");
  console.log("  PRINTIFY_SHOP_ID     Printify shop ID (optional)");
  console.log("  PRINTFUL_API_TOKEN   Printful API token");

  console.log("\nExamples:");
  console.log("  # Get links to all sticker services");
  console.log("  node generate-sticker-print.js --file ./sticker.png --service all");
  console.log("");
  console.log("  # Order die-cut stickers from StickerMule");
  console.log("  node generate-sticker-print.js --file ./logo.png --service stickermule --type die-cut");
  console.log("");
  console.log("  # Upload artwork to Printify and browse sticker catalog");
  console.log("  node generate-sticker-print.js --file ./design.png --service printify");
  console.log("");
  console.log("  # List available sticker products");
  console.log("  node generate-sticker-print.js --list --service printify");
  console.log("");
  console.log("  # Pipeline: generate emoji, clean up, then order stickers");
  console.log("  node generate-emoji.js \"happy robot\" --model sdxlemoji");
  console.log("  node generate-edit-image.js --model rembg --image ./media/images/*sdxlemoji*.png");
  console.log("  node generate-sticker-print.js --file ./media/images/*rembg*.png --service all --type die-cut");
}

// ── Run ────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error(`\n   ❌ Fatal error: ${err.message}`);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
