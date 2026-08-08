const DEFAULT_BUG_CHAT_ID = '-5260075189';
const POLITIKUM_BUG_RELAY = 'https://politikum-solo.vercel.app/api/bugreport';

const limit = (value, max) => String(value || '').slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_BUG_CHAT_ID || DEFAULT_BUG_CHAT_ID;
  const body = req.body || {};
  const text = limit(body.text, 1200) || '(none)';
  const state = body.game || {};
  const history = Array.isArray(body.history)
    ? body.history.slice(-30).map((line) => limit(line, 500))
    : [];
  const message = [
    '🐛 Suffering Reborn bug report',
    `Version: ${limit(body.version, 80) || 'unknown'}`,
    `Language: ${body.language === 'en' ? 'English' : 'Russian'}`,
    `URL: ${limit(body.url, 500) || 'unknown'}`,
    `State: turn ${limit(state.turn, 30) || '?'} · pending ${limit(state.pending, 100) || 'none'} · response ${limit(state.response, 100) || 'none'} · deck ${limit(state.deck, 30) || '?'}`,
    `Browser: ${limit(body.userAgent, 400) || 'unknown'}`,
    '',
    `Note: ${text}`,
    '',
    'Diagnostic snapshot:',
    body.debug ? limit(JSON.stringify(body.debug), 9000) : '(no diagnostic snapshot)',
    '',
    'Recent history:',
    ...(history.length ? history : ['(no game history)']),
  ].join('\n').slice(0, 3900);

  try {
    if (token) {
      const telegram = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
      });
      if (!telegram.ok) throw new Error(`Telegram returned ${telegram.status}`);
    } else {
      const relay = await fetch(POLITIKUM_BUG_RELAY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: 'suffering-reborn',
          text,
          version: body.version,
          language: body.language,
          url: body.url,
          userAgent: body.userAgent,
          history,
          game: state,
          debug: body.debug,
        }),
      });
      if (!relay.ok) throw new Error(`Politikum relay returned ${relay.status}`);
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Suffering Reborn bug report delivery failed', error);
    return res.status(502).json({ error: 'Could not deliver report' });
  }
}
