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
