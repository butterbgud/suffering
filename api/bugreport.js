const DEFAULT_BUG_CHAT_ID = '-5260075189';

const limit = (value, max) => String(value || '').slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_BUG_CHAT_ID || DEFAULT_BUG_CHAT_ID;
  if (!token) return res.status(503).json({ error: 'Bug reporting is not configured' });

  const body = req.body || {};
  const text = limit(body.text, 1200) || '(none)';
  const history = Array.isArray(body.history)
    ? body.history.slice(-30).map((line) => limit(line, 500))
    : [];
  const message = [
    '🐛 Suffering Reborn bug report',
    `Version: ${limit(body.version, 80) || 'unknown'}`,
    `URL: ${limit(body.url, 500) || 'unknown'}`,
    `Browser: ${limit(body.userAgent, 400) || 'unknown'}`,
    '',
    `Note: ${text}`,
    '',
    'Recent history:',
    ...(history.length ? history : ['(no game history)']),
  ].join('\n').slice(0, 3900);

  try {
    const telegram = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    if (!telegram.ok) throw new Error(`Telegram returned ${telegram.status}`);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Suffering Reborn bug report delivery failed', error);
    return res.status(502).json({ error: 'Could not deliver report' });
  }
}
