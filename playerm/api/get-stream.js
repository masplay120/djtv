// api/get-stream.js
// Este código se ejecuta EN EL SERVIDOR, no en el navegador

export default async function handler(req, res) {
  // Configurar cabeceras CORS para permitir solo TU dominio
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://masplay120.github.io";
  
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Content-Type", "application/json");

  try {
    // ✅ TU API KEY ESTÁ SEGURA AQUÍ - NADIE PUEDE VERLA
    const apiKey = "8nAJAYKeE8wBIRL6yXhV659fZmrW64tJX8obwXU_qLPiqGswPK3x7lHmVrZi2AE-XO-mSBe-rSKtFYPGzwjD5Q";
    
    const response = await fetch(
      `https://rumble.com/-livestream-api/get-data?key=${apiKey}`,
      { 
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 10000 
      }
    );

    if (!response.ok) throw new Error(`Rumble API error: ${response.status}`);
    
    const data = await response.json();

    // ✅ FILTRAR DATOS SENSIBLES ANTES DE ENVIAR AL FRONTEND
    if (data.livestreams && data.livestreams.length > 0) {
      const stream = data.livestreams[0];
      
      // SOLO devolvemos lo necesario. stream_key NUNCA sale del servidor
      return res.status(200).json({
        id: stream.id,
        is_live: stream.is_live,
        title: stream.title
      });
    } else {
      return res.status(404).json({ error: "No hay streams activos" });
    }

  } catch (error) {
    console.error("Error en serverless function:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
