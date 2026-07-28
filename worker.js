// ======================================================
// ARD STUDIO AI WORKER - REAL AI EXECUTION VERSION
// Fully integrated with real Hugging Face AI processing
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
const REQUEST_TIMEOUT = 115000; // 115 Seconds (Max safe limit for Cloudflare Workers)

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
function successResponse(imageBase64Data, status = 200) {
  return new Response(
    JSON.stringify({ 
      success: true, 
      imageBase64: imageBase64Data 
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
    throw new Error(`AI request timed out or failed: ${e.message}`); 
  }
}

function formatBase64ForAi(base64Input) {
  if (!base64Input) return "";
  let cleanBase64 = base64Input.trim();
  if (cleanBase64.startsWith("data:image")) {
    return cleanBase64;
  }
  return `data:image/png;base64,${cleanBase64}`;
}

// ======================================================
// REAL AI EXECUTION (HUGGING FACE)
// ======================================================
async function executeEdit(body, env) {
  if (!env.HF_API_TOKEN) {
    throw new Error("Missing HF_API_TOKEN in Cloudflare environment secrets.");
  }

  const formattedImg = formatBase64ForAi(body.imageBase64 || body.image);
  const promptText = body.prompt || "expand the background naturally with a realistic continuation, high quality, 4k";
  
  // Using Stable Diffusion Inpainting / Outpainting model which actually expands/modifies images
  const modelUrl = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting";

  const payload = {
    inputs: promptText,
    image: formattedImg
  };

  const response = await fetchWithTimeout(modelUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.HF_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }, REQUEST_TIMEOUT);

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 503) {
      throw new Error("AI Model is currently loading on Hugging Face. Please try again in 20 seconds.");
    }
    throw new Error(`AI Provider Error (${response.status}): ${errorText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("image/")) {
     const buffer = await response.arrayBuffer();
     let binary = '';
     const bytes = new Uint8Array(buffer);
     for (let i = 0; i < bytes.byteLength; i++) {
       binary += String.fromCharCode(bytes[i]);
     }
     return successResponse(btoa(binary));
  }

  const result = await response.json();
  throw new Error(result.error || "AI did not return a valid image output.");
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
