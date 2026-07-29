import { generateImage } from "../providers/huggingface.js";
import { success, error } from "../response.js";

export async function expand(request, env) {
  try {
    const body = await request.json();

    const prompt = (body.prompt || "").trim();

    if (!prompt) {
      return error("Prompt is required", 400);
    }

    const imageBuffer = await generateImage(env, prompt);

    return success({
      image: btoa(
        String.fromCharCode(...new Uint8Array(imageBuffer))
      )
    });

  } catch (e) {
    return error(e.message || "Expand failed", 500);
  }
}
