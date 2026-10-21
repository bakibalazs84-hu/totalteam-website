// Bérlési ajánlatkérések
//
// POST  /api/ajanlat              → nyilvános: új kérés a raktár oldal bérlési listájából → { id }
// GET   /api/ajanlat?id=…         → nyilvános: egy kérés (a képes lista oldalhoz: /ajanlat.html?id=…)
//                                   az azonosító véletlen UUID, csak a linket ismerő láthatja
// GET   /api/ajanlat              → admin: összes kérés
// PATCH /api/ajanlat?id=…         → admin: státusz { statusz: 'uj' | 'ajanlat' | 'kiadva' | 'lezart' }
// DELETE /api/ajanlat?id=…        → admin: törlés

const { sb, auth, can, EMAIL } = require('./_lib');
const { sendMail, mailOn, layout, button, esc } = require('./_mail');

// Képes értesítő levél az új bérlési igényről (info@-ra), és visszaigazolás az igénylőnek, ha megadta az e-mail címét
const R2 = 'https://pub-ad286558042d41eeaf37bc1c3f5badd8.r2.dev/';
const thumbUrl = u => !u || !u.startsWith(R2) ? u : R2 + 'web/thumb/' + u.slice(R2.length).replace(/\.(jpe?g|png|webp|avif|heic)$/i, '') + '.jpg';
const huDate = v => v ? String(v).slice(0, 10).replace(/-/g, '.') + '.' : '';
async function mailRequest(req, row) {
  if (!mailOn()) return { sent: false };
  const base = `https://${req.headers['x-forwarded-host'] || req.headers.host}`, link = `${base}/ajanlat.html?id=${row.id}`;
  let imgs = new Map();
  try { // a termékfotók a raktár oldal terméklistájából
    const html = await (await fetch(base + '/raktar.html')).text(), m = html.match(/const PRODUCTS = (\[.*?\]);\s*\n/s);
    if (m) imgs = new Map(JSON.parse(m[1]).map(p => [p.id, (p.imgs || [])[0]]));
  } catch (e) {}
  const total = row.tetelek.reduce((a, t) => a + t.qty, 0), per = (row.tol || row.ig) ? `${huDate(row.tol) || '?'} – ${huDate(row.ig) || '?'}` : '';
  const items = row.tetelek.map(t => { const im = thumbUrl(imgs.get(t.id)); return `<tr>
    <td style="padding:8px 10px 8px 0;border-bottom:1px solid #eee;width:96px">${im ? `<img src="${esc(im)}" width="90" style="width:90px;height:auto;border-radius:4px;display:block" alt="">` : ''}</td>
    <td style="padding:8px 0;border-bottom:1px solid #eee"><b>${esc(t.name)}</b><br><span style="color:#7d7b73;font-size:12px">${esc(t.code)}${t.dims ? ' · ' + esc(t.dims) + ' cm' : ''}</span></td>
    <td style="padding:8px 0 8px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;font-size:16px;white-space:nowrap">${t.qty} db</td></tr>`; }).join('');
  const meta = [['Név', row.nev], ['Telefon', row.tel], ['E-mail', row.email], ['Produkció / cég', row.ceg], ['Időszak', per]].filter(x => x[1])
    .map(([k, v]) => `<tr><td style="color:#7d7b73;padding:2px 14px 2px 0;font-size:13px">${k}</td><td style="font-size:13px">${esc(v)}</td></tr>`).join('');
  const body = (intro, btn) => `<p>${intro}</p><table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px 0 16px">${meta}</table>
    ${row.megjegyzes ? `<p style="background:#f6f6f3;padding:10px 12px;border-radius:6px;white-space:pre-wrap;font-size:13px">${esc(row.megjegyzes)}</p>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px">${items}</table>
    <p style="font-size:13px"><b>Összesen: ${row.tetelek.length} tétel, ${total} db</b></p><p style="margin:20px 0">${button(link, btn)}</p>`;
  const to = process.env.MAIL_TO || 'info@totalteam.hu';
  const r1 = await sendMail({ to, replyTo: row.email || undefined,
    subject: `Bérlési igény – ${row.ceg || row.nev} – ${row.tetelek.length} tétel${row.tol ? ' – ' + huDate(row.tol) : ''}`,
    html: layout('Új bérlési igény érkezett', body('Új bérlési igény érkezett a raktár oldalról. Az adminban a <b>Bejövő</b> fülön is megtalálod.', 'Képes lista megnyitása')),
    text: `Új bérlési igény: ${row.nev}${row.ceg ? ' (' + row.ceg + ')' : ''}, ${row.tetelek.length} tétel. Képes lista: ${link}` });
  if (row.email) await sendMail({ to: row.email,
    subject: 'Megkaptuk a bérlési igényed – Total Team',
    html: layout('Köszönjük, megkaptuk a bérlési igényed!', body('Hamarosan jelentkezünk az ajánlattal. A kért tételek:', 'Lista megtekintése')),
    text: `Köszönjük, megkaptuk a bérlési igényed (${row.tetelek.length} tétel). Lista: ${link}` });
  return r1;
}
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
      const em = str(body.email, 200).toLowerCase();
      const row = { nev: str(body.nev, 200), tel: str(body.tel, 60), email: EMAIL.test(em) ? em : null, ceg: str(body.ceg, 200), tol: date(body.tol), ig: date(body.ig), megjegyzes: str(body.megjegyzes, 3000), tetelek };
      if (!row.nev) return res.status(400).json({ error: 'Add meg a neved.' });
      if (!tetelek.length) return res.status(400).json({ error: 'A lista üres.' });
      const rows = await sb(TABLE, { method: 'POST', body: JSON.stringify(row) });
      const m = await mailRequest(req, rows[0]);
      return res.status(201).json({ id: rows[0].id, ertesitve: m.sent });
    }

    if (req.method === 'GET' && id) {
      if (!UUID.test(id)) return res.status(404).json({ error: 'Nincs ilyen ajánlatkérés.' });
      const rows = await sb(`${TABLE}?id=eq.${id}&select=*`, { method: 'GET' });
      return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({ error: 'Nincs ilyen ajánlatkérés.' });
    }

    if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'Az ADMIN_PASSWORD nincs beállítva a Vercelen.' });
    const user = await auth(req);
    if (!user) return res.status(401).json({ error: 'Lejárt vagy hibás belépés.' });
    if (!can(user, req.method === 'GET' ? 'ajanlat:read' : req.method === 'DELETE' ? 'ajanlat:delete' : 'ajanlat:write')) return res.status(403).json({ error: 'Ehhez nincs jogosultságod.' });

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
