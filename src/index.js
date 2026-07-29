import { handleRequest } from "./routes.js";
import { error } from "./response.js";

export default {

  async fetch(request, env) {

    try {

      return await handleRequest(request, env);

    } catch (e) {

      return error(e.message || "Internal Server Error", 500);

    }

  }

};
