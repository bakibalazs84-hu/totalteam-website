// Közös segédfüggvények az API végpontokhoz (az "_" előtag miatt a Vercel nem teszi ki külön útvonalként)
const crypto = require('crypto');

function passOk(given) {
  const want = process.env.ADMIN_PASSWORD || '';
  if (!want || typeof given !== 'string') return false;
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

async function sb(path, opts = {}) {
  const url = (process.env.SUPABASE_URL || '').trim(), key = (process.env.SUPABASE_SERVICE_KEY || '').replace(/\s+/g, '');
  if (!url || !key) throw Object.assign(new Error('A Supabase nincs beállítva (SUPABASE_URL / SUPABASE_SERVICE_KEY).'), { status: 500 });
  const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/' + path, {
    ...opts,
    // Régi service_role kulcs (JWT, "eyJ…") → Authorization fejléc is; új "sb_secret_…" kulcs → csak apikey
    headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: 'Bearer ' + key } : {}), 'Content-Type': 'application/json', Prefer: 'return=representation', ...(opts.headers || {}) },
  });
  const text = await r.text();
  if (!r.ok) {
    // A kulcs tartalmát nem írjuk ki, csak a típusát – így látszik, ha rossz kulcs került a Vercelbe
    const kind = key.startsWith('sb_secret_') ? 'secret (sb_secret_…)' : key.startsWith('sb_publishable_') ? 'publishable – ez NEM jó, a secret kulcs kell'
      : key.startsWith('eyJ') ? (/"role"\s*:\s*"anon"/.test(Buffer.from((key.split('.')[1] || ''), 'base64').toString()) ? 'anon (legacy) – ez NEM jó, a service_role kell' : 'legacy JWT (service_role)') : 'ismeretlen formátum';
    let ref = ''; try { ref = new URL(url).hostname.split('.')[0]; } catch (e) {}
    throw Object.assign(new Error(`Adatbázis hiba (${r.status}, kulcs típusa: ${kind}, projekt: ${ref}): ` + text.slice(0, 300)), { status: 502, missingTable: /PGRST205|does not exist|Could not find the table/i.test(text) });
  }
  return text ? JSON.parse(text) : null;
}

// ── Felhasználók és jogosultságok
// Szerepek: admin (minden + felhasználók kezelése), raktaros (kivitel, visszavétel, foglaltság + bejövő igények, törlés nélkül), ajanlat (bejövő bérlési igények)
const PERMS = {
  admin:    ['kivitel:read', 'kivitel:write', 'fog:read', 'fog:write', 'ajanlat:read', 'ajanlat:write', 'ajanlat:delete', 'users'],
  raktaros: ['kivitel:read', 'kivitel:write', 'fog:read', 'fog:write', 'ajanlat:read', 'ajanlat:write'],
  ajanlat:  ['kivitel:read', 'fog:read', 'ajanlat:read', 'ajanlat:write', 'ajanlat:delete'],
};
const ROLES = Object.keys(PERMS);
const can = (user, perm) => !!user && (PERMS[user.szerep] || []).includes(perm);

function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  return 's1$' + salt.toString('hex') + '$' + crypto.scryptSync(String(pw), salt, 32).toString('hex');
}
function verifyPw(pw, stored) {
  const [v, salt, hash] = String(stored || '').split('$');
  if (v !== 's1' || !salt || !hash) return false;
  const a = crypto.scryptSync(String(pw), Buffer.from(salt, 'hex'), 32), b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Munkamenet: aláírt token (nem kell hozzá adatbázis). A kulcs a SESSION_SECRET, ha nincs, a meglévő titkokból képződik.
const secret = () => crypto.createHash('sha256').update('tt-session|' + (process.env.SESSION_SECRET || '') + '|' + (process.env.ADMIN_PASSWORD || '') + '|' + (process.env.SUPABASE_SERVICE_KEY || '')).digest();
const b64 = b => Buffer.from(b).toString('base64url');
function signToken(user, days = 14) {
  const body = b64(JSON.stringify({ u: user.id, n: user.nev, r: user.szerep, exp: Date.now() + days * 864e5 }));
  return 't1.' + body + '.' + b64(crypto.createHmac('sha256', secret()).update(body).digest());
}
function readToken(tok) {
  const [v, body, sig] = String(tok || '').split('.');
  if (v !== 't1' || !body || !sig) return null;
  const want = crypto.createHmac('sha256', secret()).update(body).digest(), got = Buffer.from(sig, 'base64url');
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  try { const d = JSON.parse(Buffer.from(body, 'base64url').toString()); return d.exp > Date.now() ? d : null; } catch (e) { return null; }
}

// Ki küldte a kérést? → { id, nev, szerep } vagy null
// Fejléc: x-admin-pass = token (vagy régi módon a puszta admin jelszó)
const userCache = new Map();   // id → { user, at } – rövid ideig, hogy ne kelljen minden kérésnél adatbázis
async function auth(req) {
  const h = req.headers['x-admin-pass'];
  if (!h) return null;
  if (!String(h).startsWith('t1.')) return passOk(h) ? { id: 'admin', nev: 'admin', szerep: 'admin' } : null;
  const t = readToken(h); if (!t) return null;
  if (t.u === 'admin') return { id: 'admin', nev: 'admin', szerep: 'admin' };
  // Törölt / letiltott felhasználó vagy módosított szerep azonnal (max. 30 mp) érvényesüljön
  const c = userCache.get(t.u);
  if (c && Date.now() - c.at < 30000) return c.user;
  const rows = await sb(`felhasznalok?id=eq.${encodeURIComponent(t.u)}&select=id,nev,szerep,aktiv`, { method: 'GET' });
  const u = rows[0] && rows[0].aktiv ? { id: rows[0].id, nev: rows[0].nev, szerep: rows[0].szerep } : null;
  userCache.set(t.u, { user: u, at: Date.now() });
  return u;
}

// Meghívó link titka: csak a sha256-ja kerül az adatbázisba
function newInvite(days = 7) {
  const t = crypto.randomBytes(24).toString('base64url');
  return { t, hash: inviteHash(t), lejar: new Date(Date.now() + days * 864e5).toISOString() };
}
const inviteHash = t => crypto.createHash('sha256').update('tt-invite|' + String(t)).digest('hex');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = { passOk, sb, auth, can, ROLES, hashPw, verifyPw, signToken, newInvite, inviteHash, EMAIL };
