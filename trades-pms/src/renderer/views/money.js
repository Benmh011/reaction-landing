'use strict';
window.Views = window.Views || {};
(() => {
  const { h, render, api, pairsOf, toast, modal, money, moneyInput, parseMoney, date, addr, options, formData, csv } = UI;
  const F = (...a) => Views.field(...a);
  const S = (...a) => Views.select(...a);

  // ---------- Today ----------
  const svg = (inner, size = 18) => UI.raw(`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`);
  const ICON = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    percent: '<path d="M7 17 17 7"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  Views.dashboard = async (main) => {
    const d = await api('dashboard');
    const b = App.state.business;
    const gas = App.hasTrade('gas');
    const overdueList = d.due.filter(x => x.bucket === 'overdue');
    const soonList = d.due.filter(x => x.bucket !== 'overdue');
    const owed = d.unpaid.reduce((s, i) => s + i.balance, 0);
    const lateInvoices = d.unpaid.filter(i => i.overdue).length;
    const waiting = d.awaitingAcceptance.length;
    const sent = d.awaitingAcceptance.filter(j => j.status === 'estimate_sent').length;
    const nothingWaiting = !d.due.length && !d.toInvoice.length && !waiting;
    // First run: no job has ever been started. The empty space becomes the way in.
    const firstRun = nothingWaiting && !(await api('listJobs', 'all')).length;
    const hasClients = firstRun && (await api('listClients')).length > 0;
    // Web demo only: made-up work can be loaded once, into an empty account or alongside real entries.
    const canSample = !!(window.tpms.web && window.TpmsSample) && !(await window.TpmsSample.loaded());
    const greeting = (() => { const hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'; })();
    const dayLine = new Date(UI.today() + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // One figure in the strip across the top. A zero is shown quietly; red is kept for what is late.
    const cell = (href, label, n, note, o = {}) => h`<a class="glance-cell${o.zero ? ' is-zero' : ''}${o.bad ? ' is-bad' : ''}" href="${href}">
      <span class="glance-l">${label}</span><span class="glance-n">${n}</span><span class="glance-note${o.good ? ' good' : ''}${o.badNote ? ' bad' : ''}">${o.good ? svg(ICON.tick, 14) : ''}${note}</span></a>`;
    const waitingNote = [sent && `${sent} sent`, (waiting - sent) && `${waiting - sent} being priced`].filter(Boolean).join(', ');
    const glance = h`<section class="glance" aria-label="At a glance">
      ${gas ? h`${cell('#/reminders', 'Overdue checks and services', overdueList.length,
          overdueList.length ? `Oldest is ${plural(Math.max(...overdueList.map(x => -x.days_left)), 'day', 'days')} over` : 'Nothing overdue',
          { zero: !overdueList.length, bad: !!overdueList.length, good: !overdueList.length, badNote: !!overdueList.length })}
        ${cell('#/reminders', 'Due in the next 60 days', soonList.length, soonList.length ? `Next on ${date(soonList[0].next_due)}` : 'Nothing coming up', { zero: !soonList.length })}` : ''}
      ${cell('#/jobs?show=estimating', 'Estimates waiting for an answer', waiting, waiting ? waitingNote : 'None waiting', { zero: !waiting })}
      ${cell('#/invoices', 'Owed to you', money(owed), d.unpaid.length ? `On ${plural(d.unpaid.length, 'invoice', 'invoices')}${lateInvoices ? `, ${lateInvoices} overdue` : ''}` : 'No unpaid invoices', { zero: !d.unpaid.length, badNote: !!lateInvoices })}
    </section>`;

    const row = (lead, title, sub, trail) => h`<li class="row">${lead || ''}<div class="row-main"><b>${title}</b><div class="muted">${sub}</div></div>${trail ? h`<div class="row-trail">${trail}</div>` : ''}</li>`;
    const panel = (title, more, rows) => h`<section class="panel"><div class="panel-head"><h2>${title}</h2>${more || ''}</div><ul class="rows">${rows}</ul></section>`;
    const duePill = x => x.bucket === 'overdue'
      ? h`<span class="pill pill-bad">${plural(-x.days_left, 'day', 'days')} overdue</span>`
      : h`<span class="pill pill-ochre">Due ${date(x.next_due)}</span>`;

    const sampleStrip = h`<div class="start-sample"><div class="row-main"><b>Just looking around?</b><div class="muted">${firstRun ? 'Fill this account with made-up clients, jobs, invoices and certificates.' : 'Add made-up clients, jobs, invoices and certificates alongside your own.'}</div></div>
      <button class="btn" data-sample>Load sample data</button></div>`;
    const start = h`<section class="panel start"><div class="panel-head"><h2>Three steps to your first estimate</h2></div>
      <p class="muted start-lead">Nothing is waiting yet. Start here.</p>
      <ol class="start-steps">
        <li class="${hasClients ? 'done' : 'now'}"><span class="start-n">${hasClients ? svg(ICON.tick, 16) : '1'}</span>
          <div class="row-main"><b>Add a client</b><div class="muted">Their name, the property and how to reach them.</div></div>
          ${hasClients ? '' : h`<button class="btn btn-dark" data-new-client>Add client${svg(ICON.arrow, 16)}</button>`}</li>
        <li class="${hasClients ? 'now' : ''}"><span class="start-n">2</span>
          <div class="row-main"><b>Start a job</b><div class="muted">Say what the work is and where.</div></div>
          ${hasClients ? h`<button class="btn btn-dark" data-new-job>New job${svg(ICON.arrow, 16)}</button>` : ''}</li>
        <li><span class="start-n">3</span>
          <div class="row-main"><b>Price it and send the estimate</b><div class="muted">Every version is kept, and the customer signs off the one they accept.</div></div></li>
      </ol>
      ${canSample ? sampleStrip : ''}
    </section>`;

    const deadline = (ic, tone, title, sub, extra) => h`<li class="row deadline"><span class="chip-icon ${tone}">${svg(ICON[ic])}</span><div class="row-main"><b>${title}</b><div class="muted">${sub}</div>${extra || ''}</div></li>`;

    render(main, h`<div class="page today"><header class="page-head"><div><p class="day">${dayLine}</p><h1>${greeting}${b.engineer_name ? `, ${b.engineer_name.split(' ')[0]}` : ''}</h1></div>
      <div class="actions"><button class="btn" data-new-client>${svg(ICON.plus, 16)}New client</button><button class="btn btn-primary" data-new-job>${svg(ICON.plus, 16)}New job</button></div></header>
      ${glance}
      <div class="two-col">
        <div class="col">
          ${gas && d.due.length ? panel('Due and overdue', h`<a href="#/reminders">All reminders</a>`,
            d.due.slice(0, 6).map(x => row('', x.kind, `${x.client_name}, ${x.address_line1}`, duePill(x)))) : ''}
          ${d.toInvoice.length ? panel('Ready to invoice', '',
            d.toInvoice.map(j => row(h`<a href="#/jobs/${j.id}" class="ref-chip">${j.ref}</a>`, j.title,
              `${j.client_name}${j.totals.pendingExtras ? `, ${money(j.totals.pendingExtras)} of extras waiting for approval` : ''}`, h`<b>${money(j.totals.total)}</b>`))) : ''}
          ${waiting ? panel('Estimates waiting', '',
            d.awaitingAcceptance.map(j => row(h`<a href="#/jobs/${j.id}" class="ref-chip">${j.ref}</a>`, j.title,
              `${j.client_name}, version ${j.latest_revision ? j.latest_revision.number : 1}, ${Labels.jobStatus[j.status].toLowerCase()}`))) : ''}
          ${firstRun ? start : nothingWaiting ? h`<section class="panel"><div class="empty-quiet"><h2>Nothing waiting</h2><p>Estimates to chase, jobs to invoice and checks that fall due will show here.</p></div></section>` : ''}
          ${canSample && !firstRun ? h`<section class="panel sample-only">${sampleStrip}</section>` : ''}
        </div>
        <div class="col">
          ${panel('Tax deadlines', '', h`
            ${d.vat ? deadline('percent', 'tone-ochre', 'VAT return', `${date(d.vat.period.start)} to ${date(d.vat.period.end)}, due ${date(d.vat.period.due)}`,
                h`<div class="deadline-amount"><span class="deadline-n">${money(d.vat.boxes.box5)}</span><span class="muted">${d.vat.direction === 'pay' ? 'to pay so far' : 'to reclaim so far'}</span></div>`)
              : deadline('percent', '', 'VAT', b.vat_registered ? 'Add your VAT registration date in Settings.' : 'Not VAT registered.')}
            ${d.mtd ? deadline('calendar', 'tone-ochre', 'Income Tax quarterly update', `${date(d.mtd.start)} to ${date(d.mtd.end)}, due ${date(d.mtd.due)}`)
              : d.mtdInfo && d.mtdInfo.status !== 'not_applicable' ? deadline('calendar', '', 'Income Tax', d.mtdInfo.text) : ''}`)}
          ${d.notifications.length ? panel('Gas Safe notifications', '',
            d.notifications.map(n => row('', h`<a href="#/certificates/${n.id}">${n.number}</a>`, `${n.client_name}, ${n.address_line1}`,
              h`<span class="pill ${n.days_left < 7 ? 'pill-bad' : 'pill-neutral'}">By ${date(n.deadline)}</span>`))) : ''}
          ${d.unpaid.length ? panel('Unpaid invoices', h`<a href="#/invoices">All invoices</a>`,
            d.unpaid.slice(0, 6).map(i => row(h`<a href="#/invoices/${i.id}" class="ref-chip">${i.number}</a>`, h`${money(i.balance)} from ${i.client_name}`,
              h`<span class="${i.overdue ? 'bad' : ''}">${i.overdue ? 'Overdue since' : 'Due'} ${date(i.due_date)}</span>`))) : ''}
        </div>
      </div></div>`);
    main.querySelectorAll('[data-new-client]').forEach(el => el.addEventListener('click', async () => { const c = await Views.editClient(); if (c) App.go(`#/clients/${c.id}`); }));
    main.querySelectorAll('[data-new-job]').forEach(el => el.addEventListener('click', () => Views.newJob()));
    // Web demo only: fill an empty account with made-up work to look around.
    const sampleBtn = main.querySelector('[data-sample]');
    if (sampleBtn) sampleBtn.addEventListener('click', async () => {
      // With work of their own already in the account, ask first: the sample cannot be taken out again in one go.
      if (!firstRun && !(await modal({ title: 'Load sample data', confirm: 'Load sample data',
        body: h`<p>This adds seven made-up clients with their jobs, invoices, certificates and expenses alongside what is already here. It cannot be removed again in one go.</p>`, onConfirm: () => true }))) return;
      sampleBtn.disabled = true; sampleBtn.textContent = 'Loading sample data…';
      try { await window.TpmsSample.load(); toast('Sample data loaded'); App.reload(); }
      catch (ex) { toast(ex.message, 'error'); sampleBtn.disabled = false; sampleBtn.textContent = 'Load sample data'; }
    });
  };

  // ---------- invoices ----------
  Views.invoices = async (main) => {
    const list = await api('listInvoices');
    const today = UI.today();
    render(main, h`<div class="page"><header class="page-head"><div><h1>Invoices</h1><p class="sub">Invoices are created from a job once its estimate is accepted.</p></div></header>
      ${list.length ? h`<table class="table"><thead><tr><th>Number</th><th>Job</th><th>Client</th><th>Issued</th><th>Due</th><th class="num">Total</th><th class="num">Balance</th><th>Status</th></tr></thead><tbody>
      ${list.map(i => h`<tr><td><a href="#/invoices/${i.id}" class="ref">${i.number}</a></td><td><a href="#/jobs/${i.job_id}">${i.job_ref}</a></td><td>${i.client_name}</td><td>${date(i.issue_date)}</td><td>${date(i.due_date)}</td><td class="num">${money(i.gross)}</td><td class="num">${money(i.balance)}</td>
        <td>${i.balance === 0 ? UI.pill('Paid', 'safe') : i.due_date < today ? UI.pill('Overdue', 'bad') : i.paid ? UI.pill('Part paid', 'ochre') : UI.pill('Unpaid', 'info')}</td></tr>`)}</tbody></table>`
        : h`<div class="empty"><h2>No invoices yet</h2><p>Open a job with an accepted estimate and choose Create invoice.</p></div>`}</div>`);
  };

  Views.invoice = async (main, [id]) => {
    const inv = await api('getInvoice', Number(id));
    if (!inv) return App.go('#/invoices');
    const vr = !!App.state.business.vat_registered;
    render(main, h`<div class="page"><p class="crumb"><a href="#/invoices">Invoices</a></p>
      <header class="page-head"><div><h1>${inv.number}</h1><p class="sub"><a href="#/jobs/${inv.job.id}">${inv.job.ref}</a> ${inv.job.title}, <a href="#/clients/${inv.client.id}">${inv.client.name}</a></p></div>
        <div class="actions"><button class="btn" data-pdf>Invoice PDF</button>${inv.balance > 0 ? h`<button class="btn btn-primary" data-pay>Record payment</button>` : UI.pill('Paid in full', 'safe')}</div></header>
      <dl class="facts wide"><dt>Issued</dt><dd>${date(inv.issue_date)}</dd><dt>Due</dt><dd>${date(inv.due_date)}</dd>${inv.property ? h`<dt>Work at</dt><dd>${addr(inv.property)}</dd>` : ''}</dl>
      ${inv.reverse_charge ? h`<p class="callout">Reverse charge invoice. The customer accounts for ${money(inv.notional_vat)} of VAT to HMRC.</p>` : ''}
      <table class="table"><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit price</th>${vr ? h`<th class="num">VAT</th>` : ''}<th class="num">Amount</th><th>From</th></tr></thead><tbody>
      ${inv.lines.map(l => h`<tr><td>${l.description}</td><td class="num">${UI.qty(l.qty)}</td><td class="num">${money(l.unit_price)}</td>${vr ? h`<td class="num">${Number(l.vat_rate)}%</td>` : ''}<td class="num">${money(Math.round(l.qty * l.unit_price))}</td><td class="muted">${l.source}</td></tr>`)}</tbody>
      <tfoot>${vr ? h`<tr><td colspan="4">Subtotal</td><td class="num">${money(inv.net)}</td><td></td></tr><tr><td colspan="4">VAT</td><td class="num">${money(inv.vat)}</td><td></td></tr>` : ''}<tr class="grand"><td colspan="${vr ? 4 : 3}">Total</td><td class="num">${money(inv.gross)}</td><td></td></tr></tfoot></table>
      <section class="section"><div class="section-head"><h2>Payments</h2></div>
        ${inv.payments.length ? h`<table class="table compact"><thead><tr><th>Date</th><th>How</th><th>Reference</th><th class="num">Amount</th></tr></thead><tbody>${inv.payments.map(p => h`<tr><td>${date(p.date)}</td><td>${Labels.paymentMethods[p.method]}</td><td>${p.reference || ''}</td><td class="num">${money(p.amount)}</td></tr>`)}</tbody>
          <tfoot><tr class="grand"><td colspan="3">Balance due</td><td class="num">${money(inv.balance)}</td></tr></tfoot></table>` : h`<p class="muted">No payments yet. ${money(inv.balance)} due by ${date(inv.due_date)}.</p>`}</section></div>`);
    main.querySelector('[data-pdf]').addEventListener('click', async () => { try { await UI.openPdf('invoice', inv.id); } catch (ex) { toast(ex.message, 'error'); } });
    const pay = main.querySelector('[data-pay]');
    if (pay) pay.addEventListener('click', async () => { if (await Views.recordPayment(inv)) { toast('Payment recorded'); App.reload(); } });
  };

  // ---------- VAT and expenses ----------
  Views.vat = async (main, _p, q) => {
    const b = App.state.business;
    const s = await api('vatSummary', q.period !== undefined ? Number(q.period) : undefined);
    const range = s.period ? { start: s.period.start, end: s.period.end } : null;
    const expenses = await api('listExpenses', range);
    const jobs = await api('listJobs');
    const BOXES = [
      ['box1', 'VAT due on sales'], ['box2', 'VAT due on goods from the EU (Northern Ireland only)'], ['box3', 'Total VAT due'], ['box4', 'VAT reclaimed on purchases'],
      ['box5', 'Net VAT'], ['box6', 'Total sales, excluding VAT'], ['box7', 'Total purchases, excluding VAT'], ['box8', 'Goods supplied to the EU'], ['box9', 'Goods bought from the EU'],
    ];
    const boxValue = (k, v) => (['box6', 'box7', 'box8', 'box9'].includes(k) ? '£' + (v / 100).toLocaleString('en-GB') : money(v));
    const schemeNote = { standard: 'VAT is counted on the invoice date.', cash: 'VAT is counted when the customer pays you.', flat: `Box 1 is ${s.flatRatePct}% of your takings including VAT. VAT on purchases is not reclaimed.` };

    render(main, h`<div class="page"><header class="page-head"><div><h1>VAT and expenses</h1>
      <p class="sub">${s.registered ? `${Labels.vatSchemes[s.scheme] || 'Scheme not set'}. ${schemeNote[s.scheme] || ''}` : 'You are not VAT registered. Keep logging expenses: they count towards your Income Tax.'}</p></div>
      ${s.registered && s.periods && s.periods.length ? h`<div class="actions"><label class="inline-label">Quarter <select id="period">${options(s.periods.map((p, i) => [i, `${date(p.start)} to ${date(p.end)}`]), s.index)}</select></label></div>` : ''}</header>
      ${s.registered && s.period ? h`<div class="vat-grid"><section class="section"><div class="section-head"><h2>VAT return, due ${date(s.period.due)}</h2></div>
        <table class="table boxes"><tbody>${BOXES.map(([k, label], i) => h`<tr class="${k === 'box5' ? 'grand' : ''}"><td class="box-n">${i + 1}</td><td>${label}</td><td class="num">${boxValue(k, s.boxes[k])}</td></tr>`)}</tbody></table>
        <p class="${s.direction === 'pay' ? '' : 'good'}"><b>${s.direction === 'pay' ? `${money(s.boxes.box5)} to pay HMRC` : `${money(s.boxes.box5)} to reclaim from HMRC`}</b> for this quarter so far.</p>
        <div class="actions"><button class="btn" data-export-boxes>Export return for bridging software</button><button class="btn" data-export-records>Export digital records</button></div>
        <p class="hint">Bridging software sends these figures to HMRC. Import the export file into it rather than retyping the numbers.</p></section>
        <section class="section"><div class="section-head"><h2>Sales this quarter</h2></div>
        ${s.salesRecords.length ? h`<table class="table compact"><thead><tr><th>Date</th><th>Invoice</th><th>Counted on</th><th class="num">Net</th><th class="num">VAT</th></tr></thead><tbody>${s.salesRecords.map(r => h`<tr><td>${date(r.date)}</td><td>${r.ref}</td><td class="muted">${r.basis}</td><td class="num">${money(r.net)}</td><td class="num">${money(r.vat)}</td></tr>`)}</tbody></table>` : h`<p class="muted">No sales in this quarter yet.</p>`}</section></div>`
        : s.registered ? h`<p class="callout">Add the date your VAT registration took effect in Settings, under VAT.</p>` : ''}
      <section class="section"><div class="section-head"><h2>Expenses${s.period ? ' this quarter' : ''}</h2></div>
        <form class="var-form" id="exp-form" novalidate>
          <input type="date" name="date" value="${UI.today()}" aria-label="Date paid">
          <input name="payee" placeholder="Paid to, e.g. Wolseley" aria-label="Paid to" list="payees">
          <datalist id="payees">${(b.suppliers || []).map(x => h`<option value="${x}">`)}</datalist>
          <input name="description" placeholder="What for" aria-label="What for">
          <select name="category" aria-label="Category">${options(pairsOf(Labels.expenseCategories), 'materials')}</select>
          <input name="net" placeholder="Net £" class="w-money" aria-label="Amount before VAT" inputmode="decimal">
          ${b.vat_registered ? h`<input name="vat" placeholder="VAT £" class="w-money" aria-label="VAT" inputmode="decimal">` : ''}
          <select name="job_id" aria-label="Job"><option value="">No job</option>${jobs.map(j => h`<option value="${j.id}">${j.ref} ${j.title}</option>`)}</select>
          <button class="btn" type="submit">Add expense</button></form>
        ${expenses.length ? h`<table class="table compact"><thead><tr><th>Date</th><th>Paid to</th><th>What for</th><th>Category</th><th>Job</th><th class="num">Net</th>${b.vat_registered ? h`<th class="num">VAT</th>` : ''}<th></th></tr></thead><tbody>
          ${expenses.map(e => h`<tr><td>${date(e.date)}</td><td>${e.payee}</td><td>${e.description || ''}</td><td>${Labels.expenseCategories[e.category]}</td><td>${e.job_ref ? h`<a href="#/jobs/${e.job_id}">${e.job_ref}</a>` : ''}</td><td class="num">${money(e.net)}</td>${b.vat_registered ? h`<td class="num">${money(e.vat)}</td>` : ''}<td class="num"><button class="link-btn" data-del-exp="${e.id}">Delete</button></td></tr>`)}</tbody></table>`
          : h`<p class="muted">No expenses${s.period ? ' in this quarter' : ''} yet.</p>`}
      </section></div>`);

    const per = main.querySelector('#period');
    if (per) per.addEventListener('change', () => App.go(`#/vat?period=${per.value}`));
    const ef = main.querySelector('#exp-form');
    const netIn = ef.querySelector('[name=net]'), vatIn = ef.querySelector('[name=vat]');
    if (vatIn && b.vat_scheme !== 'flat') netIn.addEventListener('change', () => { if (!vatIn.value && netIn.value) vatIn.value = (parseMoney(netIn.value) * 0.2 / 100).toFixed(2); });
    ef.addEventListener('submit', async e => {
      e.preventDefault();
      try {
        const d = formData(ef);
        const net = parseMoney(d.net), vat = parseMoney(d.vat || '0');
        if (Number.isNaN(net) || Number.isNaN(vat)) throw new Error('Check the amounts.');
        await api('saveExpense', { ...d, net, vat, job_id: d.job_id ? Number(d.job_id) : null });
        toast('Expense added'); App.reload();
      } catch (ex) { toast(ex.message, 'error'); }
    });
    main.querySelectorAll('[data-del-exp]').forEach(btn => btn.addEventListener('click', async () => { await api('deleteExpense', Number(btn.dataset.delExp)); toast('Expense deleted'); App.reload(); }));
    const ex1 = main.querySelector('[data-export-boxes]');
    if (ex1) ex1.addEventListener('click', async () => {
      const rows = [['VAT number', b.vat_number], ['Period start', s.period.start], ['Period end', s.period.end], [], ['Box', 'Description', 'Value']];
      BOXES.forEach(([k, label], i) => rows.push([i + 1, label, (['box6', 'box7', 'box8', 'box9'].includes(k) ? s.boxes[k] / 100 : s.boxes[k] / 100).toFixed(['box6', 'box7', 'box8', 'box9'].includes(k) ? 0 : 2)]));
      const r = await window.tpms.saveText(`VAT return ${s.period.start} to ${s.period.end}.csv`, csv(rows));
      if (r.ok) toast('Return exported');
    });
    const ex2 = main.querySelector('[data-export-records]');
    if (ex2) ex2.addEventListener('click', async () => {
      const rows = [['Type', 'Date', 'Reference', 'Counterparty or basis', 'Net', 'VAT']];
      s.salesRecords.forEach(r => rows.push(['Sale', r.date, r.ref, r.basis, (r.net / 100).toFixed(2), (r.vat / 100).toFixed(2)]));
      s.purchaseRecords.forEach(p => rows.push(['Purchase', p.date, `EXP-${p.id}`, p.payee, (p.net / 100).toFixed(2), (p.vat / 100).toFixed(2)]));
      const r = await window.tpms.saveText(`VAT records ${s.period.start} to ${s.period.end}.csv`, csv(rows));
      if (r.ok) toast('Records exported');
    });
  };
})();
