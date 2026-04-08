const SYSTEM_PROMPT = `TU_SYSTEM_PROMPT_COMPLETO`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // 🔥 adaptar formato para Anthropic
    const formattedMessages = messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content || ""
    }));

    // 🔍 debug clave
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("❌ API KEY MISSING");
      return res.status(500).json({ error: "API key no configurada" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307", // 🔥 estable y rápido
        max_tokens: 300,
        temperature: 0.7,
        top_p: 0.9,
        system: SYSTEM_PROMPT,
        messages: formattedMessages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Anthropic error:", data);
      return res.status(500).json({
        error: "Error al conectar con la IA"
      });
    }

    const reply =
      data?.content?.[0]?.text ||
      "No pude generar respuesta.";

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({
      error: "Error interno del servidor"
    });
  }
}
