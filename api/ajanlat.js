// Bérlési ajánlatkérések
//
// POST  /api/ajanlat              → nyilvános: új kérés a raktár oldal bérlési listájából → { id }
// GET   /api/ajanlat?id=…         → nyilvános: egy kérés (a képes lista oldalhoz: /ajanlat.html?id=…)
//                                   az azonosító véletlen UUID, csak a linket ismerő láthatja
// GET   /api/ajanlat              → admin: összes kérés
// PATCH /api/ajanlat?id=…         → admin: státusz { statusz: 'uj' | 'ajanlat' | 'kiadva' | 'lezart' }
// DELETE /api/ajanlat?id=…        → admin: törlés

const { sb, auth, can } = require('./_lib');
const TABLE = 'ajanlatkeresek';
const STATUSZ = ['uj', 'ajanlat', 'kiadva', 'lezart'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const date = v => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? v : null;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  const id = req.query && req.query.id ? String(req.query.id) : null;
  try {
    let body = req.body;
    if (typeof body === 'string') body = body ? JSON.parse(body) : {};

    if (req.method === 'POST') {
      if (body && body.website) return res.status(200).json({ id: null });   // robot-csapda (rejtett mező)
      const tetelek = Array.isArray(body && body.tetelek) ? body.tetelek.slice(0, 300).map(t => ({
        id: str(t.id, 40), code: str(t.code, 40), name: str(t.name, 200), dims: str(t.dims, 60),
        qty: Math.max(1, Math.min(9999, parseInt(t.qty, 10) || 1)),
      })).filter(t => t.id) : [];
      const row = { nev: str(body.nev, 200), tel: str(body.tel, 60), ceg: str(body.ceg, 200), tol: date(body.tol), ig: date(body.ig), megjegyzes: str(body.megjegyzes, 3000), tetelek };
      if (!row.nev) return res.status(400).json({ error: 'Add meg a neved.' });
      if (!tetelek.length) return res.status(400).json({ error: 'A lista üres.' });
      const rows = await sb(TABLE, { method: 'POST', body: JSON.stringify(row) });
      return res.status(201).json({ id: rows[0].id });
    }

    if (req.method === 'GET' && id) {
      if (!UUID.test(id)) return res.status(404).json({ error: 'Nincs ilyen ajánlatkérés.' });
      const rows = await sb(`${TABLE}?id=eq.${id}&select=*`, { method: 'GET' });
      return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({ error: 'Nincs ilyen ajánlatkérés.' });
    }

    if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'Az ADMIN_PASSWORD nincs beállítva a Vercelen.' });
    const user = await auth(req);
    if (!user) return res.status(401).json({ error: 'Lejárt vagy hibás belépés.' });
    if (!can(user, req.method === 'GET' ? 'ajanlat:read' : 'ajanlat:write')) return res.status(403).json({ error: 'Ehhez nincs jogosultságod.' });

    if (req.method === 'GET') return res.status(200).json(await sb(`${TABLE}?select=*&order=created_at.desc&limit=500`, { method: 'GET' }));
    if (req.method === 'PATCH') {
      if (!id || !UUID.test(id)) return res.status(400).json({ error: 'Hiányzó azonosító.' });
      const st = body && body.statusz;
      if (!STATUSZ.includes(st)) return res.status(400).json({ error: 'Ismeretlen státusz.' });
      const rows = await sb(`${TABLE}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ statusz: st }) });
      return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({ error: 'Nincs ilyen ajánlatkérés.' });
    }
    if (req.method === 'DELETE') {
      if (!id || !UUID.test(id)) return res.status(400).json({ error: 'Hiányzó azonosító.' });
      await sb(`${TABLE}?id=eq.${id}`, { method: 'DELETE' });
      return res.status(204).end();
    }
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Nem támogatott kérés.' });
  } catch (e) {
    if (e.missingTable) return res.status(500).json({ error: 'Az ajanlatkeresek tábla még nincs létrehozva (supabase/ajanlatkeresek.sql).' });
    return res.status(e.status || 400).json({ error: e.message || 'Ismeretlen hiba.' });
  }
};
