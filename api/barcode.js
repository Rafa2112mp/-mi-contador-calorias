module.exports=async function handler(req,res){
 if(req.method!=='GET') return res.status(405).json({error:'Método no permitido'});
 const code=String(req.query?.code||'').replace(/[^0-9A-Za-z.-]/g,'');
 if(!code) return res.status(400).json({error:'Código no válido'});
 try{
  const r=await fetch('https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,brands,image_front_small_url,nutriments,serving_size,quantity');
  const d=await r.json();
  if(d.status!==1||!d.product) return res.status(404).json({error:'Producto no encontrado'});
  const p=d.product,n=p.nutriments||{};
  res.status(200).json({found:true,name:p.product_name||'Producto',brand:p.brands||'',image:p.image_front_small_url||'',serving:p.serving_size||p.quantity||'',per100g:{calories:n['energy-kcal_100g']??Math.round((n.energy_100g||0)/4.184),protein_g:n.proteins_100g||0,carbs_g:n.carbohydrates_100g||0,fat_g:n.fat_100g||0}});
 }catch(e){res.status(500).json({error:'No se pudo consultar el código de barras'});}
};
