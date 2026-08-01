import { expand } from "./services/expand.js";
import { health } from "./services/health.js";
import { error } from "./response.js";

export async function handleRequest(request, env) {
  const url = new URL(request.url);

  // CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  try {
    // Health
    if (url.pathname === "/health" && request.method === "GET") {
      return health();
    }
if (url.pathname === "/expand" && request.method === "GET") {
  return new Response("EXPAND ROUTE OK");
}
    // AI Generate (temporary)
    if (url.pathname === "/expand" && request.method === "POST") {
      return await expand(request, env);
    }

    return error("Route Not Found", 404);

  } catch (e) {
    return error(e.message || "Internal Server Error", 500);
  }
}
