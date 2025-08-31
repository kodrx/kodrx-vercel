export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const BASE = (process.env.RENDER_BLOCKCHAIN_URL || 'https://kodrx-blockchain.onrender.com').replace(/\/$/, '');
    const resp = await fetch(`${BASE}/bloques`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BLOCKCHAIN_API_KEY}`,
      },
      body: JSON.stringify(req.body),
    });

    const data = await resp.json().catch(() => ({}));
    return res.status(resp.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'proxy_error', detail: String(e) });
  }
}
