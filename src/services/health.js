export async function health() {
  return {
    status: "ok",
    service: "ARD Studio API",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  };
}
