import { getBody, getImage, getPrompt } from "./utils.js";
import { success, error } from "./response.js";
import { DEFAULT_EXPAND_PROMPT } from "./config.js";

import { expandImage } from "./services/expand.js";
import { enhanceImage } from "./services/enhance.js";
import { upscaleImage } from "./services/upscale.js";
import { health } from "./services/health.js";

export async function handleRequest(request, env) {

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
      }
    });
  }

  const url = new URL(request.url);

  // Health
  if (request.method === "GET" && url.pathname === "/health") {
    return success(await health());
  }

  if (request.method !== "POST") {
    return error("Method Not Allowed", 405);
  }

  const body = await getBody(request);

  const image = getImage(body);
  const prompt = getPrompt(body, DEFAULT_EXPAND_PROMPT);

  switch (url.pathname) {

    case "/expand":
      if (!image) return error("Image missing");
      return success(await expandImage(env, image, prompt));

    case "/enhance":
      if (!image) return error("Image missing");
      return success(await enhanceImage(env, image, prompt));

    case "/upscale":
      if (!image) return error("Image missing");
      return success(await upscaleImage(env, image, prompt));

    default:
      return error("Endpoint Not Found", 404);

  }
}
