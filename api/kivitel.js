// Saját projektre kivitt raktári tételek nyilvántartása (belső admin felület: /admin.html)
//
// Vercel környezeti változók (Project → Settings → Environment Variables):
//   ADMIN_PASSWORD        – az admin oldal jelszava
//   SUPABASE_URL          – pl. https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY  – Supabase "service_role" kulcs (csak itt, a szerveren!)
//
// Tábla: lásd supabase/kivitelek.sql
//
// GET    /api/kivitel              → összes kivitel (legújabb elöl)
// POST   /api/kivitel              → új kivitel { projekt, felelos, kivitel_napja, vissza_tervezett, megjegyzes, tetelek:[{id,code,name,qty}] }
// PATCH  /api/kivitel?id=…         → módosítás { tetelek?, visszahozva_at?, … }
// DELETE /api/kivitel?id=…         → törlés (elírt rögzítés javítására)

const crypto = require('crypto');

const TABLE = 'kivitelek';
const FIELDS = ['projekt', 'felelos', 'kivitel_napja', 'vissza_tervezett', 'megjegyzes', 'tetelek', 'visszahozva_at'];

function passOk(given) {
  const want = process.env.ADMIN_PASSWORD || '';
  if (!want || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

function clean(body, partial) {
  const out = {};
  for (const k of FIELDS) if (body && body[k] !== undefined) out[k] = body[k];
  for (const k of ['projekt', 'felelos', 'megjegyzes']) if (typeof out[k] === 'string') out[k] = out[k].trim().slice(0, 2000);
  for (const k of ['kivitel_napja', 'vissza_tervezett']) if (out[k] === '') out[k] = null;
  if (out.tetelek !== undefined) {
    if (!Array.isArray(out.tetelek)) throw new Error('A tételek listája hibás.');
    out.tetelek = out.tetelek.slice(0, 500).map(t => ({
      id: String(t.id || '').slice(0, 40),
      code: String(t.code || '').slice(0, 40),
      name: String(t.name || '').slice(0, 200),
      qty: Math.max(1, Math.min(9999, parseInt(t.qty, 10) || 1)),
      vissza: Math.max(0, Math.min(9999, parseInt(t.vissza, 10) || 0)),
    }));
  }
  if (!partial) {
    if (!out.projekt) throw new Error('Add meg a projekt nevét.');
    if (!out.tetelek || !out.tetelek.length) throw new Error('Legalább egy tétel kell.');
  }
  return out;
}

async function sb(path, opts = {}) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw Object.assign(new Error('A Supabase nincs beállítva (SUPABASE_URL / SUPABASE_SERVICE_KEY).'), { status: 500 });
  const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/' + path, {
    ...opts,
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opts.headers || {}) },
  });
  const text = await r.text();
  if (!r.ok) throw Object.assign(new Error('Adatbázis hiba: ' + text.slice(0, 300)), { status: 502 });
  return text ? JSON.parse(text) : null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'Az ADMIN_PASSWORD nincs beállítva a Vercelen.' });
  if (!passOk(req.headers['x-admin-pass'])) return res.status(401).json({ error: 'Hibás jelszó.' });

  try {
    let body = req.body;
    if (typeof body === 'string') body = body ? JSON.parse(body) : {};
    const id = req.query && req.query.id ? encodeURIComponent(String(req.query.id)) : null;

    if (req.method === 'GET') {
      return res.status(200).json(await sb(`${TABLE}?select=*&order=created_at.desc&limit=1000`, { method: 'GET' }));
    }
    if (req.method === 'POST') {
      const rows = await sb(TABLE, { method: 'POST', body: JSON.stringify(clean(body, false)) });
      return res.status(201).json(rows[0]);
    }
    if (req.method === 'PATCH') {
      if (!id) return res.status(400).json({ error: 'Hiányzó azonosító.' });
      const rows = await sb(`${TABLE}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(clean(body, true)) });
      return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({ error: 'Nincs ilyen kivitel.' });
    }
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Hiányzó azonosító.' });
      await sb(`${TABLE}?id=eq.${id}`, { method: 'DELETE' });
      return res.status(204).end();
    }
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Nem támogatott kérés.' });
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message || 'Ismeretlen hiba.' });
  }
};
