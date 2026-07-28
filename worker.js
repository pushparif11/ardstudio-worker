// ======================================================
// ARD STUDIO AI WORKER - FINAL APP REPOSITORY SYNCED
// Returns base64 image data to match BackendRepository.kt
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
const REQUEST_TIMEOUT = 120000;

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
// RESPONSES (MATCHES BackendRepository.kt EXPECTATIONS)
// ======================================================
function successResponse(imageBase64Data, status = 200) {
  return new Response(
    JSON.stringify({ 
      success: true, 
      imageBase64: imageBase64Data // Matches json.optString("imageBase64")
    }), 
    { status, headers: CORS_HEADERS }
  );
}

function errorResponse(message, status = 200) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: message 
    }), 
    { status, headers: CORS_HEADERS }
  );
}

// ======================================================
// PARSE ANDROID JSON PAYLOAD
// ======================================================
async function parseRequestData(request) {
  let bodyData = {};
  try {
    bodyData = await request.json();
  } catch (e) {
    throw new Error("Invalid JSON payload format.");
  }

  const imgData = bodyData.imageBase64 || bodyData.image || bodyData.imageUrl;
  
  if (!imgData || typeof imgData !== "string" || imgData.trim() === "") {
    throw new Error("Image parameter (imageBase64) is missing in the request payload.");
  }
  
  bodyData.image = imgData;
  return bodyData;
}

// ======================================================
// UTILITIES (ARRAYBUFFER TO BASE64)
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
    throw new Error(`Request failed: ${e.message}`); 
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

function formatBase64ForAi(base64Input) {
  if (!base64Input) return "";
  let cleanBase64 = base64Input.trim();
  if (cleanBase64.startsWith("data:image")) {
    return cleanBase64;
  }
  return `data:image/png;base64,${cleanBase64}`;
}

async function downloadImageBuffer(imageUrl) {
  const response = await fetchWithTimeout(imageUrl, { method: "GET" }); 
  if (!response.ok) throw new Error(`Status: ${response.status}`); 
  return await response.arrayBuffer();
}

// ======================================================
// AI API CALLER
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
    if (response.status === 503) {
        throw new Error("AI Model is loading. Please try again in 30 seconds.");
    }
    throw new Error(`AI Error: ${errorText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("image/")) {
     const imageBuffer = await response.arrayBuffer();
     return imageBuffer; // Returns raw bytes directly
  }

  const result = await response.json();
  let outputUrl = null;
  if (result.output_url) outputUrl = result.output_url;
  else if (result[0] && result[0].url) outputUrl = result[0].url;

  if (outputUrl) {
    return await downloadImageBuffer(outputUrl);
  }
  
  throw new Error("AI API did not return a valid output format.");
}

// ======================================================
// AI FEATURES
// ======================================================
async function executeEdit(body, env) {
  const formattedImg = formatBase64ForAi(body.image);
  const promptText = body.prompt || "enhance image, high quality";
  const payload = { inputs: promptText, image: formattedImg };
  
  let modelUrl = "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix";
  
  if (body.feature === "expand") {
    modelUrl = "https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix";
  } else if (body.feature === "upscale") {
    modelUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-x4-upscaler";
  } else if (body.feature === "enhance") {
    modelUrl = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-refiner-1.0";
  }

  // Gets raw image buffer from AI
  const imageBuffer = await callAiService(modelUrl, payload, env);
  
  // Converts buffer directly to Base64 string for your app's ImageUtils.base64ToBitmap()
  const base64Result = arrayBufferToBase64(imageBuffer);

  return successResponse(base64Result);
}

// ======================================================
// POST ROUTER
// ======================================================
async function handlePost(path, request, env) {
  let body;
  try {
    body = await parseRequestData(request);
  } catch (error) {
    return errorResponse(error.message);
  }

  try {
    switch (path) {
      case "/image/edit": return await executeEdit(body, env); 
      case "/expand": return await executeEdit(body, env);
      case "/upscale": return await executeEdit(body, env);
      case "/enhance": return await executeEdit(body, env);
      default: return errorResponse(`Endpoint '${path}' Not Found`); 
    }
  } catch (error) {
    return errorResponse(error.message);
  }
}
