const OpenAI=require('openai');
module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
 try{
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'Falta configurar OPENAI_API_KEY en Vercel.'});
  const {photos=[],profile={},previousProgress=[]}=req.body||{};
  if(!Array.isArray(photos)||!photos.length||photos.length>3)return res.status(400).json({error:'Sube entre 1 y 3 fotos.'});
  if(photos.some(p=>typeof p!=='string'||p.length>2_500_000))return res.status(413).json({error:'Una de las fotos es demasiado grande.'});
  const content=[{type:'input_text',text:`Eres el analizador de progreso visual de JuliFit. Compara las fotos proporcionadas entre sí y, si existe, con datos previos. Describe solo cambios visibles y evita estimar porcentaje de grasa corporal, diagnósticos o conclusiones médicas. El peso es un dato complementario, no una medición visual. Perfil: ${JSON.stringify(profile)}. Progreso previo: ${JSON.stringify(previousProgress).slice(0,5000)}. Devuelve SOLO JSON válido: {"overall":"string","visual_changes":["string"],"strengths":["string"],"improvements":["string"],"nutrition_advice":"string","training_advice":"string","next_steps":["string"],"note":"string"}.`}];
  for(const p of photos)content.push({type:'input_image',image_url:p,detail:'high'});
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:[{role:'user',content}],text:{format:{type:'json_object'}}});
  res.status(200).json(JSON.parse(response.output_text));
 }catch(e){console.error(e);res.status(500).json({error:'No se pudo analizar el progreso.',detail:e.message});}
};
