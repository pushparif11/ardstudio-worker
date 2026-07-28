export async function requestJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Invalid JSON payload.");
  }
}

export function getImage(body) {
  return (
    body.imageBase64 ||
    body.image ||
    body.imageUrl ||
    body.image_url ||
    null
  );
}

export function cleanBase64(base64) {
  if (!base64) return null;

  if (base64.startsWith("data:image")) {
    return base64;
  }

  return `data:image/png;base64,${base64}`;
}
