// Felhasználók kezelése (csak admin) – admin felület → Felhasználók fül
// GET    /api/felhasznalok              → lista (jelszó nélkül)
// POST   /api/felhasznalok              → új { nev, jelszo, szerep }
// PATCH  /api/felhasznalok?id=…         → módosítás { szerep?, jelszo?, aktiv? }
// DELETE /api/felhasznalok?id=…         → törlés

const { sb, auth, can, ROLES, hashPw } = require('./_lib');
const TABLE = 'felhasznalok';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLS = 'id,created_at,nev,szerep,aktiv';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  try {
    const user = await auth(req);
    if (!user) return res.status(401).json({ error: 'Lejárt vagy hibás belépés.' });
    if (!can(user, 'users')) return res.status(403).json({ error: 'Ehhez nincs jogosultságod.' });
    let body = req.body; if (typeof body === 'string') body = body ? JSON.parse(body) : {};
    body = body || {};
    const id = req.query && req.query.id ? String(req.query.id) : null;

    if (req.method === 'GET') return res.status(200).json(await sb(`${TABLE}?select=${COLS}&order=nev.asc`, { method: 'GET' }));
    if (req.method === 'POST') {
      const nev = String(body.nev || '').trim().slice(0, 60), jelszo = String(body.jelszo || '');
      if (!nev) return res.status(400).json({ error: 'Add meg a felhasználónevet.' });
      if (nev.toLowerCase() === 'admin') return res.status(400).json({ error: 'Az „admin” név foglalt.' });
      if (jelszo.length < 6) return res.status(400).json({ error: 'A jelszó legalább 6 karakter legyen.' });
      if (!ROLES.includes(body.szerep)) return res.status(400).json({ error: 'Válassz jogosultságot.' });
      try {
        const rows = await sb(`${TABLE}?select=${COLS}`, { method: 'POST', body: JSON.stringify({ nev, jelszo_hash: hashPw(jelszo), szerep: body.szerep }) });
        return res.status(201).json(rows[0]);
      } catch (e) { if (/23505|duplicate/i.test(e.message)) return res.status(400).json({ error: 'Ilyen nevű felhasználó már van.' }); throw e; }
    }
    if (!id || !UUID.test(id)) return res.status(400).json({ error: 'Hiányzó azonosító.' });
    if (req.method === 'PATCH') {
      const upd = {};
      if (body.szerep !== undefined) { if (!ROLES.includes(body.szerep)) return res.status(400).json({ error: 'Ismeretlen jogosultság.' }); upd.szerep = body.szerep; }
      if (body.aktiv !== undefined) upd.aktiv = !!body.aktiv;
      if (body.jelszo !== undefined) { if (String(body.jelszo).length < 6) return res.status(400).json({ error: 'A jelszó legalább 6 karakter legyen.' }); upd.jelszo_hash = hashPw(body.jelszo); }
      if (!Object.keys(upd).length) return res.status(400).json({ error: 'Nincs mit módosítani.' });
      const rows = await sb(`${TABLE}?id=eq.${id}&select=${COLS}`, { method: 'PATCH', body: JSON.stringify(upd) });
      return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({ error: 'Nincs ilyen felhasználó.' });
    }
    if (req.method === 'DELETE') { await sb(`${TABLE}?id=eq.${id}`, { method: 'DELETE' }); return res.status(204).end(); }
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Nem támogatott kérés.' });
  } catch (e) {
    if (e.missingTable) return res.status(500).json({ error: 'A felhasznalok tábla még nincs létrehozva (supabase/felhasznalok.sql).' });
    return res.status(e.status || 400).json({ error: e.message || 'Ismeretlen hiba.' });
  }
};
