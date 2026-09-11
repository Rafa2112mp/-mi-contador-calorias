const OpenAI=require('openai');
module.exports=async function handler(req,res){
 if(req.method!=='POST')return res.status(405).json({error:'Método no permitido'});
 try{
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'Falta configurar OPENAI_API_KEY en Vercel.'});
  const body=req.body||{}, profile=body.profile||{}, totals=body.totals||{}, water=body.water||{}, message=String(body.message||'').trim();
  if(!message)return res.status(400).json({error:'Escribe una pregunta.'});
  const history=Array.isArray(body.history)?body.history.slice(-20):[];
  const conversation=history.map(x=>`${x.role==='assistant'?'COACH':'USUARIO'}: ${String(x.content||'').slice(0,3000)}`).join('\n');
  const prompt=`Eres el Coach de JuliFit, un asistente cercano de nutrición y entrenamiento. Responde en español, como un chat, natural, claro y breve pero útil. Personaliza con perfil=${JSON.stringify(profile)}, totales de hoy=${JSON.stringify(totals)}, agua=${JSON.stringify(water)}. No diagnostiques enfermedades, no prometas resultados y no inventes datos. Si faltan datos, dilo y pregunta solo lo necesario. Prioriza pérdida de grasa manteniendo músculo cuando corresponda. Puedes dar ideas de comidas, ajustes de calorías/macros, hidratación y entrenamiento general.\n\nConversación reciente:\n${conversation}\n\nNueva pregunta:\n${message}\n\nDevuelve SOLO JSON válido: {"reply":"respuesta en español"}.`;
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await client.responses.create({model:process.env.OPENAI_MODEL||'gpt-5.6-luna',input:prompt,text:{format:{type:'json_object'}}});
  res.status(200).json(JSON.parse(response.output_text));
 }catch(e){console.error(e);res.status(500).json({error:'No se pudo obtener la respuesta del Coach.',detail:e.message});}
};
