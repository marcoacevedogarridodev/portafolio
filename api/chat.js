// api/chat.js - Función serverless para Vercel
module.exports = async (req, res) => {
    // Habilitar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Responder a OPTIONS (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Método no permitido. Usa POST.',
            ok: false 
        });
    }

    // Verificar API Key
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        console.error('❌ Error: GEMINI_API_KEY no configurada en Vercel');
        return res.status(500).json({ 
            error: 'API Key no configurada en el servidor',
            ok: false,
            debug: 'GEMINI_API_KEY missing in Vercel environment'
        });
    }

    const { mensajes } = req.body;

    if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
        return res.status(400).json({
            error: 'Falta el array de mensajes',
            ok: false
        });
    }

    // IMPORTANTE: Usa gemini-2.5-flash o gemini-1.5-flash
    const MODELO = 'gemini-2.5-flash'; 
    const mensajeSystem = mensajes.find(m => m.role === 'system');
    const contents = mensajes
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${GEMINI_API_KEY}`;

        const body = {
            contents,
            generationConfig: {
                temperature: 0.4,
                maxOutputTokens: 600
            }
        };

        if (mensajeSystem) {
            body.systemInstruction = {
                parts: [{ text: mensajeSystem.content }]
            };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ Error Gemini:', errorData);
            return res.status(response.status).json({
                error: errorData.error?.message || `Error ${response.status} de Gemini`,
                ok: false,
                debug: errorData
            });
        }

        const data = await response.json();
        const textoRespuesta = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return res.json({
            respuesta: textoRespuesta,
            ok: true
        });

    } catch (error) {
        console.error('❌ Error en API:', error);
        return res.status(500).json({
            error: 'Error interno del servidor',
            ok: false,
            debug: error.message
        });
    }
};