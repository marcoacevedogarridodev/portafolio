// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PUERTO = process.env.PUERTO || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ ERROR: No se encontró GEMINI_API_KEY en .env');
    process.exit(1);
}

const MODELO = 'gemini-2.5-flash';

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (HTML, CSS, imagen)
app.use(express.static(path.join(__dirname)));

// Ruta API
app.post('/api/chat', async (req, res) => {
    const { mensajes } = req.body;

    if (!mensajes || !Array.isArray(mensajes)) {
        return res.status(400).json({ error: 'Mensajes inválidos', ok: false });
    }

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
            generationConfig: { temperature: 0.4, maxOutputTokens: 600 }
        };

        if (mensajeSystem) {
            body.systemInstruction = { parts: [{ text: mensajeSystem.content }] };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            return res.status(response.status).json({ error: err.error?.message || 'Error Gemini', ok: false });
        }

        const data = await response.json();
        const textoRespuesta = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar respuesta.';

        res.json({ respuesta: textoRespuesta, ok: true });

    } catch (error) {
        console.error('Error proxy:', error);
        res.status(500).json({ error: 'Error interno del servidor', ok: false });
    }
});

// Solo levantamos el servidor con listen() en local.
// En Vercel, la función serverless envuelve la app exportada abajo.
if (process.env.VERCEL !== '1') {
    app.listen(PUERTO, () => {
        console.log(`✅ Servidor corriendo en http://localhost:${PUERTO}`);
        console.log(`🔑 Usando modelo: ${MODELO}`);
    });
}

module.exports = app;