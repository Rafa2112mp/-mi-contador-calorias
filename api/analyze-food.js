const OpenAI = require('openai');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: 'Falta configurar OPENAI_API_KEY en Vercel.'
      });
    }

    const { image, grams, note } = req.body || {};

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        error: 'No se recibió la imagen.'
      });
    }

    if (image.length > 7_000_000) {
      return res.status(413).json({
        error: 'La foto es demasiado grande. Intenta otra vez.'
      });
    }

    const userGrams = Number(grams);

    const gramInstruction =
      Number.isFinite(userGrams) && userGrams > 0
        ? `El usuario ha indicado que el peso total de la comida es de ${userGrams} gramos. USA ESTE PESO como referencia principal para calcular las cantidades y los valores nutricionales. No sustituyas este dato por una estimación visual. Si aparecen varios alimentos, reparte los gramos entre ellos de forma razonable según lo que se vea en la fotografía.`
        : 'El usuario no ha indicado el peso. En ese caso estima las cantidades basándote en la fotografía.';

    const noteInstruction = note
      ? `Información adicional proporcionada por el usuario: "${String(note).slice(0, 500)}"`
      : '';

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `
Eres el analizador nutricional visual de una aplicación de alimentación.

Analiza la fotografía y reconoce únicamente los alimentos y bebidas que sean razonablemente visibles.

${gramInstruction}

${noteInstruction}

IMPORTANTE:
- El peso indicado por el usuario tiene prioridad sobre una estimación visual.
- Calcula las calorías y macronutrientes correspondientes a la cantidad indicada.
- No inventes ingredientes que no puedan identificarse razonablemente.
- Si aceite, salsas, aderezos u otros ingredientes son claramente visibles, inclúyelos con una estimación prudente.
- Si algo no puede identificarse con suficiente seguridad, indícalo en "notes".
- No afirmes una precisión superior a la que permite la fotografía.
- Los valores deben ser estimaciones nutricionales razonables.

Devuelve SOLO JSON válido con este formato exacto:

{
  "meal_name": "string",
  "items": [
    {
      "food": "string",
      "grams": number,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "confidence": "low|medium|high"
    }
  ],
  "totals": {
    "grams": number,
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number
  },
  "notes": "string"
}

Usa gramos y macronutrientes con 1 decimal y calorías enteras.
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt
            },
            {
              type: 'input_image',
              image_url: image,
              detail: 'high'
            }
          ]
        }
      ],
      text: {
        format: {
          type: 'json_object'
        }
      }
    });

    const result = JSON.parse(response.output_text);

    return res.status(200).json(result);

  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: 'No se pudo analizar la foto.',
      detail: e.message
    });
  }
};
