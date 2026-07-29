import { editImage } from "../providers/huggingface.js";
import { success, error } from "../response.js";

export async function expand(request, env) {
  try {
    const body = await request.json();

    if (!body.image) {
      return error("Image is required", 400);
    }

    const prompt =
      body.prompt ||
      "Expand the image naturally while preserving the original subject.";

    const image = await editImage(
      env,
      body.image,
      prompt
    );

    const base64 = btoa(
      String.fromCharCode(...new Uint8Array(image))
    );

    return success({
      image: base64
    });

  } catch (e) {
    return error(e.message, 500);
  }
}
