const HF_API =
  "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

export async function callHuggingFace(env, imageBase64, prompt) {

  const response = await fetch(HF_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        negative_prompt:
          "low quality, blurry, distorted, cropped, watermark"
      },
      image: imageBase64
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }

  const buffer = await response.arrayBuffer();

  const bytes = new Uint8Array(buffer);

  let binary = "";

  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }

  return btoa(binary);
}
