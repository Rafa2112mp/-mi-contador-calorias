# Mi Contador de Calorías V6 — Vercel

App PWA móvil con cámara + IA, historial semanal, estadísticas y código de barras.

## Despliegue en Vercel
1. Importa este proyecto en Vercel.
2. En Settings → Environment Variables añade `OPENAI_API_KEY` (Production).
3. Opcional: `OPENAI_MODEL=gpt-5.6-luna`.
4. Redeploy.
5. Abre la URL HTTPS en Safari → Compartir → Añadir a pantalla de inicio.

No pongas la API key en `public/` ni en el navegador.

## IA
La función `/api/analyze-food` envía la imagen a OpenAI y devuelve JSON nutricional.

## Código de barras
`/api/barcode` consulta Open Food Facts.

## Nota
Las calorías estimadas a partir de una foto son aproximaciones. Permite corrección manual en una futura versión si se requiere.
