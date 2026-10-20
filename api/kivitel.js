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

const { passOk, sb } = require('./_lib');

const TABLE = 'kivitelek';
const FIELDS = ['projekt', 'felelos', 'kivitel_napja', 'vissza_tervezett', 'megjegyzes', 'tetelek', 'visszahozva_at'];

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
      // Visszahozások története: [{ n: darab, d: 'ÉÉÉÉ-HH-NN' }]
      log: Array.isArray(t.log) ? t.log.slice(0, 200).map(l => ({
        n: Math.max(1, Math.min(9999, parseInt(l && l.n, 10) || 1)),
        d: /^\d{4}-\d{2}-\d{2}$/.test(String(l && l.d)) ? String(l.d) : new Date().toISOString().slice(0, 10),
      })) : [],
    }));
  }
  if (!partial) {
    if (!out.projekt) throw new Error('Add meg a projekt nevét.');
    if (!out.tetelek || !out.tetelek.length) throw new Error('Legalább egy tétel kell.');
  }
  return out;
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
