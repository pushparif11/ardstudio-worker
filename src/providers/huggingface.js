const API_URL =
  "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-Kontext-dev";

export async function editImage(env, imageBase64, prompt) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: imageBase64,
      parameters: {
        prompt,
        guidance_scale: 3.5,
        num_inference_steps: 28
      }
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.arrayBuffer();
}
