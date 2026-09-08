const OpenAI = require('openai');
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  try {
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'Falta configurar OPENAI_API_KEY en Vercel.' });
    const { image } = req.body || {};
    if (!image || typeof image !== 'string') return res.status(400).json({ error: 'No se recibió la imagen.' });
    if (image.length > 7_000_000) return res.status(413).json({ error: 'La foto es demasiado grande. Intenta otra vez.' });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      input: [{ role: 'user', content: [
        { type: 'input_text', text: `Eres el analizador nutricional visual de una app. Analiza SOLO lo visible. Identifica alimentos y bebidas, estima porciones/gramos y calcula kcal y macronutrientes. No inventes ingredientes ocultos. Si aceite, salsas o aderezos son visibles, inclúyelos con una estimación prudente. Devuelve SOLO JSON válido con este formato exacto: {"meal_name":"string","items":[{"food":"string","grams":number,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"confidence":"low|medium|high"}],"totals":{"grams":number,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number},"notes":"string"}. Valores centrales, gramos/macros con 1 decimal y kcal enteras.` },
        { type: 'input_image', image_url: image, detail: 'high' }
      ]}],
      text: { format: { type: 'json_object' } }
    });
    return res.status(200).json(JSON.parse(response.output_text));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'No se pudo analizar la foto.', detail: e.message });
  }
};
