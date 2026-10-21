// Belépés az admin felületre
// POST /api/login { nev, jelszo } → { token, user }
//   – "admin" (vagy üres név) + az ADMIN_PASSWORD: a fő admin
//   – egyébként a felhasznalok táblából (az adminban, a Felhasználók fülön vehetők fel)
// GET  /api/login (x-admin-pass: token) → { user } – ki vagyok, érvényes-e még a belépés

const { passOk, sb, auth, verifyPw, signToken } = require('./_lib');
const fail = res => new Promise(r => setTimeout(r, 600)).then(() => res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó.' }));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  try {
    if (req.method === 'GET') {
      const user = await auth(req);
      return user ? res.status(200).json({ user }) : res.status(401).json({ error: 'Lejárt vagy hibás belépés.' });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Nem támogatott kérés.' }); }
    let body = req.body; if (typeof body === 'string') body = body ? JSON.parse(body) : {};
    const nev = String((body && body.nev) || '').trim(), jelszo = String((body && body.jelszo) || '');
    if (!jelszo) return fail(res);
    if (!nev || nev.toLowerCase() === 'admin') {
      if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'Az ADMIN_PASSWORD nincs beállítva a Vercelen.' });
      if (!passOk(jelszo)) return fail(res);
      const user = { id: 'admin', nev: 'admin', szerep: 'admin' };
      return res.status(200).json({ token: signToken(user), user });
    }
    const like = nev.replace(/[\\%_*]/g, c => '\\' + c);
    let rows;
    try { rows = await sb(`felhasznalok?nev=ilike.${encodeURIComponent(like)}&select=id,nev,szerep,aktiv,jelszo_hash`, { method: 'GET' }); }
    catch (e) { if (e.missingTable) return fail(res); throw e; }
    const u = rows.find(r => r.nev.toLowerCase() === nev.toLowerCase());
    if (!u || !u.aktiv || !verifyPw(jelszo, u.jelszo_hash)) return fail(res);
    const user = { id: u.id, nev: u.nev, szerep: u.szerep };
    return res.status(200).json({ token: signToken(user), user });
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message || 'Ismeretlen hiba.' });
  }
};
