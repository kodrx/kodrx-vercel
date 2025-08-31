// /api/bloques.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const body = req.body || {};
    // Validación mínima (evita enviar payload vacío)
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'JSON inválido' });
    }

    const RENDER_API = process.env.RENDER_BLOCKCHAIN_URL || 'https://kodrx-blockchain.onrender.com/bloques';
    const RENDER_KEY = process.env.RENDER_API_KEY; // <-- define esto en Vercel

    if (!RENDER_KEY) {
      return res.status(500).json({ error: 'Falta RENDER_API_KEY' });
    }

    const upstream = await fetch(RENDER_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RENDER_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[proxy bloques] error:', err);
    return res.status(500).json({ error: 'Proxy error' });
  }
}
