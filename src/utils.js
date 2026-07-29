export async function getBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function getImage(body) {
  return (
    body.image ||
    body.imageBase64 ||
    body.imageUrl ||
    body.image_url ||
    null
  );
}

export function getPrompt(body, fallback) {
  return body.prompt || fallback;
}

export function cleanBase64(base64) {
  if (!base64) return null;

  if (base64.startsWith("data:image")) {
    return base64;
  }

  return `data:image/png;base64,${base64}`;
}
