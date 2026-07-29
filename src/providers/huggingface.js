const HF_API =
  "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

export async function generateImage(env, prompt) {
  if (!env.HUGGINGFACE_API_KEY) {
    throw new Error("HUGGINGFACE_API_KEY missing");
  }

  const response = await fetch(HF_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "image/png"
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        negative_prompt:
          "low quality, blurry, watermark, text, logo, cropped, deformed",
        num_inference_steps: 30,
        guidance_scale: 7.5
      },
      options: {
        wait_for_model: true,
        use_cache: false
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace Error: ${errorText}`);
  }

  const imageBuffer = await response.arrayBuffer();

  return imageBuffer;
}
