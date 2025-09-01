export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const base = (process.env.RENDER_BLOCKCHAIN_URL || 'https://kodrx-blockchain.onrender.com')
      .replace(/\/+$/, ''); // sin trailing slash
    const apiKey = process.env.BLOCKCHAIN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing BLOCKCHAIN_API_KEY' });
    }

    const url = `${base}/bloques`;
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Kodrx-Version': 'v2025-08-31'
      },
      body: JSON.stringify(req.body || {})
    });

    const payload = await upstream.json().catch(() => ({}));
    // reflejamos exactamente el status del backend
    return res.status(upstream.status).json(payload);
  } catch (e) {
    return res.status(500).json({ error: 'Proxy error', detail: String(e?.message || e) });
  }
}
export default function handler(req, res) {
  const base = process.env.RENDER_BLOCKCHAIN_URL || null;
  const key  = process.env.BLOCKCHAIN_API_KEY || null;
  res.status(200).json({
    hasBase: !!base,
    renderBase: base,
    apiKeyLen: key ? key.length : 0,
    nodeEnv: process.env.NODE_ENV || null,
  });
}
