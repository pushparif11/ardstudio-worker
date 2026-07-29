import { success } from "../response.js";

export function health() {
  return success({
    status: "ok",
    service: "ARD Studio API",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  });
}
