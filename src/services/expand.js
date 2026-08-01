import { editImage } from "../providers/cloudflare.js";
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
  return new Response(
    JSON.stringify({
      success: false,
      error: e.message,
      stack: String(e.stack)
    }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
}
