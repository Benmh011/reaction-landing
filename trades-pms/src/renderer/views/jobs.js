'use strict';
window.Views = window.Views || {};
(() => {
  const { h, raw, render, api, options, pairsOf, toast, modal, money, moneyInput, parseMoney, date, qty, addr, sigField, mountSig } = UI;
  const F = (...a) => Views.field(...a);
  const S = (...a) => Views.select(...a);

  const GROUPS = {
    all: ['All jobs', null],
    estimating: ['Estimating', ['enquiry', 'estimating', 'estimate_sent']],
    live: ['On the go', ['accepted', 'in_progress', 'complete']],
    invoiced: ['Awaiting payment', ['invoiced']],
    paid: ['Paid', ['paid']],
  };

  Views.jobs = async (main, _p, q) => {
    const group = GROUPS[q.show] ? q.show : 'all';
    const jobs = (await api('listJobs')).filter(j => !GROUPS[group][1] || GROUPS[group][1].includes(j.status));
    render(main, h`<div class="page"><header class="page-head"><div><h1>Jobs</h1></div><div class="actions"><button class="btn btn-primary" data-new>New job</button></div></header>
      <nav class="filters">${pairsOf(GROUPS).map(([k, [label]]) => h`<a href="#/jobs?show=${k}" class="${k === group ? 'on' : ''}">${label}</a>`)}</nav>
      ${jobs.length ? h`<table class="table"><thead><tr><th>Job</th><th>Title</th><th>Client</th><th>Property</th><th>Status</th><th>Estimate</th><th class="num">Job total</th></tr></thead><tbody>
      ${jobs.map(j => h`<tr><td><a href="#/jobs/${j.id}" class="ref">${j.ref}</a></td><td>${j.title}</td><td>${j.client_name}</td><td>${[j.property_line1, j.property_postcode].filter(Boolean).join(', ')}</td><td>${UI.jobPill(j.status)}</td>
        <td>${j.latest_revision ? `v${j.latest_revision.number}` : '–'}</td><td class="num">${j.totals.accepted === null ? '–' : money(j.totals.total)}</td></tr>`)}</tbody></table>`
        : h`<div class="empty"><h2>No jobs here</h2><p>Start a job from a client, or with New job.</p></div>`}</div>`);
    main.querySelector('[data-new]').addEventListener('click', () => Views.newJob());
  };

  // Compare two estimate versions line by line, matched on description.
  function diff(prev, cur) {
    const key = l => l.description.trim().toLowerCase();
    const before = new Map(prev.map(l => [key(l), l]));
    const out = cur.map(l => {
      const o = before.get(key(l));
      before.delete(key(l));
      if (!o) return { line: l, change: 'added' };
      const changed = Number(o.qty) !== Number(l.qty) || o.unit_price !== l.unit_price || Number(o.vat_rate) !== Number(l.vat_rate);
      return { line: l, change: changed ? 'changed' : 'same', was: o };
    });
    for (const o of before.values()) out.push({ line: o, change: 'removed' });
    return out;
  }

  Views.job = async (main, [id]) => {
    const job = await api('getJob', Number(id));
    if (!job) return App.go('#/jobs');
    const b = App.state.business;
    const vr = !!b.vat_registered;
    const latest = job.revisions[job.revisions.length - 1] || null;
    const accepted = job.revisions.find(r => r.id === job.accepted_revision_id) || null;
    const invoice = job.invoices.find(i => i.status !== 'void') || null;
    const t = job.totals;
    const blank = () => ({ description: '', kind: 'material', qty: 1, unit_price: 0, vat_rate: vr ? 20 : 0, supplier: '', sku: '', url: '' });
    // Pick lists for this page
    const priceList = b.price_list || Labels.defaultPriceList.map(i => ({ ...i, unit_price: null, vat_rate: vr ? 20 : 0 }));
    const findItem = d => priceList.find(i => i.description.trim().toLowerCase() === String(d || '').trim().toLowerCase());
    const suppliers = [...(b.suppliers || []), ...String(b.suppliers_other || '').split(',').map(x => x.trim()).filter(Boolean)];
    const people = [...new Set([job.client.name, job.property && job.property.occupier_name].filter(Boolean))];
    const lists = h`<datalist id="dl-prices">${priceList.map(i => h`<option value="${i.description}">${i.unit_price === null ? '' : money(i.unit_price)}</option>`)}</datalist>
      <datalist id="dl-suppliers">${suppliers.map(x => h`<option value="${x}">`)}</datalist>
      <datalist id="dl-changes">${Labels.changeNotes.map(x => h`<option value="${x}">`)}</datalist>`;
    const fromItem = (l, item) => { l.description = item.description; l.kind = item.kind || l.kind; if (item.unit_price !== null && item.unit_price !== undefined) l.unit_price = item.unit_price; if (vr && item.vat_rate !== undefined) l.vat_rate = Number(item.vat_rate); };
    // A new job whose title is on the price list starts with that item on the estimate.
    let lines = (latest ? latest.lines : [blank()]).map(l => ({ ...l }));
    if (!latest && findItem(job.title)) fromItem(lines[0], findItem(job.title));
    const saved = JSON.stringify(latest ? latest.lines.map(l => [l.description, l.kind, Number(l.qty), l.unit_price, Number(l.vat_rate), l.supplier || '', l.sku || '', l.url || '']) : []);
    const snap = () => JSON.stringify(lines.filter(l => l.description.trim()).map(l => [l.description.trim(), l.kind, Number(l.qty), l.unit_price, Number(l.vat_rate), l.supplier || '', l.sku || '', l.url || '']));
    const lineTotal = l => Math.round(Number(l.qty || 0) * l.unit_price);
    const sumLines = ls => ls.reduce((s, l) => { const n = lineTotal(l); const v = vr ? Math.round(n * Number(l.vat_rate) / 100) : 0; return { net: s.net + n, vat: s.vat + v }; }, { net: 0, vat: 0 });

    const moneyStrip = accepted ? h`<div class="strip" aria-label="Job total">
        <div><span class="strip-n">${money(t.accepted)}</span><span class="strip-l">Accepted estimate v${accepted.number}</span></div><div class="op">+</div>
        <div><span class="strip-n">${money(t.extras)}</span><span class="strip-l">Approved extras</span></div><div class="op">−</div>
        <div><span class="strip-n">${money(t.omissions)}</span><span class="strip-l">Approved omissions</span></div><div class="op op-eq">=</div>
        <div class="strip-total"><span class="strip-n">${money(t.total)}</span><span class="strip-l">Job total${vr ? ' including VAT' : ''}</span></div>
      </div>${t.pendingExtras ? h`<p class="strip-note">${money(t.pendingExtras)} of extras waiting for the client's approval.</p>` : ''}`
      : h`<div class="strip strip-pending"><div><span class="strip-n">${latest ? money(latest.totals.gross) : '£0.00'}</span><span class="strip-l">${latest ? `Estimate v${latest.number}, not accepted yet` : 'No estimate yet'}</span></div></div>`;

    const estimateEditor = () => h`<div class="section-head"><h2>Estimate</h2>${latest ? h`<span class="muted">Editing after v${latest.number}</span>` : ''}</div>
      <table class="table lines"><thead><tr><th style="width:38%">Description</th><th>Type</th><th class="num">Qty</th><th class="num">Unit price</th>${vr ? h`<th>VAT</th>` : ''}<th class="num">Amount</th><th></th></tr></thead>
      <tbody id="lines"></tbody><tfoot id="lines-foot"></tfoot></table>
      <div class="editor-actions"><button class="btn btn-small" data-add-line>Add line</button><span class="spacer"></span>
        ${latest ? h`<input class="change-note" id="change-note" list="dl-changes" autocomplete="off" placeholder="What changed? Pick or type" aria-label="What changed in this version">` : ''}
        <button class="btn btn-primary" data-save-rev>Save as v${(latest ? latest.number : 0) + 1}</button></div>
      ${latest ? h`<div class="rev-actions" id="rev-actions"><span>Version ${latest.number}: ${Labels.revisionStatus[latest.status]}</span><span class="spacer"></span>
        <button class="btn" data-pdf-rev="${latest.id}">Estimate PDF</button>${latest.status === 'draft' ? h`<button class="btn" data-sent="${latest.id}">Mark as sent</button>` : ''}
        <button class="btn btn-primary" data-accept="${latest.id}">Record acceptance</button></div><p class="hint" id="dirty-hint" hidden>You have unsaved changes. Save them as a new version before sending or recording acceptance.</p>` : ''}`;

    const acceptedView = () => {
      const a = accepted.acceptance;
      const links = accepted.lines.filter(l => l.url || l.sku || l.supplier);
      return h`<div class="section-head"><h2>Accepted estimate, version ${accepted.number}</h2><button class="btn btn-small" data-pdf-rev="${accepted.id}">Estimate PDF</button></div>
        <table class="table"><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th>${vr ? h`<th class="num">VAT</th>` : ''}<th class="num">Amount</th></tr></thead><tbody>
        ${accepted.lines.map(l => h`<tr><td>${l.description}</td><td class="num">${qty(l.qty)}</td><td class="num">${money(l.unit_price)}</td>${vr ? h`<td class="num">${Number(l.vat_rate)}%</td>` : ''}<td class="num">${money(lineTotal(l))}</td></tr>`)}</tbody>
        <tfoot>${vr ? h`<tr><td colspan="4">Subtotal</td><td class="num">${money(accepted.totals.net)}</td></tr><tr><td colspan="4">VAT</td><td class="num">${money(accepted.totals.vat)}</td></tr>` : ''}<tr class="grand"><td colspan="${vr ? 4 : 3}">Total</td><td class="num">${money(accepted.totals.gross)}</td></tr></tfoot></table>
        <div class="acceptance">${a.signature ? h`<img src="${a.signature}" alt="Signature" class="sig-img">` : ''}<div><b>Accepted by ${a.name}</b><div class="muted">${Labels.acceptanceMethods[a.method]}, ${date(a.accepted_at)} at ${a.accepted_at.slice(11, 16)}</div></div></div>
        ${links.length ? h`<div class="to-order"><h3>Parts to order</h3><ul>${links.map(l => h`<li><span>${l.description}</span><span class="muted">${[l.supplier, l.sku && `code ${l.sku}`].filter(Boolean).join(', ')}</span>${l.url ? h`<a href="${l.url}" target="_blank" rel="noopener">Open product page</a>` : ''}</li>`)}</ul></div>` : ''}`;
    };

    const history = () => job.revisions.length ? h`<details class="history"${accepted ? '' : raw(' open')}><summary>Version history (${job.revisions.length})</summary>
      <table class="table compact"><thead><tr><th>Version</th><th>Saved</th><th>What changed</th><th>Status</th><th class="num">Total</th><th class="num">Change</th><th></th></tr></thead><tbody>
      ${job.revisions.slice().reverse().map(r => {
        const prev = job.revisions.find(x => x.number === r.number - 1);
        const delta = prev ? r.totals.gross - prev.totals.gross : null;
        return h`<tr><td><b>v${r.number}</b></td><td>${date(r.created_at)}</td><td>${r.change_note || ''}</td><td>${Labels.revisionStatus[r.status]}</td><td class="num">${money(r.totals.gross)}</td>
          <td class="num ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}">${delta === null ? '' : (delta > 0 ? '+' : '') + money(delta)}</td><td class="num"><button class="link-btn" data-show-rev="${r.id}">Show</button></td></tr>
          <tr class="rev-detail" id="rev-${r.id}" hidden><td colspan="7"><ul class="diff">${diff(prev ? prev.lines : [], r.lines).map(d => h`<li class="d-${d.change}"><span class="d-tag">${{ added: 'Added', removed: 'Removed', changed: 'Changed', same: '' }[d.change]}</span>${d.line.description}: ${qty(d.line.qty)} × ${money(d.line.unit_price)}${d.change === 'changed' ? h` <span class="muted">(was ${qty(d.was.qty)} × ${money(d.was.unit_price)})</span>` : ''}</li>`)}</ul></td></tr>`;
      })}</tbody></table></details>` : '';

    const variations = () => {
      if (!accepted) return '';
      const locked = !!invoice;
      return h`<section class="section"><div class="section-head"><h2>Variations</h2><span class="muted">Extras and omissions agreed while the job runs</span></div>
        <table class="table"><thead><tr><th>Type</th><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th>${vr ? h`<th class="num">VAT</th>` : ''}<th class="num">Amount</th><th>Status</th><th></th></tr></thead><tbody>
        ${job.variations.length ? job.variations.map(v => h`<tr class="${v.status === 'rejected' ? 'struck' : ''}"><td>${v.kind === 'extra' ? 'Extra' : 'Omission'}</td><td>${v.description}<div class="muted small">${Labels.lineKinds[v.category]}</div></td><td class="num">${qty(v.qty)}</td><td class="num">${money(v.unit_price)}</td>${vr ? h`<td class="num">${Number(v.vat_rate)}%</td>` : ''}
          <td class="num">${v.kind === 'omission' ? '−' : '+'}${money(v.totals.gross)}</td>
          <td>${v.status === 'approved' ? h`${UI.pill('Approved', 'safe')}<div class="muted small">${v.approved_by}, ${Labels.approvalMethods[v.approved_method].toLowerCase()}, ${date(v.decided_at)}</div>` : v.status === 'rejected' ? UI.pill('Rejected') : UI.pill('Waiting for approval', 'ochre')}</td>
          <td class="num">${v.status === 'pending' && !locked ? h`<button class="btn btn-small" data-approve="${v.id}">Approve</button> <button class="link-btn" data-reject="${v.id}">Reject</button> <button class="link-btn" data-del-var="${v.id}">Delete</button>` : ''}</td></tr>`)
          : h`<tr><td colspan="8" class="muted">Nothing yet. Log extras and omissions here as soon as they come up.</td></tr>`}</tbody></table>
        ${locked ? h`<p class="muted">This job has been invoiced, so variations are closed.</p>` : h`<form class="var-form" id="var-form" novalidate>
          <select name="kind" aria-label="Type"><option value="extra">Extra</option><option value="omission">Omission</option></select>
          <input name="description" list="dl-prices" autocomplete="off" placeholder="What changed? Pick from your price list or type" aria-label="Description">
          <select name="category" aria-label="Labour or material">${options(pairsOf(Labels.lineKinds), 'material')}</select>
          <input name="qty" value="1" class="w-qty" aria-label="Quantity" inputmode="decimal">
          <input name="unit_price" placeholder="Unit price" class="w-money" aria-label="Unit price" inputmode="decimal">
          ${vr ? h`<select name="vat_rate" aria-label="VAT rate">${options(Labels.vatRates, 20)}</select>` : ''}
          <button class="btn" type="submit">Log variation</button></form>`}</section>`;
    };

    const invoiceSection = () => {
      if (!accepted) return '';
      const pending = job.variations.some(v => v.status === 'pending');
      return h`<section class="section"><div class="section-head"><h2>Invoice</h2></div>
        ${invoice ? h`<div class="invoice-row"><div><a href="#/invoices/${invoice.id}" class="ref">${invoice.number}</a><div class="muted">Issued ${date(invoice.issue_date)}, due ${date(invoice.due_date)}</div></div>
          <div class="kv"><span>Total</span><b>${money(invoice.gross)}</b></div><div class="kv"><span>Paid</span><b>${money(invoice.paid)}</b></div><div class="kv"><span>Balance</span><b>${money(invoice.balance)}</b></div>
          <div class="actions"><button class="btn" data-pdf-inv="${invoice.id}">Invoice PDF</button>${invoice.balance > 0 ? h`<button class="btn btn-primary" data-pay="${invoice.id}">Record payment</button>` : UI.pill('Paid in full', 'safe')}</div></div>`
        : h`<p class="muted">${pending ? 'Approve or reject the waiting variations, then the invoice can be created.' : `The invoice will list the accepted estimate v${accepted.number} plus ${job.variations.filter(v => v.status === 'approved').length} approved variations, ${money(t.total)} in total.`}</p>
          <button class="btn btn-primary" data-invoice${pending ? raw(' disabled') : ''}>Create invoice</button>`}</section>`;
    };

    const suggested = (Labels.jobTitles.find(([t]) => t.toLowerCase() === job.title.trim().toLowerCase()) || [])[1];
    const certSection = () => App.hasTrade('gas') ? h`<section class="section"><div class="section-head"><h2>Certificates</h2></div>
      ${job.certificates.length ? h`<table class="table compact"><tbody>${job.certificates.map(c => h`<tr><td><a href="#/certificates/${c.id}">${c.number}</a></td><td>${Labels.certTypes[c.type]}</td><td>${date(c.issue_date)}</td><td>${c.next_due ? `Next due ${date(c.next_due)}` : ''}</td></tr>`)}</tbody></table>` : ''}
      ${job.property ? h`<div class="cert-buttons">${pairsOf(Labels.certTypes).map(([k, v]) => h`<a class="btn btn-small${k === suggested ? ' btn-primary' : ''}" href="#/certificates/new/${k}?job=${job.id}">${v}</a>`)}</div>` : h`<p class="muted">Add a property to this job to issue certificates.</p>`}</section>` : '';

    render(main, h`<div class="page job"><p class="crumb"><a href="#/jobs">Jobs</a></p>
      <header class="job-head"><div class="job-ref">${job.ref}</div><div class="job-title"><h1>${job.title}</h1>
        <p class="sub"><a href="#/clients/${job.client.id}">${job.client.name}</a>${job.property ? `, ${addr(job.property)}` : ''}</p></div>
        <div class="actions">${UI.jobPill(job.status)}${['accepted', 'in_progress'].includes(job.status) ? h`<button class="btn btn-small" data-complete>Mark work complete</button>` : ''}</div></header>
      ${moneyStrip}
      ${job.reverse_charge && vr ? h`<p class="callout">This client is a VAT-registered CIS contractor, so the invoice will use the construction reverse charge.</p>` : ''}
      <section class="section">${accepted ? acceptedView() : estimateEditor()}${history()}</section>
      ${variations()}${invoiceSection()}${certSection()}${lists}</div>`);

    // ----- estimate editor behaviour -----
    if (!accepted) {
      const body = main.querySelector('#lines'), foot = main.querySelector('#lines-foot');
      const drawLines = () => {
        render(body, lines.map((l, i) => h`<tr data-i="${i}"><td><input data-f="description" value="${l.description}" list="dl-prices" autocomplete="off" placeholder="Pick from your price list or type" aria-label="Description"></td>
          <td><select data-f="kind" aria-label="Type">${options(pairsOf(Labels.lineKinds), l.kind)}</select></td>
          <td class="num"><input data-f="qty" value="${qty(l.qty)}" class="w-qty" inputmode="decimal" aria-label="Quantity"></td>
          <td class="num"><input data-f="unit_price" value="${moneyInput(l.unit_price)}" class="w-money" inputmode="decimal" aria-label="Unit price"></td>
          ${vr ? h`<td><select data-f="vat_rate" aria-label="VAT rate">${options(Labels.vatRates, l.vat_rate)}</select></td>` : ''}
          <td class="num amount">${money(lineTotal(l))}</td>
          <td class="num"><button class="link-btn${l.url || l.sku || l.supplier ? ' has-link' : ''}" data-link title="Supplier link, never shown to the client">${l.url || l.sku || l.supplier ? 'Product link added' : 'Add product link'}</button> <button class="icon-btn" data-del aria-label="Remove line">×</button></td></tr>
          <tr class="link-row" data-link-row="${i}" hidden><td colspan="${vr ? 7 : 6}"><div class="link-fields"><input data-f="supplier" value="${l.supplier || ''}" list="dl-suppliers" autocomplete="off" placeholder="Supplier"><input data-f="sku" value="${l.sku || ''}" placeholder="Product code"><input data-f="url" value="${l.url || ''}" placeholder="Product page address (https://…)"><span class="hint">Only you see this.</span></div></td></tr>`));
        drawFoot();
      };
      const drawFoot = () => {
        const s = sumLines(lines);
        render(foot, h`${vr ? h`<tr><td colspan="${vr ? 5 : 4}">Subtotal</td><td class="num">${money(s.net)}</td><td></td></tr><tr><td colspan="5">VAT</td><td class="num">${money(s.vat)}</td><td></td></tr>` : ''}<tr class="grand"><td colspan="${vr ? 5 : 4}">Total</td><td class="num">${money(s.net + s.vat)}</td><td></td></tr>`);
        const dirty = snap() !== saved;
        const hint = main.querySelector('#dirty-hint');
        if (hint) { hint.hidden = !dirty; main.querySelectorAll('#rev-actions button').forEach(btn => { btn.disabled = dirty; }); }
      };
      body.addEventListener('input', e => {
        const tr = e.target.closest('[data-i], [data-link-row]'); if (!tr) return;
        const i = Number(tr.dataset.i ?? tr.dataset.linkRow), f = e.target.dataset.f, l = lines[i];
        if (f === 'unit_price') l.unit_price = parseMoney(e.target.value) || 0;
        else if (f === 'qty') l.qty = Number(e.target.value) || 0;
        else if (f === 'vat_rate') l.vat_rate = Number(e.target.value);
        else l[f] = e.target.value;
        const amt = body.querySelector(`[data-i="${i}"] .amount`); if (amt) amt.textContent = money(lineTotal(l));
        drawFoot();
      });
      body.addEventListener('click', e => {
        const tr = e.target.closest('[data-i]'); if (!tr) return;
        const i = Number(tr.dataset.i);
        if (e.target.closest('[data-del]')) { lines.splice(i, 1); if (!lines.length) lines.push(blank()); drawLines(); }
        if (e.target.closest('[data-link]')) { const row = body.querySelector(`[data-link-row="${i}"]`); row.hidden = !row.hidden; }
      });
      // Picking an item from the price list fills in its type, price and VAT.
      body.addEventListener('change', e => {
        if (e.target.dataset.f !== 'description') return;
        const tr = e.target.closest('[data-i]'); const item = findItem(e.target.value);
        if (tr && item) { fromItem(lines[Number(tr.dataset.i)], item); drawLines(); }
      });
      body.addEventListener('change', e => { const tr = e.target.closest('[data-i]'); if (tr && e.target.tagName === 'SELECT') { const l = lines[Number(tr.dataset.i)]; if (e.target.dataset.f === 'vat_rate') l.vat_rate = Number(e.target.value); else l[e.target.dataset.f] = e.target.value; drawFoot(); } });
      main.querySelector('[data-add-line]').addEventListener('click', () => { lines.push(blank()); drawLines(); body.querySelector(`[data-i="${lines.length - 1}"] input`).focus(); });
      main.querySelector('[data-save-rev]').addEventListener('click', async () => {
        try {
          const note = main.querySelector('#change-note');
          if (latest && snap() === saved) throw new Error('Nothing has changed since the last version.');
          for (const l of lines) if (l.url && !/^https?:\/\//i.test(l.url)) throw new Error(`The product link on “${l.description}” must start with https://`);
          await api('saveRevision', job.id, lines, note ? note.value : '');
          toast(`Saved as version ${(latest ? latest.number : 0) + 1}`);
          App.reload();
        } catch (ex) { toast(ex.message, 'error'); }
      });
      drawLines();
    }

    // ----- buttons -----
    const on = (sel, fn) => main.querySelectorAll(sel).forEach(el => el.addEventListener('click', async e => { e.preventDefault(); try { await fn(el); } catch (ex) { toast(ex.message, 'error'); } }));
    on('[data-show-rev]', el => { const row = main.querySelector('#rev-' + el.dataset.showRev); row.hidden = !row.hidden; el.textContent = row.hidden ? 'Show' : 'Hide'; });
    on('[data-pdf-rev]', el => UI.openPdf('estimate', { job: job.id, revision: Number(el.dataset.pdfRev) }));
    on('[data-sent]', async el => { await api('markRevisionSent', Number(el.dataset.sent)); toast('Marked as sent'); App.reload(); });
    on('[data-accept]', async el => {
      let pad;
      const r = await modal({
        title: `Record acceptance of version ${latest.number}`, confirm: 'Record acceptance', wide: true,
        body: h`<p class="lead">${money(latest.totals.gross)} for ${job.title}. Once accepted, this version is locked and changes are logged as variations.</p>
          <div class="grid2">${F('Name of the person accepting', 'name', job.client.name, { required: true, list: people })}${S('How they accepted', 'method', pairsOf(Labels.acceptanceMethods), 'signed', { blank: undefined })}</div>
          ${sigField('accept-sig', 'Client signature (needed when signed in person)')}`,
        onMount: form => { pad = mountSig(form, 'accept-sig'); },
        onConfirm: d => api('acceptRevision', Number(el.dataset.accept), { ...d, signature: pad.get() }),
      });
      if (r) { toast(`Version ${latest.number} accepted`); App.reload(); }
    });
    on('[data-complete]', async () => { await api('setJobStatus', job.id, 'complete'); toast('Marked as work complete'); App.reload(); });
    const vf = main.querySelector('#var-form');
    if (vf) vf.querySelector('[name=description]').addEventListener('change', e => {
      const item = findItem(e.target.value);
      if (!item) return;
      vf.querySelector('[name=category]').value = item.kind || 'material';
      if (item.unit_price !== null && item.unit_price !== undefined) vf.querySelector('[name=unit_price]').value = moneyInput(item.unit_price);
      const vsel = vf.querySelector('[name=vat_rate]'); if (vsel && item.vat_rate !== undefined) vsel.value = String(item.vat_rate);
    });
    if (vf) vf.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const d = UI.formData(vf);
        const price = parseMoney(d.unit_price);
        if (!d.unit_price || Number.isNaN(price)) throw new Error('Enter the unit price.');
        await api('addVariation', { ...d, job_id: job.id, qty: Number(d.qty), unit_price: price, vat_rate: Number(d.vat_rate || 0) });
        toast('Variation logged');
        App.reload();
      } catch (ex) { toast(ex.message, 'error'); }
    });
    on('[data-approve]', async el => {
      const r = await modal({
        title: 'Approve variation', confirm: 'Approve',
        body: h`<div class="grid2">${F('Approved by', 'by', job.client.name, { required: true, list: people })}${S('How', 'method', pairsOf(Labels.approvalMethods), 'in_person', { blank: undefined })}</div>`,
        onConfirm: d => api('decideVariation', Number(el.dataset.approve), 'approve', d),
      });
      if (r) { toast('Variation approved'); App.reload(); }
    });
    on('[data-reject]', async el => { await api('decideVariation', Number(el.dataset.reject), 'reject'); toast('Variation rejected'); App.reload(); });
    on('[data-del-var]', async el => { await api('decideVariation', Number(el.dataset.delVar), 'delete'); toast('Variation deleted'); App.reload(); });
    on('[data-invoice]', async () => {
      const r = await modal({
        title: 'Create invoice', confirm: 'Create invoice',
        body: h`<p class="lead">${money(t.total)} for ${job.ref}. Lines come from estimate v${accepted.number} and the approved variations, so nothing is retyped.</p>${F('Invoice date', 'issue_date', UI.today(), { type: 'date' })}`,
        onConfirm: d => api('createInvoiceFromJob', job.id, d),
      });
      if (r) { toast(`${r.number} created`); App.reload(); }
    });
    on('[data-pdf-inv]', el => UI.openPdf('invoice', Number(el.dataset.pdfInv)));
    on('[data-pay]', async el => { if (await Views.recordPayment(invoice)) App.reload(); });
  };

  Views.recordPayment = inv => modal({
    title: `Record payment for ${inv.number}`, confirm: 'Record payment',
    body: h`<p class="lead">${money(inv.balance)} still owed.</p><div class="grid2">${F('Amount received (£)', 'amount', moneyInput(inv.balance), { required: true })}${F('Date received', 'date', UI.today(), { type: 'date', required: true })}</div>
      <div class="grid2">${S('How', 'method', pairsOf(Labels.paymentMethods), 'transfer', { blank: undefined })}${F('Reference', 'reference', '', { placeholder: 'Cheque number or bank reference' })}</div>`,
    onConfirm: d => { const amt = parseMoney(d.amount); if (Number.isNaN(amt)) throw new Error('Check the amount.'); return api('addPayment', inv.id, { ...d, amount: amt }); },
  });
})();
