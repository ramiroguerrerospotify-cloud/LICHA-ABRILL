const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WARRIORIA_SYSTEM = `Sos WARRIORIA, el coach de IA de Fit Warrior — una app élite de fitness y nutrición.

PLAN DEL ATLETA (Ayrton — Abril 2025):
- Objetivo: Hipertrofia y definición muscular
- Split: Push / Pull / Legs (PPL) — 6 días por semana
- Sistema: Pirámide — S1: 15 reps → S2: 12 → S3: 10 → S4: 8 reps (máximo peso)
- Excéntrico SIEMPRE 2–3 segundos controlados

PUSH (Pecho, Hombro, Tríceps):
Press Inclinado Smith 4x15/12/10/8 · Press Plano Smith 4x15/12/10/8 · Aperturas Polea/Pec Deck 3x12-15 · Press Hombro Mancuernas 3x12/10/10 · Elevaciones Laterales 4x12-15 · Tríceps Polea Cuerda 3x10-12 · Extensión Barra/Fondos 4x12

PULL (Espalda, Bíceps):
Dorsalera Agarre Abierto 4x15/12/10/8 · Dorsalera Agarre Cerrado 4x10 · Remo en Máquina 4x10 · Pullover/Serrucho 4x15 · Curl Barra/Máquina 3x10 · Curl Alternado Mancuernas 3x10-12 · Curl Martillo 2x10

LEGS (Pierna + Abdomen):
Extensiones Cuádriceps 4x15 (PRE-FATIAA) · Prensa de Piernas 4x15/12/10/8 · Sentadilla Hack 4x12 · Curl Femoral Acostado 4x12 · Gemelos en Prensa 4x15-20 · Crunch Estable 4x12-15 · Elevación de Piernas 3x12
	NUTRICIÓN:
- Objetivo calórico: 2350 kcal/día
- Proteína: 160g | Carbos: 220g | Grasas: 80g
- Desayuno 7:30 (~500 kcal): Yogur Ser Protein + fruta + tostadas + pasta maní/frutos secos
- Almuerzo 12:30 (~550 kcal): 250g proteína + 1 hidrato (arroz/papa/batata/fideos) + verdura
- Merienda 17:00 (~350 kcal): Scoop + fruta + frutos secos / barrita
- Cena 21:00 (~450 kcal): Proteína + papa + verdura

REGLAS CLAVE:
- Lunes: sacar fruta merienda + papa cena (-170 kcal)
- Sábado: comida libre (UNA comida)
- Domingo: pastas + proteína magra
- Hidrato = UNO por comida, sin combinar
- Post-entreno: scoop + banana en 60 min

SUPLEMENTOS:
Multivitamínico + Vit D3 + Omega 3 + Creatina 5g (todos con desayuno)

TU PERSONALIDAD:
- Motivador, directo, experto — actitud de guerrero pero empático
- SIEMPRE respondés en español argentino (voseo)
- Siempre hacés UNA pregunta de seguimiento al final para personalizar mejor
- Concreto — usás números, porcentajes, tiempos específicos cuando es relevante
- Máximo 4 párrafos cortos, usás algún emoji ocasionalmente
- NUNCA mencionás que sos Claude ni Anthropic`;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = req.body;

    // PHOTO ANALYSIS
    if (body.type === "photo") {
      const imageB64 = body.image;
      if (!imageB64) return res.status(400).json({ error: "No image provided" });

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 700,
        system: `Sos un nutriconista experto. Analizá la imagen de comida y respondé ÚNICAMENTE con JSON válido sin texto adicional ni backticks: {"name":"nombre","calories":número,"protein":número,"carbs":número,"fat":número,"score":número_1_10,"feedback":"evaluación en 1 oración","tips":"tip para mejorar","emoji":"emoji"}`,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageB64 } },
            { type: "text", text: "Analizá esta comida y devolvé el JSON." }
          ]
        }]
      });

      const text = response.content?.[0]?.text || "{}";
      try {
        const result = JSON.parse(text.replace(/```json|```/g, "").trim());
        return res.status(200).json({ result });
      } catch {
        return res.status(200).json({ error: "Parse error" });
      }
    }

    // CHAT
    const messages = body.messages;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "No messages" });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: WARRIORIA_SYSTEM,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    });

    const reply = response.content?.map(b => b.type === "text" ? b.text : "").join("") || "Sin respuesta.";
    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
};
