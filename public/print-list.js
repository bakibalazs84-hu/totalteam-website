// Nyomtatható tétellista képekkel – a raktár oldal (bérlési lista) és az admin (kivitelek) is ezt használja.
//
// printList({
//   title: 'Bérlési lista',
//   subtitle: 'Total Team Raktár',
//   meta: [['Projekt', 'XY'], ['Kivitel', '2026.10.20.']],   // üres értékű sorok kimaradnak
//   items: [{ img, code, name, dims, qty, note }],
//   note: 'megjegyzés szöveg',
//   check: true,                                              // pipálható oszlop (összekészítéshez)
// })
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const CSS = `
#ttPrint { display: none; }
@media print {
  @page { size: A4; margin: 12mm 11mm 14mm; }
  body.tt-printing > *:not(#ttPrint) { display: none !important; }
  body.tt-printing { background: #fff !important; }
  body.tt-printing #ttPrint { display: block; }
}
#ttPrint { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif; color: #111; font-size: 10.5pt; }
#ttPrint .pp-head { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 10px; }
#ttPrint .pp-head img { height: 34px; width: auto; }
#ttPrint .pp-head h1 { font-size: 17pt; margin: 0; line-height: 1.1; }
#ttPrint .pp-head small { display: block; color: #666; font-size: 9pt; font-weight: 400; }
#ttPrint .pp-date { margin-left: auto; text-align: right; color: #666; font-size: 9pt; }
#ttPrint .pp-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 16px; margin-bottom: 10px; }
#ttPrint .pp-meta div { font-size: 9.5pt; }
#ttPrint .pp-meta b { display: block; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .05em; color: #777; font-weight: 600; }
#ttPrint table { width: 100%; border-collapse: collapse; }
#ttPrint th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .05em; color: #777; border-bottom: 1px solid #999; padding: 4px 6px; }
#ttPrint td { border-bottom: 1px solid #ddd; padding: 5px 6px; vertical-align: middle; }
#ttPrint tr { break-inside: avoid; page-break-inside: avoid; }
#ttPrint thead { display: table-header-group; }
#ttPrint .pp-n { width: 7mm; color: #777; text-align: right; }
#ttPrint .pp-img { width: 38mm; }
#ttPrint th.pp-qty, #ttPrint th.pp-chk { font-size: 7.5pt; font-weight: 600; }
#ttPrint .pp-img img { width: 36mm; height: 44mm; object-fit: contain; display: block; background: #f3f3f3; border-radius: 2px; }
#ttPrint .pp-img .pp-noimg { width: 36mm; height: 44mm; background: #f3f3f3; color: #aaa; font-size: 8pt; display: flex; align-items: center; justify-content: center; }
#ttPrint .pp-name { font-weight: 600; font-size: 11pt; }
#ttPrint .pp-code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 9.5pt; }
#ttPrint .pp-sub { color: #666; font-size: 9pt; margin-top: 2px; }
#ttPrint .pp-qty { width: 16mm; text-align: center; font-size: 13pt; font-weight: 700; }
#ttPrint .pp-chk { width: 12mm; text-align: center; }
#ttPrint .pp-chk span { display: inline-block; width: 6mm; height: 6mm; border: 1.5px solid #333; border-radius: 1mm; }
#ttPrint .pp-sum { margin-top: 8px; text-align: right; font-weight: 600; }
#ttPrint .pp-note { margin-top: 10px; padding: 8px 10px; border: 1px solid #ccc; border-radius: 3px; white-space: pre-wrap; font-size: 9.5pt; }
#ttPrint .pp-sign { margin-top: 22mm; display: grid; grid-template-columns: 1fr 1fr; gap: 20mm; break-inside: avoid; }
#ttPrint .pp-sign div { border-top: 1px solid #333; padding-top: 3px; font-size: 8.5pt; color: #555; text-align: center; }
#ttPrint .pp-foot { margin-top: 10px; color: #888; font-size: 8pt; text-align: center; }`;

  function ensureStyle() {
    if (document.getElementById('ttPrintCss')) return;
    const st = document.createElement('style'); st.id = 'ttPrintCss'; st.textContent = CSS; document.head.appendChild(st);
  }

  function waitImages(root, ms) {
    const imgs = [...root.querySelectorAll('img')];
    return Promise.race([
      Promise.all(imgs.map(i => i.complete ? Promise.resolve() : new Promise(r => { i.addEventListener('load', r); i.addEventListener('error', () => setTimeout(r, 1500)); }))),
      new Promise(r => setTimeout(r, ms)),
    ]);
  }

  window.printList = async function (o) {
    ensureStyle();
    let box = document.getElementById('ttPrint');
    if (!box) { box = document.createElement('div'); box.id = 'ttPrint'; document.body.appendChild(box); }
    const items = o.items || [], total = items.reduce((s, t) => s + (+t.qty || 0), 0);
    const now = new Date(), today = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}.`;
    const meta = (o.meta || []).filter(m => m && m[1]);
    box.innerHTML = `
      <div class="pp-head"><img src="/img/total-team-logo-clean.png" alt="Total Team">
        <h1>${esc(o.title || 'Tétellista')}<small>${esc(o.subtitle || 'Total Team Raktár')}</small></h1>
        <div class="pp-date">Nyomtatva: ${today}<br>${items.length} tétel · ${total} db</div></div>
      ${meta.length ? `<div class="pp-meta">${meta.map(m => `<div><b>${esc(m[0])}</b>${esc(m[1])}</div>`).join('')}</div>` : ''}
      <table><thead><tr><th class="pp-n">#</th><th class="pp-img">Kép</th><th>Tétel</th><th class="pp-qty">Db</th>${o.check ? '<th class="pp-chk">✓</th>' : ''}</tr></thead>
      <tbody>${items.map((t, i) => `<tr>
        <td class="pp-n">${i + 1}.</td>
        <td class="pp-img">${t.img ? `<img src="${esc(t.img)}" data-orig="${esc(t.orig || '')}" alt="">` : '<div class="pp-noimg">nincs kép</div>'}</td>
        <td><div class="pp-name">${esc(t.name)}</div><div class="pp-sub"><span class="pp-code">${esc(t.code)}</span>${t.dims ? ' · ' + esc(t.dims) + ' cm' : ''}</div>${t.note ? `<div class="pp-sub">${esc(t.note)}</div>` : ''}</td>
        <td class="pp-qty">${esc(t.qty)}</td>${o.check ? '<td class="pp-chk"><span></span></td>' : ''}</tr>`).join('')}</tbody></table>
      <div class="pp-sum">Összesen: ${items.length} tétel, ${total} db</div>
      ${o.note ? `<div class="pp-note"><b>Megjegyzés:</b>\n${esc(o.note)}</div>` : ''}
      ${o.sign ? `<div class="pp-sign"><div>${esc(o.sign[0])}</div><div>${esc(o.sign[1])}</div></div>` : ''}
      <div class="pp-foot">Total Team · info@totalteam.hu · +36 20 961 1015</div>`;
    // A képek egy része csak eredeti formátumban érhető el – ha a kicsinyített nem tölt be, az eredetire váltunk
    box.querySelectorAll('.pp-img img').forEach(img => { const o2 = img.dataset.orig; img.onerror = () => { if (o2 && img.src !== o2 && !/\.heic$/i.test(o2)) img.src = o2; else img.replaceWith(Object.assign(document.createElement('div'), { className: 'pp-noimg', textContent: 'nincs kép' })); }; });
    document.body.classList.add('tt-printing');
    await waitImages(box, 8000);
    // A tt-printing osztály képernyőn nem változtat semmit, csak nyomtatáskor rejti el az oldal többi részét
    window.print();
  };
})();
