import { success, error } from "./response.js";
import { requestJson, getImage, cleanBase64 } from "./utils.js";
import { expandImage } from "./openai.js";

export async function handleRequest(request, env) {

  if (request.method === "OPTIONS") {
    return success({});
  }

  const url = new URL(request.url);

  if (request.method === "GET") {

    if (url.pathname === "/") {
      return success({
        app: "ARD Studio AI Worker",
        status: "Running"
      });
    }

    if (url.pathname === "/health") {
      return success({
        health: "OK"
      });
    }

    return error("Route not found", 404);
  }

  if (request.method !== "POST") {
    return error("Method not allowed", 405);
  }

  const body = await requestJson(request);

  const image = getImage(body);

  if (!image) {
    return error("Image parameter is missing in the request payload.");
  }

  const result = await expandImage(
    env,
    cleanBase64(image),
    body.prompt
  );

  return success({
    imageBase64: result
  });
}
