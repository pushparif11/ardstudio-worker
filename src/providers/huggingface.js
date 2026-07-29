const HF_URL =
  "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0";

export async function callHuggingFace(env, image, prompt) {
  const response = await fetch(HF_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      inputs: prompt,
      image
    })
  });

  if (!response.ok) {
    throw new Error(`Hugging Face Error ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  return btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );
}
