const API_URL =
  "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-2-inpainting";
export async function editImage(env, imageBase64, prompt) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: {
        image: imageBase64,
        prompt: prompt
      }
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return await response.arrayBuffer();
}
