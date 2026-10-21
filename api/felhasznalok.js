// Felhasználók kezelése (csak admin) – admin felület → Felhasználók fül
// A felhasználót e-mail címmel hívod meg; a meghívott a linken maga választ nevet és jelszót (api/meghivo.js).
//
// GET    /api/felhasznalok              → lista (jelszó nélkül)
// POST   /api/felhasznalok              → meghívás { email, szerep } → { …felhasználó, link }
// PATCH  /api/felhasznalok?id=…         → { szerep? , aktiv? , meghivo: true (új link / jelszó-visszaállítás) }
// DELETE /api/felhasznalok?id=…         → törlés

const { sb, auth, can, ROLES, newInvite, EMAIL } = require('./_lib');
const { sendMail, mailOn, layout, button, esc } = require('./_mail');
const ROLE_NAME = { admin: 'Admin', raktaros: 'Raktáros', ajanlat: 'Ajánlatkezelő' };

// Meghívó / jelszó-visszaállító levél automatikus küldése (ha a Resend be van állítva)
async function mailInvite(req, u, link, reset, from) {
  if (!mailOn()) return { sent: false };
  const base = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const who = from && from.nev !== 'admin' ? from.nev : 'a Total Team';
  const subject = reset ? 'Total Team Raktár – új jelszó beállítása' : 'Meghívó – Total Team Raktár';
  const html = layout(reset ? 'Új jelszó beállítása' : 'Meghívó a Total Team raktár felületére', reset
    ? `<p>Szia!</p><p>Az alábbi gombbal új jelszót állíthatsz be a Total Team raktár felületéhez.</p><p style="margin:22px 0">${button(link, 'Új jelszó beállítása')}</p><p style="color:#7d7b73;font-size:12px">A link 7 napig érvényes. Ha nem te kérted, hagyd figyelmen kívül ezt a levelet.</p>`
    : `<p>Szia!</p><p>${esc(who)} meghívott a Total Team raktár belső felületére, <b>${esc(ROLE_NAME[u.szerep] || u.szerep)}</b> jogosultsággal.</p><p>Kattints a gombra, és válassz magadnak felhasználónevet és jelszót:</p><p style="margin:22px 0">${button(link, 'Meghívó elfogadása')}</p><p style="color:#7d7b73;font-size:12px">A link 7 napig érvényes. Később itt tudsz belépni: <a href="${base}/admin.html">${base}/admin.html</a></p>`);
  const text = (reset ? 'Új jelszó beállítása: ' : `${who} meghívott a Total Team raktár felületére (${ROLE_NAME[u.szerep]}). Regisztráció: `) + link + '\n\nA link 7 napig érvényes.';
  return sendMail({ to: u.email, subject, html, text });
}
const TABLE = 'felhasznalok';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLS = 'id,created_at,nev,email,szerep,aktiv,jelszo_hash,meghivo_lejar';
const pub = u => { const { jelszo_hash, ...rest } = u; return { ...rest, regisztralt: !!jelszo_hash }; };
const linkFor = (req, t) => `https://${req.headers['x-forwarded-host'] || req.headers.host}/meghivo.html#${t}`;

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

    if (req.method === 'GET' && req.query && req.query.levelezes !== undefined) return res.status(200).json({ automatikus: mailOn() });
    if (req.method === 'GET') return res.status(200).json((await sb(`${TABLE}?select=${COLS}&order=created_at.asc`, { method: 'GET' })).map(pub));

    if (req.method === 'POST') {
      const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
      if (!EMAIL.test(email)) return res.status(400).json({ error: 'Adj meg egy érvényes e-mail címet.' });
      if (!ROLES.includes(body.szerep)) return res.status(400).json({ error: 'Válassz jogosultságot.' });
      const inv = newInvite();
      try {
        // A név addig az e-mail cím, amíg a meghívott nem választ magának
        const rows = await sb(`${TABLE}?select=${COLS}`, { method: 'POST', body: JSON.stringify({ nev: email, email, szerep: body.szerep, meghivo_hash: inv.hash, meghivo_lejar: inv.lejar }) });
        const link = linkFor(req, inv.t), m = await mailInvite(req, rows[0], link, false, user);
        return res.status(201).json({ ...pub(rows[0]), link, elkuldve: m.sent, levelHiba: m.sent ? undefined : m.reason });
      } catch (e) { if (/23505|duplicate/i.test(e.message)) return res.status(400).json({ error: 'Ezzel az e-mail címmel már van felhasználó.' }); throw e; }
    }

    if (!id || !UUID.test(id)) return res.status(400).json({ error: 'Hiányzó azonosító.' });
    if (req.method === 'PATCH') {
      const upd = {}; let inv = null;
      if (body.szerep !== undefined) { if (!ROLES.includes(body.szerep)) return res.status(400).json({ error: 'Ismeretlen jogosultság.' }); upd.szerep = body.szerep; }
      if (body.aktiv !== undefined) upd.aktiv = !!body.aktiv;
      if (body.meghivo) { inv = newInvite(); upd.meghivo_hash = inv.hash; upd.meghivo_lejar = inv.lejar; }
      if (!Object.keys(upd).length) return res.status(400).json({ error: 'Nincs mit módosítani.' });
      const rows = await sb(`${TABLE}?id=eq.${id}&select=${COLS}`, { method: 'PATCH', body: JSON.stringify(upd) });
      if (!rows.length) return res.status(404).json({ error: 'Nincs ilyen felhasználó.' });
      if (!inv) return res.status(200).json(pub(rows[0]));
      const link = linkFor(req, inv.t), m = await mailInvite(req, rows[0], link, !!rows[0].jelszo_hash, user);
      return res.status(200).json({ ...pub(rows[0]), link, elkuldve: m.sent, levelHiba: m.sent ? undefined : m.reason });
    }
    if (req.method === 'DELETE') { await sb(`${TABLE}?id=eq.${id}`, { method: 'DELETE' }); return res.status(204).end(); }
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Nem támogatott kérés.' });
  } catch (e) {
    if (e.missingTable) return res.status(500).json({ error: 'A felhasznalok tábla még nincs létrehozva (supabase/felhasznalok.sql).' });
    return res.status(e.status || 400).json({ error: e.message || 'Ismeretlen hiba.' });
  }
};
