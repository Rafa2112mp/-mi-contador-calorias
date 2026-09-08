const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanJson(text) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const {
      step = "identify",
      image,
      ingredients = [],
      note = "",
    } = req.body || {};

    if (!image) {
      return res.status(400).json({
        error: "No se recibió ninguna imagen.",
      });
    }

    if (typeof image !== "string" || image.length > 10000000) {
      return res.status(400).json({
        error: "La imagen es demasiado grande.",
      });
    }

    /* =========================================================
       PASO 1 — IDENTIFICAR INGREDIENTES
       ========================================================= */

    if (step === "identify") {
      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",

        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
Analiza esta fotografía de comida.

Tu primera tarea NO es calcular las calorías finales.

Identifica los ingredientes o alimentos que puedas distinguir visualmente.

IMPORTANTE:
- No inventes ingredientes que no sean razonablemente visibles.
- Separa los ingredientes principales.
- Si algo parece ser una salsa, aceite, queso, arroz, carne, verduras, etc., indícalo por separado cuando sea posible.
- Puedes proporcionar una estimación orientativa de gramos basada en la apariencia de la porción, pero esa estimación será solamente una sugerencia que el usuario podrá modificar.
- El usuario NO está obligado a introducir los gramos.
- No necesitas conocer el peso total del plato.

Devuelve ÚNICAMENTE JSON válido con esta estructura:

{
  "meal_name": "nombre aproximado del plato",
  "ingredients": [
    {
      "id": "1",
      "name": "nombre del alimento",
      "estimated_grams": 100,
      "confidence": 0.85
    }
  ],
  "notes": "observaciones breves"
}

confidence debe estar entre 0 y 1.
estimated_grams debe ser un número aproximado.
                `,
              },
              {
                type: "input_image",
                image_url: image,
              },
            ],
          },
        ],
      });

      const text = response.output_text || "";
      const data = JSON.parse(cleanJson(text));

      return res.status(200).json(data);
    }

    /* =========================================================
       PASO 2 — CALCULAR CALORÍAS Y MACROS
       ========================================================= */

    if (step === "calculate") {
      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({
          error: "No se recibieron ingredientes.",
        });
      }

      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5.6-luna",

        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
Analiza nuevamente la fotografía y calcula las calorías y macronutrientes del plato.

Estos son los ingredientes identificados previamente por la IA:

${JSON.stringify(ingredients, null, 2)}

REGLAS IMPORTANTES:

1. Si el usuario ha introducido gramos para un ingrediente, UTILIZA ESOS GRAMOS como prioridad.

2. Si el usuario dejó los gramos vacíos, NO lo consideres un error.
   En ese caso estima una cantidad razonable observando la fotografía y utilizando el ingrediente identificado.

3. NO pidas nunca el peso total de la comida.

4. El peso de cada ingrediente es OPCIONAL.

5. No inventes ingredientes que no aparezcan razonablemente en la fotografía.

6. Si hay aceite, salsa, queso u otros ingredientes visibles, intenta incluirlos de forma prudente.

7. Las calorías deben corresponder a la cantidad estimada de cada ingrediente.

8. Diferencia entre peso proporcionado por el usuario y peso estimado por la IA.

9. Da una estimación razonable, no una falsa precisión.

Devuelve ÚNICAMENTE JSON válido:

{
  "meal_name": "nombre del plato",
  "items": [
    {
      "food": "alimento",
      "grams": 100,
      "grams_source": "usuario",
      "calories": 150,
      "protein_g": 10,
      "carbs_g": 15,
      "fat_g": 5,
      "confidence": 0.85
    }
  ],
  "totals": {
    "grams": 300,
    "calories": 500,
    "protein_g": 30,
    "carbs_g": 50,
    "fat_g": 15
  },
  "notes": "explicación breve de las estimaciones"
}

Para grams_source utiliza:
- "usuario" si el usuario indicó los gramos.
- "estimado" si la IA tuvo que estimarlos.

${note ? `Información adicional del usuario: ${note}` : ""}
                `,
              },
              {
                type: "input_image",
                image_url: image,
              },
            ],
          },
        ],
      });

      const text = response.output_text || "";
      const data = JSON.parse(cleanJson(text));

      return res.status(200).json(data);
    }

    return res.status(400).json({
      error: "Paso de análisis no válido.",
    });

  } catch (error) {
    console.error("Error analizando comida:", error);

    return res.status(500).json({
      error: "No se pudo analizar la comida.",
      detail: error?.message || "Error desconocido",
    });
  }
}
