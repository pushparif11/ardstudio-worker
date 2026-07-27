// =======================================================
// ARD Studio Backend
// Production Worker
// Part 1A
// =======================================================

export default {

  async fetch(request, env, ctx) {

    try {

      if (request.method === "OPTIONS") {

        return new Response(null, {
          headers: corsHeaders()
        });

      }

      const url = new URL(request.url);

      if (
        request.method === "GET" &&
        url.pathname === "/"
      ) {

        return json({

          success: true,
          backend: "ARD Studio",
          version: "2.0",
          status: "Running"

        });

      }
      if (
        request.method === "POST" &&
        url.pathname === "/image/edit"
      ) {

        const body = await request.json();

const OPENROUTER_API_KEY =
  env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {

  return json({
    success: false,
    error: "OpenRouter API Key Missing"
  }, 500);

}

if (!feature || !prompt || !imageBase64) {

  return json({
    success: false,
    error: "Missing required fields"
  }, 400);

}

  return json({
    success: false,
    error: "Missing required fields"
  }, 400);

}

return json({

  success: true,
  message: "Request Accepted",

  data: {
  feature,
  prompt
}

});

      return json({
        success: false,
        error: "Route Not Found"
      }, 404);

    } catch (error) {

      return json({
        success: false,
        error: error.message
      }, 500);

    }

  }

}
function json(data, status = 200) {

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      }
    }
  );

}

function corsHeaders() {

  return {

    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"

  };

}
