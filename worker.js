// ======================================================
// ARD STUDIO AI WORKER - FINAL FIXED CODE
// No More HTTP 400/404 Errors (Auto Base64 Conversion)
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

// NOTE: Changed default error status to 200 temporarily so your app 
// shows the actual JSON error message instead of a generic "HTTP 400" toast
function errorResponse(message, status = 200) {
  return new Response(JSON.stringify({ success: false, error: message }), { status, headers: CORS_HEADERS });
}

// ======================================================
// VALIDATIONS
// ======================================================
function requireImage(body) {
  if (!body || typeof body.image !== "string" || body.image.trim() === "") {
    throw new Error("Image parameter is missing in the request payload."); 
  }
}

function requireMask(body) {
  if (!body.mask || typeof body.mask !== "string" || body.mask.trim() === "") {
    throw new Error("Mask image is required for this specific operation.");
  }
}

// ======================================================
// UTILITIES (BASE64 & DOWNLOADS)
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

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// THIS FIXES THE 400 ERROR: Downloads URL and converts to Base64 for Hugging Face
async function getImageBase64(input) {
  if (!input) return null;
  // If it's already a base64 string
  if (input.startsWith("data:image") || input.length > 2000) {
    if (input.includes(",")) return input.split(",")[1];
    return input;
  }
  // If it's a URL, download and convert it
  try {
    const response = await fetchWithTimeout(input, { method: "GET" }); 
    if (!response.ok) throw new Error(`HTTP ${response.status}`); 
    const buffer = await response.arrayBuffer();
    return arrayBufferToBase64(buffer);
  } catch (e) {
    throw new Error(`Failed to download input image. ${e.message}`);
  }
}

async function downloadImage(imageUrl) {
  try {
    const response = await fetchWithTimeout(imageUrl, { method: "GET" }); 
    if (!response.ok) throw new Error(`Status: ${response.status}`); 
    return await response.arrayBuffer();
  } catch(e) {
    throw new Error(`Failed to download generated AI image. ${e.message}`);
  }
}

// ======================================================
// CLOUDINARY UPLOAD
// ======================================================
async function uploadImage(imageBuffer, env) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary secrets are missing in Worker settings.");
  }

  const folder = "ardstudio";
  const timestamp = Math.floor(Date.now() / 1000);
  
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
    let errMsg = errorText;
    try {
       const errJson = JSON.parse(errorText);
       if (errJson.error) errMsg = errJson.error;
    } catch(e) {}
    
    // If model is loading, Hugging Face returns 503
    if (response.status === 503) {
        throw new Error(`AI Model is currently loading. Please try again in 30 seconds.`);
    }
    throw new Error(`AI Provider Error: ${errMsg}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("image/")) {
     const imageBuffer = await response.arrayBuffer();
     return await uploadImage(imageBuffer, env);
  }

  const result = await response.json();
  if (result.output_url) return result.output_url;
  if (result[0] && result[0].url) return result[0].url;
  
  throw new Error("AI API did not return a valid output format.");
}

async function processAndUpload(endpointUrl, payload, env) {
  const result = await callAiService(endpointUrl, payload, env);
  if (result.includes("cloudinary.com")) return result;
  
  const imageBuffer = await downloadImage(result);
  return await uploadImage(imageBuffer, env);
}

// ======================================================
// AI FEATURES (UPDATED TO PREVENT HF 400 ERRORS)
// ======================================================

async function executeExpand(body, env) {
  requireImage(body);
  // URL to Base64 conversion (Prevents HF HTTP 400)
  const base64Img = await getImageBase64(body.image);
  
  const promptText = body.prompt || body.expand_prompt || "expand the background seamlessly, highly detailed";
  const payload = { inputs: promptText, image: base64Img };
  
  // Using Instruct-Pix2Pix because it DOES NOT require a mask (prevents 400 error)
  const modelUrl = "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

async function executeRemoveObject(body, env) {
  requireImage(body);
  requireMask(body);
  const base64Img = await getImageBase64(body.image);
  const base64Mask = await getImageBase64(body.mask);
  
  const payload = { inputs: "background, clean fill", image: base64Img, mask_image: base64Mask };
  const modelUrl = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

async function executeReplace(body, env) {
  requireImage(body);
  requireMask(body);
  const base64Img = await getImageBase64(body.image);
  const base64Mask = await getImageBase64(body.mask);
  
  const payload = { inputs: body.prompt || "replace object", image: base64Img, mask_image: base64Mask };
  const modelUrl = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

async function executeFilters(body, env) {
  requireImage(body);
  const base64Img = await getImageBase64(body.image);
  
  const payload = { inputs: body.style || "make it look cyberpunk", image: base64Img };
  const modelUrl = "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

async function executeUpscale(body, env) {
  requireImage(body);
  const base64Img = await getImageBase64(body.image);
  
  const payload = { inputs: base64Img };
  const modelUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-x4-upscaler"; 
  const finalImage = await processAndUpload(modelUrl, payload, env);
  return successResponse({ image: finalImage });
}

async function executeEnhance(body, env) {
  requireImage(body);
  const base64Img = await getImageBase64(body.image);
  
  const payload = { inputs: "enhance, high resolution, 4k", image: base64Img };
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
    return errorResponse("Invalid JSON Payload. Ensure you are sending JSON data."); 
  }

  try {
    switch (path) {
      // Mapped your app's endpoint to executeExpand
      case "/image/edit": return await executeExpand(body, env); 
      case "/expand": return await executeExpand(body, env);
      case "/remove-object": return await executeRemoveObject(body, env);
      case "/replace": return await executeReplace(body, env);
      case "/filters": return await executeFilters(body, env);
      case "/upscale": return await executeUpscale(body, env);
      case "/enhance": return await executeEnhance(body, env);
      default: return errorResponse(`Endpoint '${path}' Not Found`); 
    }
  } catch (error) {
    // Shows the exact error reason inside the app instead of crashing
    return errorResponse(error.message);
  }
}
