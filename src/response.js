import { CORS_HEADERS } from "./config.js";

export function success(data, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      ...data
    }),
    {
      status,
      headers: CORS_HEADERS
    }
  );
}

export function error(message, status = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: message
    }),
    {
      status,
      headers: CORS_HEADERS
    }
  );
}
