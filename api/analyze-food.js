const OpenAI=require('openai');
module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
 try{
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'Falta configurar OPENAI_API_KEY en Vercel.'});
  const {image,ingredients=[],note=''}=req.body||{};
  if(!image||typeof image!=='string')return res.status(400).json({error:'No se recibió la imagen.'});
  if(image.length>2_500_000)return res.status(413).json({error:'La foto es demasiado grande. Intenta otra vez.'});
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const userIngredients=(Array.isArray(ingredients)?ingredients:[]).filter(x=>x&&x.name).map(x=>({name:String(x.name),grams:x.grams==null?null:Number(x.grams)}));
  const prompt=`Eres el analizador nutricional visual de JuliFit. Analiza SOLO lo visible en la foto. Identifica con claridad TODOS los alimentos, ingredientes y bebidas visibles (por ejemplo arroz, pollo, verduras, huevo, salsas, aceite o aderezos si realmente son visibles), estima la porción de cada uno y calcula kcal y macronutrientes de cada ingrediente y del total. Nunca devuelvas una lista vacía si hay comida visible: aunque la identificación sea incierta, incluye la mejor estimación razonable y usa confidence low. No inventes ingredientes que no se puedan justificar por la imagen. Si el usuario ha introducido un alimento y gramos, DEBES usar exactamente esos gramos para ese alimento y marcar grams_source como "user". Para los demás alimentos estima gramos y marca grams_source "ai". No inventes ingredientes ocultos. Si aceite, salsas o aderezos son visibles, inclúyelos con una estimación prudente. Nota del usuario: ${String(note).slice(0,1000)}. Alimentos introducidos por el usuario: ${JSON.stringify(userIngredients)}. Devuelve SOLO JSON válido con este formato exacto: {"meal_name":"string","items":[{"food":"string","grams":number,"grams_source":"user|ai","calories":number,"protein_g":number,"carbs_g":number,"fat_g":number,"confidence":"low|medium|high"}],"totals":{"grams":number,"calories":number,"protein_g":number,"carbs_g":number,"fat_g":number},"notes":"string"}. Valores centrales, gramos/macros con 1 decimal y kcal enteras.`;
  const response=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:[{role:'user',content:[{type:'input_text',text:prompt},{type:'input_image',image_url:image,detail:'high'}]}],text:{format:{type:'json_object'}}});
  const out=JSON.parse(response.output_text);
  res.status(200).json(out);
 }catch(e){console.error(e);res.status(500).json({error:'No se pudo analizar la foto.',detail:e.message});}
};
