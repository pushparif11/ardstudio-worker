export async function askOpenRouter(env, prompt) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4.1-mini",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    }
  );

  const json = await response.json();

  return json.choices?.[0]?.message?.content || "";
}
