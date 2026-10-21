// Raktári tételek foglaltsága
//
// GET    /api/foglaltsag            → nyilvános: { kint: { ID: db }, kezi: { ID: true } }
//                                     (jelszóval a kézi foglalás oka is: kezi: { ID: "ok" })
// POST   /api/foglaltsag            → admin: kézi foglalás { id, ok? }
// DELETE /api/foglaltsag?id=…       → admin: kézi foglalás törlése
//
// "kint": a még vissza nem hozott darabszám a kivitelekből (kivitelek tábla)
// "kezi": az adminban kézzel foglaltnak jelölt tételek (foglalasok tábla, lásd supabase/foglalasok.sql)

const { sb, auth, can } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const user = await auth(req), admin = can(user, 'fog:read');
    if (req.method === 'GET') {
      const [kiv, fog] = await Promise.all([
        sb('kivitelek?select=tetelek&visszahozva_at=is.null&limit=2000', { method: 'GET' }),
        sb('foglalasok?select=termek_id,ok&limit=5000', { method: 'GET' }).catch(e => { if (e.missingTable) return []; throw e; }),
      ]);
      const kint = {};
      for (const r of kiv || []) for (const t of r.tetelek || []) {
        const n = Math.max(0, (parseInt(t.qty, 10) || 0) - (parseInt(t.vissza, 10) || 0));
        if (n && t.id) kint[t.id] = (kint[t.id] || 0) + n;
      }
      const kezi = {};
      for (const f of fog || []) kezi[f.termek_id] = admin ? (f.ok || '') : true;
      res.setHeader('Cache-Control', admin ? 'no-store' : 'public, s-maxage=20, stale-while-revalidate=60');
      return res.status(200).json({ kint, kezi });
    }

    res.setHeader('Cache-Control', 'no-store');
    if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'Az ADMIN_PASSWORD nincs beállítva a Vercelen.' });
    if (!user) return res.status(401).json({ error: 'Lejárt vagy hibás belépés.' });
    if (!can(user, 'fog:write')) return res.status(403).json({ error: 'Ehhez nincs jogosultságod.' });
    let body = req.body;
    if (typeof body === 'string') body = body ? JSON.parse(body) : {};

    if (req.method === 'POST') {
      const id = String((body && body.id) || '').trim().slice(0, 40);
      if (!id) return res.status(400).json({ error: 'Hiányzó tétel azonosító.' });
      const ok = String((body && body.ok) || '').trim().slice(0, 300);
      const rows = await sb('foglalasok?on_conflict=termek_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ termek_id: id, ok }) });
      return res.status(200).json(rows[0]);
    }
    if (req.method === 'DELETE') {
      const id = req.query && req.query.id ? encodeURIComponent(String(req.query.id)) : null;
      if (!id) return res.status(400).json({ error: 'Hiányzó tétel azonosító.' });
      await sb(`foglalasok?termek_id=eq.${id}`, { method: 'DELETE' });
      return res.status(204).end();
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Nem támogatott kérés.' });
  } catch (e) {
    if (e.missingTable) return res.status(500).json({ error: 'A foglalasok tábla még nincs létrehozva a Supabase-ben (supabase/foglalasok.sql).' });
    return res.status(e.status || 400).json({ error: e.message || 'Ismeretlen hiba.' });
  }
};
