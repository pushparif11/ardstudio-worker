import { editImage } from "../providers/huggingface.js";
import { success, error } from "../response.js";

export async function expand(request, env) {
  try {
    const body = await request.json();

    if (!body.image) {
      return error("Image is required", 400);
    }

    const prompt =
      (body.prompt || "").trim() ||
      "Expand the image naturally while preserving the original subject.";

    const imageBuffer = await editImage(
      env,
      body.image,
      prompt
    );

    const bytes = new Uint8Array(imageBuffer);

    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return success({
      image: btoa(binary)
    });

  } catch (e) {
    return error(e.message || "Expand failed", 500);
  }
}
