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

        return json({
          success: true,
          message: "Route Found",
          endpoint: "/image/edit"
        });

      }

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
