import { callHuggingFace } from "../providers/huggingface.js";

export async function enhanceImage(env, image, prompt) {
  const imageBase64 = await callHuggingFace(
    env,
    image,
    prompt
  );

  return {
    imageBase64
  };
}
