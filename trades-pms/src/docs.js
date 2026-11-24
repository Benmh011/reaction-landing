'use strict';
// HTML for the PDFs: estimates, invoices and gas certificates.
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const L = require('./shared/labels');
const R = require('./rules');

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = p => (p < 0 ? '−' : '') + '£' + (Math.abs(p) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateLong = iso => { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
const dateTime = iso => { if (!iso) return ''; const d = new Date(iso); return `${dateLong(iso.slice(0, 10))} at ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const qty = q => (Number.isInteger(Number(q)) ? String(q) : Number(q).toFixed(2));
const addr = o => [o.address_line1, o.address_line2, o.town, o.postcode].filter(Boolean).map(esc).join('<br>');
const font = f => pathToFileURL(path.join(__dirname, 'assets', 'fonts', f)).href;

function shell(title, body, { accent = '#D99A0B' } = {}) {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@font-face{font-family:Plex;src:url('${font('ibm-plex-sans-latin-400-normal.woff2')}');font-weight:400}
@font-face{font-family:Plex;src:url('${font('ibm-plex-sans-latin-500-normal.woff2')}');font-weight:500}
@font-face{font-family:Plex;src:url('${font('ibm-plex-sans-latin-600-normal.woff2')}');font-weight:600}
@font-face{font-family:PlexCond;src:url('${font('ibm-plex-sans-condensed-latin-600-normal.woff2')}');font-weight:600}
*{box-sizing:border-box}
body{font-family:Plex,sans-serif;font-size:9.5pt;color:#17202A;margin:0;line-height:1.4;font-variant-numeric:tabular-nums}
h1{font-family:PlexCond,sans-serif;font-weight:600;font-size:20pt;margin:0;letter-spacing:-0.01em}
h2{font-size:10pt;font-weight:600;margin:14pt 0 5pt;padding-bottom:3pt;border-bottom:1px solid #D8DEDB}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:20pt;padding-bottom:10pt;border-bottom:3pt solid ${accent}}
.biz{font-size:8.5pt;color:#3B4652;text-align:right}
.biz strong{display:block;font-size:11pt;color:#17202A}
.biz img{max-height:46pt;max-width:160pt;display:block;margin:0 0 4pt auto}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8pt;margin:10pt 0}
.meta div{background:#F4F6F5;padding:5pt 7pt;border-radius:3pt}
.meta span{display:block;font-size:7.5pt;color:#5A6774}
.meta b{font-weight:600}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16pt}
.label{font-size:7.5pt;color:#5A6774;margin-bottom:2pt}
table{width:100%;border-collapse:collapse;margin-top:4pt}
th{font-size:7.5pt;font-weight:500;color:#5A6774;text-align:left;border-bottom:1px solid #B9C2BE;padding:4pt 5pt}
td{padding:4pt 5pt;border-bottom:1px solid #E6EAE8;vertical-align:top}
.num{text-align:right;white-space:nowrap}
.totals{margin-left:auto;width:42%;margin-top:6pt}
.totals td{border:none;padding:2.5pt 5pt}
.totals tr.grand td{font-weight:600;font-size:11pt;border-top:1.5pt solid #17202A;padding-top:5pt}
.grid td:first-child{color:#3B4652;width:34%}
.grid th:not(:first-child),.grid td:not(:first-child){text-align:center}
.bad{color:#B42318;font-weight:600}
.box{border:1px solid #D8DEDB;border-radius:4pt;padding:7pt 9pt}
.sig{height:46pt;max-width:180pt;display:block;margin-top:3pt}
.small{font-size:7.5pt;color:#5A6774}
.callout{border-left:3pt solid ${accent};background:#FBF1D6;padding:6pt 9pt;margin:10pt 0}
.danger{border-left-color:#B42318;background:#FBE7E5}
.checks{display:grid;grid-template-columns:1fr 1fr;gap:2pt 16pt}
.checks div{display:flex;justify-content:space-between;border-bottom:1px solid #E6EAE8;padding:2.5pt 0}
.page-break{break-inside:avoid}
</style></head><body>${body}</body></html>`;
}

function header({ business, account, title, number, sub }) {
  const reg = [];
  if (account.trades.includes('gas') && business.gas_safe_reg) reg.push(`Gas Safe registration ${esc(business.gas_safe_reg)}`);
  if (business.vat_registered && business.vat_number) reg.push(`VAT number ${esc(business.vat_number)}`);
  if (business.structure === 'limited' && business.company_no) reg.push(`Company number ${esc(business.company_no)}`);
  return `<div class="head"><div><h1>${esc(title)}</h1><div style="margin-top:3pt;font-size:10.5pt;font-weight:600">${esc(number)}</div>${sub ? `<div class="small" style="margin-top:2pt">${sub}</div>` : ''}</div>
  <div class="biz">${business.logo ? `<img src="${esc(business.logo)}">` : ''}<strong>${esc(business.trading_name)}</strong>${addr(business)}<br>${[business.phone, business.email].filter(Boolean).map(esc).join('<br>')}${reg.length ? '<br>' + reg.join('<br>') : ''}</div></div>`;
}

function linesTable(lines, showVat) {
  return `<table><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th>${showVat ? '<th class="num">VAT</th>' : ''}<th class="num">Amount</th></tr></thead><tbody>
  ${lines.map(l => `<tr><td>${esc(l.description)}</td><td class="num">${qty(l.qty)}</td><td class="num">${money(l.unit_price)}</td>${showVat ? `<td class="num">${Number(l.vat_rate)}%</td>` : ''}<td class="num">${money(R.lineNet(l.qty, l.unit_price))}</td></tr>`).join('')}
  </tbody></table>`;
}

function estimateHtml({ job, rev, business, account }) {
  const t = rev.totals;
  const vr = !!business.vat_registered;
  const acc = rev.acceptance;
  const body = `${header({ business, account, title: 'Estimate', number: `${job.ref}, version ${rev.number}`, sub: esc(job.title) })}
  <div class="meta"><div><span>Date</span><b>${dateLong(rev.created_at.slice(0, 10))}</b></div><div><span>Valid until</span><b>${dateLong(R.addDays(rev.created_at.slice(0, 10), 30))}</b></div><div><span>Job</span><b>${esc(job.ref)}</b></div><div><span>Total</span><b>${money(t.gross)}</b></div></div>
  <div class="cols"><div><div class="label">For</div><b>${esc(job.client.name)}</b><br>${addr(job.client)}</div><div><div class="label">Work at</div>${job.property ? addr(job.property) : 'As above'}</div></div>
  ${linesTable(rev.lines, vr)}
  <table class="totals">${vr ? `<tr><td>Subtotal</td><td class="num">${money(t.net)}</td></tr><tr><td>VAT</td><td class="num">${money(t.vat)}</td></tr>` : ''}<tr class="grand"><td>Total</td><td class="num">${money(t.gross)}</td></tr></table>
  ${acc ? `<div class="box page-break" style="margin-top:14pt"><div class="label">Accepted</div>${esc(acc.name)}, ${esc(L.acceptanceMethods[acc.method] || acc.method).toLowerCase()}, ${dateTime(acc.accepted_at)}${acc.signature ? `<img class="sig" src="${esc(acc.signature)}">` : ''}</div>`
    : `<p class="small" style="margin-top:16pt">This estimate is valid for 30 days. Any changes to the work agreed once it starts will be priced and agreed with you before they are carried out.</p>`}`;
  return shell(`${job.ref} estimate v${rev.number}`, body);
}

function invoiceHtml({ inv, business, account }) {
  const vr = !!business.vat_registered;
  const rates = Object.entries(inv.byRate).filter(([, v]) => v.net !== 0);
  const bank = [business.bank_account_name, business.bank_sort_code && `Sort code ${business.bank_sort_code}`, business.bank_account_no && `Account ${business.bank_account_no}`].filter(Boolean);
  const body = `${header({ business, account, title: 'Invoice', number: inv.number, sub: esc(inv.job.title) })}
  <div class="meta"><div><span>Invoice date</span><b>${dateLong(inv.issue_date)}</b></div><div><span>Payment due</span><b>${dateLong(inv.due_date)}</b></div><div><span>Job</span><b>${esc(inv.job.ref)}</b></div><div><span>Amount due</span><b>${money(inv.balance)}</b></div></div>
  <div class="cols"><div><div class="label">Bill to</div><b>${esc(inv.client.name)}</b><br>${addr(inv.client)}</div><div><div class="label">Work at</div>${inv.property ? addr(inv.property) : 'As above'}</div></div>
  ${linesTable(inv.lines, vr)}
  <table class="totals">
  ${vr ? `<tr><td>Subtotal</td><td class="num">${money(inv.net)}</td></tr>` + (inv.reverse_charge ? '' : rates.map(([r, v]) => `<tr><td>VAT at ${r}% on ${money(v.net)}</td><td class="num">${money(v.vat)}</td></tr>`).join('')) : ''}
  <tr class="grand"><td>Total</td><td class="num">${money(inv.gross)}</td></tr>
  ${inv.payments.map(p => `<tr><td>Paid ${dateLong(p.date)}</td><td class="num">${money(-p.amount)}</td></tr>`).join('')}
  ${inv.payments.length ? `<tr class="grand"><td>Balance due</td><td class="num">${money(inv.balance)}</td></tr>` : ''}
  </table>
  ${inv.reverse_charge ? `<div class="callout">Reverse charge: customer to account for VAT to HMRC. VAT at 20% that the customer must account for: ${money(inv.notional_vat)}.</div>` : ''}
  ${bank.length ? `<div class="box page-break" style="margin-top:14pt"><div class="label">Pay by bank transfer</div>${bank.map(esc).join('<br>')}<br>Reference: ${esc(inv.number)}</div>` : ''}`;
  return shell(inv.number, body);
}

// ---------- certificates ----------
const yn = (list, v, critical = true) => { const t = L.opt(list, v); return critical && (v === 'no' || v === 'fail') ? `<span class="bad">${esc(t)}</span>` : esc(t); };
const YNNA = [['yes', 'Yes'], ['no', 'No'], ['na', 'N/A']];

function engineerBlock(cert, business) {
  const d = cert.data;
  return `<div class="cols page-break" style="margin-top:12pt"><div class="box"><div class="label">Engineer</div><b>${esc(d.engineer_name || business.engineer_name || '')}</b><br>
  Gas Safe registration ${esc(business.gas_safe_reg || '')}${d.engineer_licence ? `<br>Licence card ${esc(d.engineer_licence)}` : ''}<br>${dateLong(cert.issue_date)}
  <img class="sig" src="${esc(cert.signature)}"></div>
  <div class="box"><div class="label">Received by</div>${d.received_by ? `<b>${esc(d.received_by)}</b>` : '<span class="small">Not signed for on site</span>'}${d.received_signature ? `<img class="sig" src="${esc(d.received_signature)}">` : ''}</div></div>`;
}

function propertyBlock(cert, leftLabel) {
  const p = cert.property, c = cert.client, d = cert.data;
  return `<div class="cols" style="margin-top:10pt"><div><div class="label">${leftLabel}</div><b>${esc(d.landlord_name || c.name)}</b><br>${d.landlord_address ? esc(d.landlord_address).replace(/\n/g, '<br>') : addr(c)}${(d.landlord_contact || c.phone || c.email) ? '<br>' + esc(d.landlord_contact || [c.phone, c.email].filter(Boolean).join(', ')) : ''}</div>
  <div><div class="label">Property</div>${addr(p)}${d.occupier_name || p.occupier_name ? `<br>Occupier: ${esc(d.occupier_name || p.occupier_name)}` : ''}</div></div>`;
}

function lgsrHtml(cert, business, account) {
  const d = cert.data;
  const apps = d.appliances || [];
  const chunks = [];
  for (let i = 0; i < apps.length; i += 4) chunks.push(apps.slice(i, i + 4));
  const unsafe = apps.some(a => a.safe_to_use === 'no');
  const tables = chunks.map((chunk, ci) => `<table class="grid page-break"><thead><tr><th></th>${chunk.map((_, i) => `<th>Appliance ${ci * 4 + i + 1}</th>`).join('')}</tr></thead><tbody>
    ${L.lgsrApplianceFields.map(f => `<tr><td>${esc(f.label)}</td>${chunk.map(a => {
    let v = a[f.key];
    if (f.type === 'select') v = yn(f.options, v, !!f.critical);
    else if (f.type === 'flue') v = esc(L.opt(L.flueTypes, v));
    else v = esc(v ?? '');
    return `<td>${v || '<span class="small">–</span>'}</td>`;
  }).join('')}</tr>`).join('')}</tbody></table>`).join('');
  const body = `${header({ business, account, title: 'Landlord gas safety record', number: cert.number, sub: `Template ${esc(cert.template_version)}` })}
  <div class="meta"><div><span>Date of check</span><b>${dateLong(cert.issue_date)}</b></div><div><span>Next check due by</span><b>${dateLong(cert.next_due)}</b></div><div><span>Appliances checked</span><b>${apps.length}</b></div><div><span>Result</span><b ${unsafe ? 'class="bad"' : ''}>${unsafe ? 'Unsafe appliance found' : 'All appliances safe to use'}</b></div></div>
  ${cert.kept_deadline ? '<p class="small">This check was carried out within two months of the previous deadline, so the next deadline runs from the previous one.</p>' : ''}
  ${propertyBlock(cert, 'Landlord or agent')}
  <h2>Appliances</h2>${tables}
  <h2>Installation</h2><div class="checks">${L.lgsrInstallationChecks.map(c => `<div><span>${esc(c.label)}</span><span>${yn(c.options, (d.installation || {})[c.key], !!c.critical) || '–'}</span></div>`).join('')}</div>
  <h2>Defects and remedial action</h2>
  <div class="cols"><div><div class="label">Defects identified</div>${esc(d.defects || 'None').replace(/\n/g, '<br>')}</div><div><div class="label">Remedial action taken</div>${esc(d.remedial || 'None').replace(/\n/g, '<br>')}</div></div>
  ${d.warning_issued === 'yes' ? `<div class="callout danger">A gas warning notice was issued${d.warning_number ? ` (${esc(d.warning_number)})` : ''}.</div>` : ''}
  ${engineerBlock(cert, business)}
  <p class="small" style="margin-top:12pt">Keep this record for at least two years. Give a copy to existing tenants within 28 days of the check, and to new tenants before they move in.</p>`;
  return shell(cert.number, body);
}

function applianceLine(cert) {
  const a = cert.asset || cert.data.appliance || {};
  return [a.appliance_type, [a.make, a.model].filter(Boolean).join(' '), a.location && `in ${a.location}`].filter(Boolean).join(', ');
}

function serviceHtml(cert, business, account) {
  const d = cert.data;
  const body = `${header({ business, account, title: 'Gas service record', number: cert.number, sub: `Template ${esc(cert.template_version)}` })}
  <div class="meta"><div><span>Date of service</span><b>${dateLong(cert.issue_date)}</b></div><div><span>Next service due</span><b>${dateLong(cert.next_due)}</b></div><div style="grid-column:span 2"><span>Appliance</span><b>${esc(applianceLine(cert))}</b></div></div>
  ${propertyBlock(cert, 'Customer')}
  <h2>Work carried out</h2><div class="checks">${L.serviceChecks.map(c => `<div><span>${esc(c.label)}</span><span>${(d.checks || {})[c.key] ? 'Done' : '–'}</span></div>`).join('')}</div>
  <h2>Readings</h2><div class="checks">
  <div><span>Operating pressure (mbar)</span><span>${esc(d.operating_pressure || '–')}</span></div><div><span>Heat input (kW)</span><span>${esc(d.heat_input || '–')}</span></div>
  <div><span>CO (ppm)</span><span>${esc(d.co_ppm || '–')}</span></div><div><span>CO₂ (%)</span><span>${esc(d.co2_pct || '–')}</span></div>
  <div><span>CO/CO₂ ratio</span><span>${esc(d.ratio || '–')}</span></div><div><span>Safe to use</span><span>${yn([['yes', 'Yes'], ['no', 'No']], d.safe_to_use)}</span></div></div>
  <h2>Parts fitted and notes</h2><div>${esc(d.parts || 'None').replace(/\n/g, '<br>')}</div>${d.notes ? `<div style="margin-top:4pt">${esc(d.notes).replace(/\n/g, '<br>')}</div>` : ''}
  ${engineerBlock(cert, business)}`;
  return shell(cert.number, body);
}

function warningHtml(cert, business, account) {
  const d = cert.data;
  const cls = L.warningClasses[d.classification] || '';
  const body = `${header({ business, account, title: 'Gas warning notice', number: cert.number, sub: `Template ${esc(cert.template_version)}` })}
  <div class="callout danger" style="margin-top:12pt"><div style="font-family:PlexCond,sans-serif;font-weight:600;font-size:16pt;color:#B42318">${esc(cls)}</div>
  ${d.classification === 'ID' ? 'This gas appliance or installation is dangerous. It has been disconnected or turned off and must not be used until the fault has been put right.' : 'This gas appliance or installation is at risk. It has been turned off and should not be used until the fault has been put right.'}</div>
  <div class="meta"><div><span>Date</span><b>${dateLong(cert.issue_date)}</b></div><div style="grid-column:span 3"><span>Appliance or installation</span><b>${esc(applianceLine(cert))}</b></div></div>
  ${propertyBlock(cert, 'Responsible person')}
  <h2>Fault found</h2><div>${esc(d.fault || '').replace(/\n/g, '<br>')}</div>
  <h2>Action taken</h2><div class="checks">${L.warningActions.map(a => `<div><span>${esc(a.label)}</span><span>${(d.actions || {})[a.key] ? 'Yes' : 'No'}</span></div>`).join('')}</div>
  <div class="cols page-break" style="margin-top:12pt"><div class="box"><div class="label">Engineer</div><b>${esc(d.engineer_name || business.engineer_name || '')}</b><br>Gas Safe registration ${esc(business.gas_safe_reg || '')}<br>${dateLong(cert.issue_date)}<img class="sig" src="${esc(cert.signature)}"></div>
  <div class="box"><div class="label">Customer</div>${d.customer_refused_sign ? '<b>Customer declined to sign.</b>' : `<b>${esc(d.received_by || '')}</b>${d.received_signature ? `<img class="sig" src="${esc(d.received_signature)}">` : ''}`}</div></div>
  <p class="small" style="margin-top:12pt">Classified in line with the Gas Industry Unsafe Situations Procedure. Using this appliance or installation before it is repaired could put lives at risk.</p>`;
  return shell(cert.number, body, { accent: '#B42318' });
}

function commissioningHtml(cert, business, account) {
  const d = cert.data;
  const r = d.readings || {};
  const body = `${header({ business, account, title: 'Boiler commissioning record', number: cert.number, sub: `Template ${esc(cert.template_version)}` })}
  <div class="meta"><div><span>Commissioned</span><b>${dateLong(cert.issue_date)}</b></div><div><span>First service due</span><b>${dateLong(cert.next_due)}</b></div><div style="grid-column:span 2"><span>Appliance</span><b>${esc(applianceLine(cert))}</b></div></div>
  ${propertyBlock(cert, 'Customer')}
  <h2>Readings</h2><table class="grid"><thead><tr><th></th><th>Maximum rate</th><th>Minimum rate</th></tr></thead><tbody>
  <tr><td>CO (ppm)</td><td>${esc(r.max_co || '–')}</td><td>${esc(r.min_co || '–')}</td></tr>
  <tr><td>CO₂ (%)</td><td>${esc(r.max_co2 || '–')}</td><td>${esc(r.min_co2 || '–')}</td></tr>
  <tr><td>CO/CO₂ ratio</td><td>${esc(r.max_ratio || '–')}</td><td>${esc(r.min_ratio || '–')}</td></tr></tbody></table>
  <div class="checks" style="margin-top:6pt"><div><span>Gas rate (kW)</span><span>${esc(d.gas_rate || '–')}</span></div><div><span>Burner operating pressure (mbar)</span><span>${esc(d.burner_pressure || '–')}</span></div>
  <div><span>Heating flow temperature (°C)</span><span>${esc(d.flow_temp || '–')}</span></div><div><span>Hot water temperature (°C)</span><span>${esc(d.hw_temp || '–')}</span></div></div>
  <h2>Controls fitted</h2><div class="checks">${L.commissioningControls.map(c => `<div><span>${esc(c.label)}</span><span>${(d.controls || {})[c.key] ? 'Yes' : 'No'}</span></div>`).join('')}</div>
  <h2>Water treatment</h2><div class="checks">${L.waterTreatment.map(c => `<div><span>${esc(c.label)}</span><span>${(d.water || {})[c.key] ? 'Yes' : 'No'}</span></div>`).join('')}</div>
  <h2>Building regulations</h2><div>${cert.notification_ref ? `Notified through Gas Safe Register, reference ${esc(cert.notification_ref)}${cert.notification_date ? ` on ${dateLong(cert.notification_date)}` : ''}.` : `To be notified through Gas Safe Register by ${dateLong(R.gasSafeNotificationDeadline(cert.issue_date))}.`}</div>
  ${engineerBlock(cert, business)}`;
  return shell(cert.number, body);
}

function certificateHtml({ cert, business, account }) {
  if (cert.type === 'lgsr') return lgsrHtml(cert, business, account);
  if (cert.type === 'service') return serviceHtml(cert, business, account);
  if (cert.type === 'warning') return warningHtml(cert, business, account);
  if (cert.type === 'commissioning') return commissioningHtml(cert, business, account);
  throw new Error('Unknown certificate type.');
}

module.exports = { estimateHtml, invoiceHtml, certificateHtml };
