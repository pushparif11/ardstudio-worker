export async function editImage(env, imageBase64, prompt) {

  const response = await env.AI.run(
    "@cf/black-forest-labs/flux-1-schnell",
    {
      prompt: prompt,
      image: imageBase64
    }
  );

  if (!response) {
    throw new Error("Cloudflare AI returned empty response");
  }

  if (response.error) {
    throw new Error(response.error);
  }

  if (!response.image) {
    throw new Error("Image not returned by Cloudflare AI");
  }

  return Uint8Array.from(
    atob(response.image),
    c => c.charCodeAt(0)
  ).buffer;

}
