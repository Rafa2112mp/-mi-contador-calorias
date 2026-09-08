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

    const { profile, totals, water } = req.body || {};

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const prompt = `
Eres un entrenador nutricional y de fitness dentro de una aplicación de seguimiento de alimentación.

Analiza los datos del usuario y proporciona recomendaciones prácticas y realistas.

PERFIL:
${JSON.stringify(profile || {})}

CONSUMO DE HOY:
${JSON.stringify(totals || {})}

AGUA:
${JSON.stringify(water || {})}

OBJETIVOS POSIBLES:
- perder grasa
- mantener peso
- ganar masa muscular/peso

IMPORTANTE:
- No diagnostiques enfermedades.
- No prometas resultados.
- No calcules un porcentaje exacto de grasa corporal basándote únicamente en fotografías.
- Las recomendaciones deben ser generales y seguras.
- Prioriza alimentación equilibrada, suficiente proteína, verduras/frutas, hidratación y actividad física.
- Si el objetivo es perder grasa, recomienda un déficit moderado y sostenible.
- Si el objetivo es ganar músculo, recomienda suficiente proteína, entrenamiento de fuerza y una ingesta energética adecuada.
- Ten en cuenta las calorías y macronutrientes consumidos hoy.
- Sé claro y práctico.

Devuelve SOLO JSON válido con este formato:

{
  "summary": "string",
  "calorie_advice": "string",
  "protein_advice": "string",
  "water_advice": "string",
  "meal_recommendation": "string",
  "training_advice": "string",
  "tips": ["string", "string", "string"],
  "warning": "string"
}
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

    return res.status(200).json(
      JSON.parse(response.output_text)
    );

  } catch (e) {
    console.error(e);

    return res.status(500).json({
      error: 'No se pudo obtener el consejo de la IA.',
      detail: e.message
    });
  }
};
