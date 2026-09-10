const OpenAI=require('openai');
module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
 try{
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'Falta configurar OPENAI_API_KEY en Vercel.'});
  const body=req.body||{}; const profile=body.profile||{}, totals=body.totals||{}, water=body.water||{};
  const prompt=`Eres el Coach nutricional de JuliFit. Da orientación práctica, prudente y breve. No diagnostiques ni prometas resultados. Perfil: ${JSON.stringify(profile)}. Totales de hoy: ${JSON.stringify(totals)}. Agua: ${JSON.stringify(water)}. Devuelve SOLO JSON válido: {"summary":"string","calorie_advice":"string","protein_advice":"string","water_advice":"string","meal_recommendation":"string","training_advice":"string","tips":["string"],"warning":"string"}.`;
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:prompt,text:{format:{type:'json_object'}}});
  res.status(200).json(JSON.parse(response.output_text));
 }catch(e){console.error(e);res.status(500).json({error:'No se pudo obtener el consejo.',detail:e.message});}
};
