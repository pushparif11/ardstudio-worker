export default {
  async fetch(request) {

    if (request.method === "GET") {
      return Response.json({
        success: true,
        message: "ARD Studio Backend Running"
      });
    }

    if (request.method !== "POST") {
      return Response.json(
        { success: false, error: "Method Not Allowed" },
        { status: 405 }
      );
    }

    const body = await request.json();

    return Response.json({
      success: true,
      feature: body.feature,
      prompt: body.prompt,
      imageBase64: body.imageBase64
    });
  }
}
/// //update
