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
            fal: !!env.FAL_API_KEY,
            openrouter: !!env.OPENROUTER_API_KEY
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
          return error("OpenRouter Error", response.status);
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

        // Validations
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
            finalPrompt = "Enhance the face naturally, preserve identity, improve skin details and sharpness.";
            break;
          case "upscale":
            finalPrompt = "Upscale image to high quality with maximum details.";
            break;
          case "enhance":
            finalPrompt = "Enhance image quality, lighting, colors and sharpness while preserving identity.";
            break;
          case "expand":
            finalPrompt = `Outpaint image naturally. ${prompt}`;
            break;
          default:
            finalPrompt = prompt;
        }

        const imageDataUri = imageBase64.startsWith("data:") 
          ? imageBase64 
          : `data:image/png;base64,${imageBase64}`;

        const falResponse = await fetch("https://fal.run/fal-ai/gpt-image-1.5/edit", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Authorization": `Key ${env.FAL_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            prompt: finalPrompt,
            image_urls: [imageDataUri],
            image_size: "auto",
            quality: "high",
            input_fidelity: "high",
            sync_mode: true
          })
        });

        if (!falResponse.ok) {
          const msg = await falResponse.text();
          console.log("FAL STATUS:", falResponse.status);
console.log("FAL RESPONSE:", msg);

return error(`Fal Error: ${msg}`, falResponse.status);

        const falData = await falResponse.json();
        const outputImage = falData.images?.[0]?.url;

        if (!outputImage) {
          return error("Edited image not found", 500);
        }

        const imageResponse = await fetch(outputImage, { signal: controller.signal });
        if (!imageResponse.ok) {
          return error("Failed to download edited image", 500);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const bytes = new Uint8Array(imageBuffer);
        
        let binary = "";
        for (const b of bytes) {
          binary += String.fromCharCode(b);
        }
        const base64 = btoa(binary);

        return json({
          success: true,
          imageBase64: base64
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
