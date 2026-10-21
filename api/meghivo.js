// Meghívó elfogadása (nyilvános, a link titkával) – /meghivo.html#TITOK
// GET  /api/meghivo?t=…                    → { email, szerep, nev, regisztralt } ha a link érvényes
// POST /api/meghivo { t, nev, jelszo }     → beállítja a nevet és a jelszót, a link érvényét veszti → { token, user }
// Ugyanez a link szolgál jelszó-visszaállításra is (az admin új linket küld).

const { sb, hashPw, signToken, inviteHash } = require('./_lib');
const TABLE = 'felhasznalok';

async function find(t) {
  if (!t || String(t).length < 20) return null;
  const rows = await sb(`${TABLE}?meghivo_hash=eq.${inviteHash(t)}&select=id,nev,email,szerep,aktiv,jelszo_hash,meghivo_lejar`, { method: 'GET' });
  const u = rows[0];
  return u && u.aktiv && u.meghivo_lejar && new Date(u.meghivo_lejar) > new Date() ? u : null;
}
const bad = res => res.status(404).json({ error: 'Ez a meghívó link érvénytelen vagy lejárt. Kérj újat attól, aki meghívott.' });

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  try {
    if (req.method === 'GET') {
      const u = await find(req.query && req.query.t);
      if (!u) return bad(res);
      return res.status(200).json({ email: u.email, szerep: u.szerep, nev: u.nev === u.email ? '' : u.nev, regisztralt: !!u.jelszo_hash });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: 'Nem támogatott kérés.' }); }
    let body = req.body; if (typeof body === 'string') body = body ? JSON.parse(body) : {};
    const u = await find(body && body.t);
    if (!u) return bad(res);
    const nev = String(body.nev || '').trim().slice(0, 60), jelszo = String(body.jelszo || '');
    if (nev.length < 2) return res.status(400).json({ error: 'Adj meg egy felhasználónevet (legalább 2 karakter).' });
    if (nev.toLowerCase() === 'admin' || nev.includes('@')) return res.status(400).json({ error: 'Ez a név nem használható, válassz másikat.' });
    if (jelszo.length < 8) return res.status(400).json({ error: 'A jelszó legalább 8 karakter legyen.' });
    let rows;
    try {
      rows = await sb(`${TABLE}?id=eq.${u.id}&select=id,nev,szerep`, { method: 'PATCH', body: JSON.stringify({ nev, jelszo_hash: hashPw(jelszo), meghivo_hash: null, meghivo_lejar: null }) });
    } catch (e) { if (/23505|duplicate/i.test(e.message)) return res.status(400).json({ error: 'Ez a név már foglalt, válassz másikat.' }); throw e; }
    const user = { id: rows[0].id, nev: rows[0].nev, szerep: rows[0].szerep };
    return res.status(200).json({ token: signToken(user), user });
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message || 'Ismeretlen hiba.' });
  }
};
