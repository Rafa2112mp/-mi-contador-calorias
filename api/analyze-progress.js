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

    const { photos, profile, previousProgress } = req.body || {};

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({
        error: 'No se recibieron fotos de progreso.'
      });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const content = [
      {
        type: 'input_text',
        text: `
Eres un entrenador de fitness y nutrición dentro de una aplicación.

Analiza las fotografías de progreso del usuario y proporciona una valoración visual responsable.

PERFIL:
${JSON.stringify(profile || {})}

DATOS DE PROGRESO ANTERIORES:
${JSON.stringify(previousProgress || {})}

REGLAS IMPORTANTES:
- Compara únicamente cambios visuales que puedan observarse razonablemente.
- NO determines un porcentaje exacto de grasa corporal mediante fotografías.
- NO hagas diagnósticos médicos.
- No afirmes cambios que no puedan apreciarse.
- Ten en cuenta que la iluminación, postura, distancia y ropa pueden cambiar la apariencia.
- Si no hay una comparación anterior suficiente, analiza el estado visual actual.
- Da consejos prácticos para perder grasa, ganar músculo o mantener el progreso según el objetivo del usuario.
- Sé positivo, realista y específico.

Devuelve SOLO JSON válido con este formato:

{
  "overall": "string",
  "visual_changes": [
    "string",
    "string",
    "string"
  ],
  "strengths": [
    "string",
    "string"
  ],
  "improvements": [
    "string",
    "string",
    "string"
  ],
  "nutrition_advice": "string",
  "training_advice": "string",
  "next_steps": [
    "string",
    "string",
    "string"
  ],
  "note": "string"
}
`
      }
    ];

    for (const photo of photos.slice(0, 3)) {
      if (typeof photo === 'string' && photo.length < 7_000_000) {
        content.push({
          type: 'input_image',
          image_url: photo,
          detail: 'high'
        });
      }
    }

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      input: [
        {
          role: 'user',
          content
        }
      ],
      text: {
        format: {
          type: 'json_object'
        }
      }
    });

    return res.status(200).json(
      JSON.parse(response.output_text)
    );

  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: 'No se pudo analizar el progreso.',
      detail: e.message
    });
  }
};
