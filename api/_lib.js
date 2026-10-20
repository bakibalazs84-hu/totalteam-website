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

module.exports = { passOk, sb };
