// ======================================================
// ARD STUDIO AI WORKER - FULL COMPLETE CODE
// Base Worker & 6 AI Features Integration
// URL: https://ardstudio-api.mohammadarifshaikh05.workers.dev
// ======================================================

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env);
  }
};

// ======================================================
// CORS CONFIGURATION
// ======================================================
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

const API_VERSION = "1.0.0";
const APP_NAME = "ARD Studio AI Worker";
const REQUEST_TIMEOUT = 120000; // 2 Minutes

// ======================================================
// MAIN REQUEST HANDLER
// ======================================================
async function handleRequest(request, env) {
  try {
    if (request.method === "OPTIONS") { 
      return new Response(null, { status: 204, headers: CORS_HEADERS }); 
    } 
    const url = new URL(request.url); 
    const path = url.pathname; 
    
    if (request.method === "GET") { 
      return await handleGet(path); 
    } 
    if (request.method === "POST") { 
      return await handlePost(path, request, env); 
    } 
    
    return errorResponse("Method Not Allowed", 405); 
  } catch (e) {
    // 500 Error क्रैश से बचने के लिए साफ़ JSON रिस्पॉन्स
    return errorResponse(`Server Error: ${e.message}`, 500); 
  }
}

// ======================================================
// GET ROUTES
// ======================================================
async function handleGet(path) {
  switch (path) {
    case "/": 
      return successResponse({ app: APP_NAME, version: API_VERSION, status: "Running", url: "https://ardstudio-api.mohammadarifshaikh05.workers.dev" }); 
    case "/health": 
      return successResponse({ health: "OK", server: "Cloudflare Worker" }); 
    default: 
      return errorResponse("Route Not Found", 404); 
  }
}

// ======================================================
// RESPONSES
// ======================================================
function successResponse(data, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), { status, headers: CORS_HEADERS });
}

function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), { status, headers: CORS_HEADERS });
}

// ======================================================
// VALIDATIONS
// ======================================================
function requireImage(body) {
  if (!body || typeof body.image !== "string" || body.image.trim() === "") {
    throw new Error("Image URL is required in the payload."); 
  }
}

function requireMask(body) {
  if (!body.mask || typeof body.mask !== "string" || body.mask.trim() === "") {
    throw new Error("Mask image URL is required for this operation.");
  }
}

function requirePrompt(body) {
  if (!body.prompt || typeof body.prompt !== "string" || body.prompt.trim() === "") {
    throw new Error("Text prompt is required for this operation.");
  }
}

// ======================================================
// UTILITIES
// ======================================================
async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController(); 
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal }); 
    clearTimeout(id); 
    return response; 
  } catch (e) {
    clearTimeout(id); 
    throw new Error(`Request timed out or failed: ${e.message}`); 
  }
}

async function downloadImage(imageUrl) {
  try {
    const response = await fetchWithTimeout(imageUrl, { method: "GET" }); 
    if (!response.ok) throw new Error(`Status: ${response.status}`); 
    return await response.arrayBuffer();
  } catch(e) {
    throw new Error(`Failed to download AI image. ${e.message}`);
  }
}

// ======================================================
// CLOUDINARY UPLOAD
// ======================================================
async function uploadImage(imageBuffer, env) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary secrets are missing.");
  }

  const folder = "ardstudio";
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Create Signature
  const encoder = new TextEncoder();
  const query = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;
  const hash = await crypto.subtle.digest("SHA-1", encoder.encode(query));
  const signature = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  
  const form = new FormData();
  form.append("file", new Blob([imageBuffer], { type: "image/png" }), "image.png");
  form.append("folder", folder);
  form.append("timestamp", timestamp.toString());
  form.append("api_key", env.CLOUDINARY_API_KEY);
  form.append("signature", signature);

  const url = `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`;
  const response = await fetchWithTimeout(url, { method: "POST", body: form });

  if (!response.ok) {
    const txt = await response.text(); 
    throw new Error(`Cloudinary Upload Failed: ${txt}`); 
  }
  const result = await response.json();
  return result.secure_url;
}

// ======================================================
// AI API CALLER (USING HF_API_TOKEN)
// ======================================================
async function callAiService(modelUrl, payload, env) {
  if (!env.HF_API_TOKEN) throw new Error("Missing HF_API_TOKEN in environment variables.");
  
  const response = await fetchWithTimeout(modelUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.HF_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Provider Error (${response.status}): ${errorText}`);
  }

  // Hugging Face returns raw image bytes for many models, or JSON with URL
  const contentType = response.headers.get("content-type");
  
  if (contentType && contentType.includes("image/")) {
     // If API returns direct image blob, upload it to Cloudinary immediately
     const imageBuffer = await response.arrayBuffer();
     return await uploadImage(imageBuffer, env);
  }

  const result = await response.json();
  
  if (result.output_url) return result.output_url;
  if (result[0] && result[0].url) return result[0].url;
  
  throw new Error("AI API did not return a valid output format.");
}

async function processAndUpload(endpointUrl, payload, env) {
  // callAiService will now either return a direct Cloudinary URL (if blob) or a string URL to download
  const result = await callAiService(endpointUrl, payload, env);
  
  // If result is already a Cloudinary URL (starts with https://res.cloudinary.com)
  if (result.includes("cloudinary.com")) {
      return result;
  }
  
  // Otherwise, download the AI output URL and upload to Cloudinary
  const imageBuffer = await downloadImage(result);
  return await uploadImage(imageBuffer, env);
}

// ======================================================
// AI FEATURES (6 ENDPOINTS WITH REAL HF MODELS)
// ======================================================

async function executeExpand(body, env) {
  requireImage(body);
  const payload = { inputs: body.prompt || "expand background, high quality", image: body.image };
  const modelUrl = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

async function executeRemoveObject(body, env) {
  requireImage(body);
  requireMask(body);
  const payload = { inputs: "background, clean fill", image: body.image, mask_image: body.mask };
  const modelUrl = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

async function executeReplace(body, env) {
  requireImage(body);
  requireMask(body);
  requirePrompt(body);
  const payload = { inputs: body.prompt, image: body.image, mask_image: body.mask };
  const modelUrl = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

async function executeFilters(body, env) {
  requireImage(body);
  const payload = { inputs: body.style || "make it look cyberpunk", image: body.image };
  const modelUrl = "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

async function executeUpscale(body, env) {
  requireImage(body);
  const payload = { inputs: body.image };
  const modelUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-x4-upscaler"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

async function executeEnhance(body, env) {
  requireImage(body);
  const payload = { inputs: "enhance, high resolution, 4k", image: body.image };
  const modelUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-refiner-1.0"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

// ======================================================
// POST ROUTER
// ======================================================
async function handlePost(path, request, env) {
  let body;
  try {
    body = await request.json(); 
  } catch {
    return errorResponse("Invalid JSON Payload format received.", 400); 
  }

  try {
    switch (path) {
      // Yaha par /image/edit ko add kiya gaya hai
      case "/image/edit": return await executeExpand(body, env); 
      case "/expand": return await executeExpand(body, env);
      case "/remove-object": return await executeRemoveObject(body, env);
      case "/replace": return await executeReplace(body, env);
      case "/filters": return await executeFilters(body, env);
      case "/upscale": return await executeUpscale(body, env);
      case "/enhance": return await executeEnhance(body, env);
      default: return errorResponse(`Endpoint '${path}' Not Found`, 404); 
    }
  } catch (error) {
    // 500 क्रैश रोकने के लिए कस्टम एरर हैंडलर
    return errorResponse(`Processing Error: ${error.message}`, 400);
  }
}
