export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  try {
    const {
      step = "calculate",
      image,
      note = "",
      ingredients = []
    } = req.body || {};

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        error: "No se recibió ninguna imagen."
      });
    }

    // Evita enviar imágenes gigantes que hacen lenta la petición
    if (image.length > 10000000) {
      return res.status(413).json({
        error: "La imagen es demasiado grande. Intenta hacer otra foto."
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "La API de JuliFit no está configurada."
      });
    }

    const model = process.env.OPENAI_MODEL || "gpt-5.6-luna";

    const isIdentify = step === "identify";

    const prompt = isIdentify
      ? `
Analiza esta foto de comida.

Identifica:
1. El nombre general del plato.
2. Los ingredientes visibles.
3. Una estimación razonable de gramos de cada ingrediente.

Devuelve SOLO JSON con esta estructura:

{
  "meal_name": "string",
  "ingredients": [
    {
      "id": "1",
      "name": "string",
      "estimated_grams": 0,
      "confidence": 0
    }
  ],
  "notes": "string"
}

No inventes ingredientes que no sean razonablemente visibles.
`
      : `
Analiza esta comida para JuliFit.

Calcula una estimación nutricional razonable para cada ingrediente.

IMPORTANTE:
- Si el usuario proporciona gramos, usa esos gramos.
- Si no proporciona gramos, estima una cantidad razonable según la fotografía.
- No exageres las cantidades.
- Devuelve calorías y macronutrientes aproximados.
- La estimación debe corresponder a la comida completa de la fotografía.

${ingredients.length
  ? `Ingredientes proporcionados por el usuario:
${JSON.stringify(ingredients)}`
  : "No se proporcionaron ingredientes; identifícalos mediante la fotografía."
}

Nota del usuario:
${note || "Ninguna"}

Devuelve SOLO JSON con esta estructura:

{
  "meal_name": "string",
  "items": [
    {
      "food": "string",
      "grams": 0,
      "grams_source": "user" | "estimated",
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "confidence": 0
    }
  ],
  "totals": {
    "grams": 0,
    "calories": 0,
    "protein_g": 0,
    "carbs_g": 0,
    "fat_g": 0
  },
  "notes": "string"
}
`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    let response;

    try {
      response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: prompt
                },
                {
                  type: "input_image",
                  image_url: image,
                  detail: "low"
                }
              ]
            }
          ]
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errorText = await response.text();

      console.error("OpenAI error:", errorText);

      return res.status(502).json({
        error: "No se pudo analizar la comida en este momento."
      });
    }

    const data = await response.json();

    let text = "";

    if (typeof data.output_text === "string") {
      text = data.output_text;
    } else if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (!Array.isArray(item.content)) continue;

        for (const content of item.content) {
          if (typeof content.text === "string") {
            text += content.text;
          }
        }
      }
    }

    if (!text) {
      return res.status(502).json({
        error: "La IA no devolvió información."
      });
    }

    // Limpieza por si el modelo devuelve ```json ... ```
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error("JSON inválido:", text);

      return res.status(502).json({
        error: "No se pudo interpretar el resultado del análisis."
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("analyze-food error:", error);

    if (error.name === "AbortError") {
      return res.status(504).json({
        error: "El análisis está tardando demasiado. Inténtalo de nuevo."
      });
    }

    return res.status(500).json({
      error: "No se pudo conectar con el analizador de JuliFit."
    });
  }
}
