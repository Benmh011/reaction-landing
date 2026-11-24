'use strict';
window.Views = window.Views || {};
(() => {
  const { h, render, api, pairsOf, toast, modal, money, moneyInput, parseMoney, date, addr, options, formData, csv } = UI;
  const F = (...a) => Views.field(...a);
  const S = (...a) => Views.select(...a);

  // ---------- Today ----------
  Views.dashboard = async (main) => {
    const d = await api('dashboard');
    const b = App.state.business;
    const gas = App.hasTrade('gas');
    const overdue = d.due.filter(x => x.bucket === 'overdue').length;
    const soon = d.due.filter(x => x.bucket !== 'overdue').length;
    const owed = d.unpaid.reduce((s, i) => s + i.balance, 0);
    const greeting = (() => { const hr = new Date().getHours(); return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'; })();
    render(main, h`<div class="page"><header class="page-head"><div><h1>${greeting}${b.engineer_name ? `, ${b.engineer_name.split(' ')[0]}` : ''}</h1><p class="sub">${date(UI.today())}</p></div>
      <div class="actions"><button class="btn" data-new-client>New client</button><button class="btn btn-primary" data-new-job>New job</button></div></header>
      <div class="tiles">
        ${gas ? h`<a class="tile ${overdue ? 'tile-bad' : ''}" href="#/reminders"><span class="tile-n">${overdue}</span><span>overdue checks and services</span></a>
        <a class="tile" href="#/reminders"><span class="tile-n">${soon}</span><span>due in the next 60 days</span></a>` : ''}
        <a class="tile" href="#/jobs?show=estimating"><span class="tile-n">${d.awaitingAcceptance.length}</span><span>estimates waiting for an answer</span></a>
        <a class="tile" href="#/invoices"><span class="tile-n">${money(owed)}</span><span>owed on ${d.unpaid.length} ${d.unpaid.length === 1 ? 'invoice' : 'invoices'}</span></a>
      </div>
      <div class="two-col">
        <div>
          ${gas && d.due.length ? h`<section class="section"><div class="section-head"><h2>Coming up</h2><a href="#/reminders">All reminders</a></div><ul class="list">
            ${d.due.slice(0, 6).map(x => h`<li><span class="${x.bucket === 'overdue' ? 'bad' : ''}">${date(x.next_due)}</span><span><b>${x.kind}</b><br><span class="muted">${x.client_name}, ${x.address_line1}</span></span></li>`)}</ul></section>` : ''}
          ${d.toInvoice.length ? h`<section class="section"><div class="section-head"><h2>Ready to invoice</h2></div><ul class="list">
            ${d.toInvoice.map(j => h`<li><a href="#/jobs/${j.id}" class="ref">${j.ref}</a><span><b>${j.title}</b><br><span class="muted">${j.client_name}, ${money(j.totals.total)}${j.totals.pendingExtras ? `, ${money(j.totals.pendingExtras)} of extras waiting for approval` : ''}</span></span></li>`)}</ul></section>` : ''}
          ${d.awaitingAcceptance.length ? h`<section class="section"><div class="section-head"><h2>Estimates waiting</h2></div><ul class="list">
            ${d.awaitingAcceptance.map(j => h`<li><a href="#/jobs/${j.id}" class="ref">${j.ref}</a><span><b>${j.title}</b><br><span class="muted">${j.client_name}, version ${j.latest_revision ? j.latest_revision.number : 1}, ${UI.esc(Labels.jobStatus[j.status]).toLowerCase()}</span></span></li>`)}</ul></section>` : ''}
          ${!d.due.length && !d.toInvoice.length && !d.awaitingAcceptance.length ? h`<div class="empty"><h2>Nothing waiting</h2><p>Add a client, then start a job to price it.</p></div>` : ''}
        </div>
        <div>
          <section class="section deadlines"><div class="section-head"><h2>Tax deadlines</h2></div>
            ${d.vat ? h`<div class="deadline"><div><b>VAT return</b><div class="muted">${date(d.vat.period.start)} to ${date(d.vat.period.end)}, due ${date(d.vat.period.due)}</div></div><div class="num"><b>${money(d.vat.boxes.box5)}</b><div class="muted">${d.vat.direction === 'pay' ? 'to pay so far' : 'to reclaim so far'}</div></div></div>`
              : h`<div class="deadline"><div><b>VAT</b><div class="muted">${b.vat_registered ? 'Add your VAT registration date in Settings.' : 'Not VAT registered.'}</div></div></div>`}
            ${d.mtd ? h`<div class="deadline"><div><b>Income Tax quarterly update</b><div class="muted">${date(d.mtd.start)} to ${date(d.mtd.end)}, due ${date(d.mtd.due)}</div></div></div>`
              : d.mtdInfo && d.mtdInfo.status !== 'not_applicable' ? h`<div class="deadline"><div><b>Income Tax</b><div class="muted">${d.mtdInfo.text}</div></div></div>` : ''}
          </section>
          ${d.notifications.length ? h`<section class="section"><div class="section-head"><h2>Gas Safe notifications</h2></div><ul class="list">
            ${d.notifications.map(n => h`<li><span class="${n.days_left < 7 ? 'bad' : ''}">${date(n.deadline)}</span><span><a href="#/certificates/${n.id}">${n.number}</a><br><span class="muted">${n.client_name}, ${n.address_line1}</span></span></li>`)}</ul></section>` : ''}
          ${d.unpaid.length ? h`<section class="section"><div class="section-head"><h2>Unpaid invoices</h2><a href="#/invoices">All invoices</a></div><ul class="list">
            ${d.unpaid.slice(0, 6).map(i => h`<li><a href="#/invoices/${i.id}" class="ref">${i.number}</a><span><b>${money(i.balance)}</b> from ${i.client_name}<br><span class="muted ${i.overdue ? 'bad' : ''}">${i.overdue ? 'Overdue since' : 'Due'} ${date(i.due_date)}</span></span></li>`)}</ul></section>` : ''}
        </div>
      </div></div>`);
    main.querySelector('[data-new-client]').addEventListener('click', async () => { const c = await Views.editClient(); if (c) App.go(`#/clients/${c.id}`); });
    main.querySelector('[data-new-job]').addEventListener('click', () => Views.newJob());
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
