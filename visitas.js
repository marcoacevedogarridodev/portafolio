module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
    const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!UPSTASH_URL || !UPSTASH_TOKEN) {
        console.error('Upstash no configurado en Vercel');
        return res.status(500).json({
            error: 'Contador no configurado en el servidor',
            ok: false
        });
    }

    try {
        const response = await fetch(`${UPSTASH_URL}/incr/visitas`, {
            headers: {
                Authorization: `Bearer ${UPSTASH_TOKEN}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error Upstash:', errorData);
            return res.status(response.status).json({
                error: 'Error al leer el contador',
                ok: false
            });
        }

        const data = await response.json();

        return res.json({
            visitas: data.result,
            ok: true
        });

    } catch (error) {
        console.error('Error en API visitas:', error);
        return res.status(500).json({
            error: 'Error interno del servidor',
            ok: false
        });
    }
};
