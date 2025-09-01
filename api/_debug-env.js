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
