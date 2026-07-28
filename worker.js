export default {
  async fetch(request, env) {
    // CORS  
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 60000);

    try {
      const url = new URL(request.url);

      // Health Check Route (Root URL ke liye)
      if (request.method === "GET" && url.pathname === "/") {
        return json({
          success: true,
          app: "ARD Studio API",
          version: "2.0.0",
          status: "online",
          services: {
  openrouter: !!env.OPENROUTER_API_KEY,
  huggingface: !!env.HF_API_TOKEN,
  cloudinary: !!env.CLOUDINARY_CLOUD_NAME
}
        });
      }

      let body = null;
      if (request.method === "POST") {
        try {
          body = await request.json();
        } catch {
          return error("Invalid JSON", 400);
        }
      }

      // Chat Route
      if (request.method === "POST" && url.pathname === "/chat") {
        if (!body.messages || !Array.isArray(body.messages)) {
          return error("messages is required", 400);
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: body.messages
          })
        });

        if (!response.ok) {
          const err = await response.text();
          return error(err, response.status);
        }

        const data = await response.json();
        return json({
          success: true,
          reply: data.choices?.[0]?.message?.content ?? ""
        });
      }

      // Prompt Improve Route
      if (request.method === "POST" && url.pathname === "/prompt/improve") {
        if (!body.prompt || typeof body.prompt !== "string") {
          return error("prompt is required", 400);
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "Improve image generation prompts."
              },
              {
                role: "user",
                content: body.prompt
              }
            ]
          })
        });

        if (!response.ok) {
    const msg = await response.text();
    console.error("Cloudinary Error:", msg);
    throw new Error(msg);
}

        const data = await response.json();
        return json({
          success: true,
          prompt: data.choices?.[0]?.message?.content ?? body.prompt
        });
      }

      // Image Edit Route
if (request.method === "POST" && url.pathname === "/image/edit") {
  const { feature, prompt, imageBase64 } = body;

  if (!feature) {
    return error("feature is required", 400);
  }

  if (!prompt) {
    return error("prompt is required", 400);
  }

  if (
    feature.toLowerCase() !== "generate" &&
    !imageBase64
  ) {
    return error("imageBase64 is required", 400);
  }

  let finalPrompt = prompt;

  switch (feature.toLowerCase()) {
    case "remove_background":
      finalPrompt = "Remove the background completely and preserve the subject exactly.";
      break;

    case "remove_object":
      finalPrompt = `Remove the selected object. ${prompt}`;
      break;

    case "replace_object":
      finalPrompt = `Replace the selected object. ${prompt}`;
      break;

    case "face_enhance":
      finalPrompt = "Enhance the face naturally, preserve identity.";
      break;

    case "upscale":
      finalPrompt = "Upscale image to high quality.";
      break;

    case "enhance":
      finalPrompt = "Enhance image quality while preserving identity.";
      break;

    case "expand":
      finalPrompt = `Outpaint image naturally. ${prompt}`;
      break;
  }

  const imageDataUri = imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/png;base64,${imageBase64}`;

  const imageUrl = await uploadToCloudinary(imageDataUri, env);

const imageBuffer = await hfRequest(
  HF_MODELS.FILL,
  {
    inputs: finalPrompt,
    image: imageUrl
  },
  env
);

const bytes = new Uint8Array(imageBuffer);

let binary = "";
for (const b of bytes) {
  binary += String.fromCharCode(b);
}

const outputImageBase64 = btoa(binary);
  
return json({
  success: true,
  imageBase64: outputImageBase64
});
}
      

      return error("Route not found", 404);

    } catch (e) {
      console.error(e);
      return error(e?.message || "Internal Server Error", 500);
    } finally {
      clearTimeout(timeout);
    }
  }
};

// --- Helper Functions ---
function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

function error(message, status = 500) {
  return new Response(JSON.stringify({
    success: false,
    error: message
  }), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
  };
}
// ---------- Cloudinary Helper ----------
function cloudinaryBase(env) {
  return `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}`;
}

// ---------- Hugging Face Helper ----------
const HF_MODELS = {
  FILL: "black-forest-labs/FLUX.1-Fill-dev",
  UPSCALE: "caidas/swin2SR-classical-sr-x2-64",
  ENHANCE: "timbrooks/instruct-pix2pix"
};
async function uploadToCloudinary(imageDataUri, env) {
async function uploadToCloudinary(imageDataUri, env) {

  const timestamp = Math.floor(Date.now() / 1000);

  const base64 = imageDataUri.replace(
    /^data:image\/\w+;base64,/,
    ""
  );

  const signatureString =
    `timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;

  const signature = await sha1(signatureString);

  const form = new FormData();

  form.append(
    "file",
    `data:image/png;base64,${base64}`
  );

  form.append(
    "api_key",
    env.CLOUDINARY_API_KEY
  );

  form.append(
    "timestamp",
    String(timestamp)
  );

  form.append(
    "signature",
    signature
  );

  const response = await fetch(
    `${cloudinaryBase(env)}/image/upload`,
    {
      method: "POST",
      body: form
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text);
  }

  const data = JSON.parse(text);

  return data.secure_url;
}
           // 👇 इसके ठीक नीचे Paste करो

async function hfRequest(model, payload, env) {

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HF_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.arrayBuffer();
}
// 👇 इसके नीचे SHA1() COD करो

async function sha1(text) {

  const data = new TextEncoder().encode(text);

  const hash = await crypto.subtle.digest("SHA-1", data);

  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

}
