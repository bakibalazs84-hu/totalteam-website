// Automatikus e-mail küldés a Resend szolgáltatáson keresztül (https://resend.com)
//
// Vercel környezeti változók:
//   RESEND_API_KEY  – a Resend API kulcs ("re_…"); ha nincs megadva, a rendszer nem küld levelet (marad a kézi küldés)
//   MAIL_FROM       – feladó, alapból "Total Team <info@totalteam.hu>" (a domaint a Resendben hitelesíteni kell)
//   MAIL_TO         – ide érkeznek az értesítések a bérlési igényekről (alapból info@totalteam.hu)

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mailOn = () => !!process.env.RESEND_API_KEY;

async function sendMail({ to, subject, html, text, replyTo }) {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key) return { sent: false, reason: 'A levélküldés nincs beállítva.' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM || 'Total Team <info@totalteam.hu>', to: [].concat(to), subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!r.ok) return { sent: false, reason: `Levélküldési hiba (${r.status}): ` + (await r.text()).slice(0, 200) };
    return { sent: true };
  } catch (e) { return { sent: false, reason: 'Levélküldési hiba: ' + e.message }; }
}

// Egyszerű, levelezőkben is jól megjelenő keret
function layout(title, inner) {
  return `<!doctype html><html><body style="margin:0;background:#f6f6f3;font-family:Arial,Helvetica,sans-serif;color:#1b1a17">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f3;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e3e2dc;border-radius:10px">
<tr><td style="padding:22px 26px 6px;font-size:20px;font-weight:bold;font-family:Georgia,serif">${esc(title)}</td></tr>
<tr><td style="padding:6px 26px 24px;font-size:14px;line-height:1.55">${inner}</td></tr>
<tr><td style="padding:14px 26px;border-top:1px solid #e3e2dc;font-size:12px;color:#7d7b73">Total Team · info@totalteam.hu · +36 20 961 1015</td></tr>
</table></td></tr></table></body></html>`;
}
const button = (href, label) => `<a href="${esc(href)}" style="display:inline-block;background:#a8823f;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:6px">${esc(label)}</a>`;

module.exports = { sendMail, mailOn, layout, button, esc };
