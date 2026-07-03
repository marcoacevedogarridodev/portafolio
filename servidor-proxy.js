// servidor-proxy.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PUERTO || 3000;

// 🔥 VERIFICAR QUE LEE LA VARIABLE
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log('🔑 API Key:', GEMINI_API_KEY ? '✅ CARGADA' : '❌ NO CARGADA');
console.log('🔑 Primeros 10 chars:', GEMINI_API_KEY ? GEMINI_API_KEY.substring(0, 10) : 'N/A');

if (!GEMINI_API_KEY) {
    console.error('❌ ERROR: No se encontró GEMINI_API_KEY en .env');
    console.error('📁 Archivo .env debe contener: GEMINI_API_KEY=tu-clave');
    process.exit(1);
}

const MODELO = 'gemini-2.5-flash';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/chat', async (req, res) => {
    const { mensajes } = req.body;

    if (!mensajes || !Array.isArray(mensajes) || mensajes.length === 0) {
        return res.status(400).json({
            error: 'Falta el array de mensajes',
            ok: false
        });
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

        console.log('📤 Enviando a Gemini...');
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Error Gemini:', data);
            return res.status(response.status).json({
                error: data.error?.message || `Error ${response.status}`,
                ok: false
            });
        }

        const textoRespuesta = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return res.json({
            respuesta: textoRespuesta,
            ok: true
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            error: 'Error interno del servidor',
            ok: false
        });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`🔑 API Key: ${GEMINI_API_KEY ? '✅ Configurada' : '❌ No configurada'}`);
});