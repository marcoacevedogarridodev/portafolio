// ============================================================
// SERVIDOR PROXY — Oculta la API key de Gemini (Google AI Studio)
// Nunca expone tu clave secreta al frontend
// ============================================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PUERTO = process.env.PUERTO || 3000;

// Verificamos que la API key esté configurada
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('❌ ERROR: No se encontró GEMINI_API_KEY en el archivo .env');
    console.error('   Crea un archivo .env con: GEMINI_API_KEY=tu-key-real');
    process.exit(1);
}

const MODELO = 'gemini-2.5-flash';

// Middleware
app.use(cors());
app.use(express.json());

// Servimos los archivos estáticos (tu index.html)
app.use(express.static(path.join(__dirname)));

// ============================================================
// ENDPOINT: /api/chat
// Recibe los mensajes y los envía a la API de Gemini
// La API key NUNCA sale del servidor
// ============================================================
app.post('/api/chat', async (req, res) => {
    const { mensajes } = req.body;

    if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
        return res.status(400).json({
            error: 'Falta el array de mensajes en la petición',
            ok: false
        });
    }

    // Gemini pide el "system" como campo aparte (systemInstruction),
    // y el historial como "contents" con roles "user" / "model" (no "assistant").
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
                temperature: 0.3,
                maxOutputTokens: 500
            }
        };

        if (mensajeSystem) {
            body.systemInstruction = {
                parts: [{ text: mensajeSystem.content }]
            };
        }

        const respuesta = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!respuesta.ok) {
            const errorDatos = await respuesta.json().catch(() => ({}));
            console.error('❌ Error de Gemini:', errorDatos);
            return res.status(respuesta.status).json({
                error: errorDatos.error?.message || `Error ${respuesta.status} de Gemini`,
                ok: false
            });
        }

        const datos = await respuesta.json();
        const textoRespuesta = datos.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return res.json({
            respuesta: textoRespuesta,
            ok: true
        });

    } catch (error) {
        console.error('❌ Error en el servidor proxy:', error.message);
        return res.status(500).json({
            error: 'Error interno del servidor proxy',
            ok: false
        });
    }
});

// ============================================================
// INICIAMOS EL SERVIDOR
// ============================================================
app.listen(PUERTO, () => {
    console.log('');
    console.log('🤖 Servidor proxy iniciado correctamente (Gemini / Google AI Studio)');
    console.log(`   Abre tu navegador en: http://localhost:${PUERTO}`);
    console.log(`   La API key está SEGURA en el servidor (nunca se expone)`);
    console.log('');
});