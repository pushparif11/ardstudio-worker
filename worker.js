export default {
async fetch(request, env) {

// CORS  
if (request.method === "OPTIONS") {  
  return new Response(null, {  
    headers: corsHeaders()  
  });  
}  

try {  

  const url = new URL(request.url);  

  // Health Check  
  if (url.pathname === "/") {  
    return json({  
      success: true,  
      app: "ARD Studio API",  
      version: "2.0.0",  
      status: "online"  
    });  
  }  

  // Image Edit Route  
  if (  
    request.method === "POST" &&  
    url.pathname === "/image/edit"  
  ) {  

    let body;  

    try {  
      body = await request.json();  
    } catch {  
      return error("Invalid JSON", 400);  
    }  

    const {  
      feature,  
      prompt,  
      imageBase64  
    } = body;  

    if (!feature)  
      return error("feature is required", 400);  

    if (!prompt)  
      return error("prompt is required", 400);  

    if (!imageBase64)  
      return error("imageBase64 is required", 400);  

    const imageDataUri =
  imageBase64.startsWith("data:")
    ? imageBase64
    : `data:image/png;base64,${imageBase64}`;

const falResponse = await fetch(
  "https://fal.run/fal-ai/gpt-image-1.5/edit",
  {
    method: "POST",
    headers: {
      "Authorization": `Key ${env.FAL_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt,
      image_urls: [imageDataUri],
      image_size: "auto",
      quality: "high",
      input_fidelity: "high",
      sync_mode: true
    })
  }
);

if (!falResponse.ok) {
  const msg = await falResponse.text();

  return error(
    `Fal Error: ${msg}`,
    falResponse.status
  );
}

const falData = await falResponse.json();

return json({
  success: true,
  fal: falData
});

  }  

  return error("Route not found", 404);  

} catch (e) {  

  return error(  
    e.message || "Internal Server Error",  
    500  
  );  

}

}
};

function json(data) {
return new Response(
JSON.stringify(data),
{
headers: {
"Content-Type": "application/json",
...corsHeaders()
}
}
);
}

function error(message, status = 500) {
return new Response(
JSON.stringify({
success: false,
error: message
}),
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
"Access-Control-Allow-Origin": "",
"Access-Control-Allow-Headers": "",
"Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};
}
