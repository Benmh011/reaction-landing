'use strict';
window.Views = window.Views || {};
(() => {
  const { h, raw, render, api, options, pairsOf, toast, modal, money, date, addr } = UI;
  const F = (...a) => Views.field(...a);
  const S = (...a) => Views.select(...a);

  // ---------- shared modals (also used from Jobs and Certificates) ----------
  async function editClient(c = {}) {
    return modal({
      title: c.id ? 'Edit client' : 'New client', confirm: c.id ? 'Save client' : 'Add client', wide: true,
      body: h`<div class="grid2">${F('Name', 'name', c.name, { required: true })}${S('Type', 'type', pairsOf(Labels.clientTypes), c.type || 'homeowner', { blank: undefined })}</div>
        <div class="grid2">${F('Phone', 'phone', c.phone, { type: 'tel' })}${F('Email', 'email', c.email, { type: 'email' })}</div>
        ${F('Billing address', 'address_line1', c.address_line1)}${F('Address line 2', 'address_line2', c.address_line2)}
        <div class="grid2">${F('Town', 'town', c.town)}${F('Postcode', 'postcode', c.postcode)}</div>
        <details class="more"${c.vat_registered || c.cis_contractor ? raw(' open') : ''}><summary>VAT and CIS (business customers)</summary>
          <label class="check"><input type="checkbox" name="vat_registered"${c.vat_registered ? raw(' checked') : ''}> VAT registered</label>
          <label class="check"><input type="checkbox" name="cis_contractor"${c.cis_contractor ? raw(' checked') : ''}> CIS contractor (you work for them as a subcontractor)</label>
          <label class="check"><input type="checkbox" name="end_user_notice"${c.end_user_notice ? raw(' checked') : ''}> They have told you in writing they are the end user</label>
          <p class="hint">When the first two are ticked and the third is not, invoices use the construction reverse charge and show no VAT.</p>
        </details>
        ${F('Notes', 'notes', c.notes, { textarea: true, rows: 2 })}`,
      onConfirm: d => api('saveClient', { ...d, id: c.id }),
    });
  }
  async function editProperty(clientId, p = {}, client) {
    return modal({
      title: p.id ? 'Edit property' : 'Add property', confirm: p.id ? 'Save property' : 'Add property', wide: true,
      body: h`${!p.id && client && client.address_line1 ? h`<button type="button" class="link-btn" data-copy-addr>Same as the billing address</button>` : ''}
        ${F('Address', 'address_line1', p.address_line1, { required: true })}${F('Address line 2', 'address_line2', p.address_line2)}
        <div class="grid2">${F('Town', 'town', p.town)}${F('Postcode', 'postcode', p.postcode, { required: true })}</div>
        ${S('Who lives there', 'tenure', pairsOf(Labels.tenures), p.tenure || 'owner_occupied', { blank: undefined, hint: 'Rented homes need a landlord gas safety record every year.' })}
        <div class="grid3">${F('Occupier name', 'occupier_name', p.occupier_name)}${F('Occupier phone', 'occupier_phone', p.occupier_phone, { type: 'tel' })}${F('Occupier email', 'occupier_email', p.occupier_email, { type: 'email' })}</div>`,
      onMount: form => {
        const b = form.querySelector('[data-copy-addr]');
        if (b) b.addEventListener('click', () => { for (const k of ['address_line1', 'address_line2', 'town', 'postcode']) form.querySelector(`[name=${k}]`).value = client[k] || ''; });
      },
      onConfirm: d => api('saveProperty', { ...d, id: p.id, client_id: clientId }),
    });
  }
  async function editAsset(propertyId, a = {}) {
    const known = await api('knownAppliances');
    const makes = [...new Set([...known.map(k => k.make), ...Labels.makes])];
    return modal({
      title: a.id ? 'Edit appliance' : 'Add appliance', confirm: a.id ? 'Save appliance' : 'Add appliance', wide: true,
      body: h`<div class="grid2">${S('Appliance type', 'appliance_type', Labels.applianceTypes.map(x => [x, x]), a.appliance_type, { required: true })}${F('Location', 'location', a.location, { list: Labels.locations, placeholder: 'Pick or type' })}</div>
        <div class="grid2">${F('Make', 'make', a.make, { list: makes, placeholder: 'Pick or type' })}${F('Model', 'model', a.model, { list: [], placeholder: 'Pick or type' })}</div>
        <div class="grid3">${S('Flue type', 'flue_type', Labels.flueTypes, a.flue_type)}${F('Serial number', 'serial', a.serial)}${F('Installed', 'install_date', a.install_date, { type: 'date' })}</div>
        <label class="check"><input type="checkbox" name="landlord_owned"${a.landlord_owned === 0 ? '' : raw(' checked')}> Owned by the landlord (for rented homes)</label>`,
      onMount: form => {
        // Models offered are the ones already used for the make typed in.
        const make = form.querySelector('[name=make]'), dl = form.querySelector('#dl-model');
        const fill = () => { const m = make.value.trim().toLowerCase(); dl.innerHTML = known.filter(k => k.model && k.make.toLowerCase() === m).map(k => `<option value="${UI.esc(k.model)}">`).join(''); };
        make.addEventListener('input', fill); fill();
      },
      onConfirm: d => api('saveAsset', { ...d, id: a.id, property_id: propertyId }),
    });
  }
  async function newJob({ clientId, propertyId, title } = {}) {
    const clients = await api('listClients', '');
    if (!clients.length) { toast('Add a client first.', 'error'); return null; }
    let client = clientId ? await api('getClient', clientId) : null;
    const job = await modal({
      title: 'New job', confirm: 'Create job', wide: true,
      body: h`${S('Client', 'client_id', clients.map(c => [c.id, c.name]), clientId, { required: true })}
        <div class="field"><label for="f-property_id">Property</label><select id="f-property_id" name="property_id"></select></div>
        ${F('Job title', 'title', title || '', { required: true, list: Labels.jobTitles.map(j => j[0]), placeholder: 'Pick or type, e.g. Boiler service' })}`,
      onMount: form => {
        const csel = form.querySelector('[name=client_id]'), psel = form.querySelector('[name=property_id]');
        const fill = async () => {
          client = csel.value ? await api('getClient', Number(csel.value)) : null;
          psel.innerHTML = (client && client.properties.length ? client.properties.map(p => `<option value="${p.id}"${String(p.id) === String(propertyId) ? ' selected' : ''}>${UI.esc(addr(p))}</option>`).join('') : '<option value="">No property yet</option>');
        };
        csel.addEventListener('change', fill); fill();
      },
      onConfirm: d => api('createJob', { client_id: Number(d.client_id), property_id: d.property_id ? Number(d.property_id) : null, title: d.title }),
    });
    if (job) App.go(`#/jobs/${job.id}`);
    return job;
  }
  Object.assign(Views, { editClient, editProperty, editAsset, newJob });

  // ---------- list ----------
  Views.clients = async (main, _p, q) => {
    const list = await api('listClients', q.q || '');
    render(main, h`<div class="page"><header class="page-head"><div><h1>Clients</h1><p class="sub">${list.length} ${list.length === 1 ? 'client' : 'clients'}</p></div>
      <div class="actions"><input class="search" type="search" placeholder="Search name, postcode or email" value="${q.q || ''}"><button class="btn btn-primary" data-new>New client</button></div></header>
      ${list.length ? h`<table class="table"><thead><tr><th>Name</th><th>Type</th><th>Contact</th><th>Postcode</th><th class="num">Properties</th><th class="num">Jobs</th></tr></thead><tbody>
        ${list.map(c => h`<tr class="row-link" data-href="#/clients/${c.id}"><td><a href="#/clients/${c.id}">${c.name}</a></td><td>${Labels.clientTypes[c.type]}</td><td>${[c.phone, c.email].filter(Boolean).join(', ')}</td><td>${c.postcode || ''}</td><td class="num">${c.property_count}</td><td class="num">${c.job_count}</td></tr>`)}
        </tbody></table>` : h`<div class="empty"><h2>${q.q ? 'No clients match that search' : 'No clients yet'}</h2><p>${q.q ? 'Try a shorter search.' : 'Add your first client, then their properties and appliances.'}</p></div>`}</div>`);
    main.querySelector('[data-new]').addEventListener('click', async () => { const c = await editClient(); if (c) App.go(`#/clients/${c.id}`); });
    const s = main.querySelector('.search');
    s.addEventListener('keydown', e => { if (e.key === 'Enter') App.go('#/clients' + (s.value.trim() ? `?q=${encodeURIComponent(s.value.trim())}` : '')); });
    main.querySelectorAll('.row-link').forEach(r => r.addEventListener('click', e => { if (!e.target.closest('a')) App.go(r.dataset.href); }));
  };

  // ---------- detail ----------
  Views.client = async (main, [id]) => {
    const c = await api('getClient', Number(id));
    if (!c) return App.go('#/clients');
    const gas = App.hasTrade('gas');
    render(main, h`<div class="page"><p class="crumb"><a href="#/clients">Clients</a></p>
      <header class="page-head"><div><h1>${c.name}</h1><p class="sub">${[Labels.clientTypes[c.type], c.phone, c.email].filter(Boolean).join(', ')}</p></div>
        <div class="actions"><button class="btn" data-edit>Edit client</button><button class="btn btn-primary" data-job>New job</button></div></header>
      ${c.address_line1 ? h`<p class="muted">Billing address: ${addr(c)}</p>` : ''}
      ${c.vat_registered && c.cis_contractor && !c.end_user_notice ? h`<p class="callout">Invoices to this client use the construction reverse charge.</p>` : ''}
      <section class="section"><div class="section-head"><h2>Properties</h2><button class="btn btn-small" data-add-prop>Add property</button></div>
        ${c.properties.length ? c.properties.map(p => h`<div class="property">
          <div class="property-head"><div><b>${addr(p)}</b><div class="muted">${Labels.tenures[p.tenure]}${p.occupier_name ? `. Occupier: ${p.occupier_name}${p.occupier_phone ? `, ${p.occupier_phone}` : ''}` : ''}</div></div>
            <div class="actions"><button class="btn btn-small btn-quiet" data-edit-prop="${p.id}">Edit</button><button class="btn btn-small" data-job-prop="${p.id}">New job here</button></div></div>
          ${gas ? h`<table class="table compact"><thead><tr><th>Appliance</th><th>Make and model</th><th>Location</th><th>Flue</th><th>Installed</th><th></th></tr></thead><tbody>
            ${p.assets.length ? p.assets.map(a => h`<tr><td>${a.appliance_type}</td><td>${[a.make, a.model].filter(Boolean).join(' ') || '–'}</td><td>${a.location || '–'}</td><td>${Labels.opt(Labels.flueTypes, a.flue_type) || '–'}</td><td>${date(a.install_date)}</td><td class="num"><button class="link-btn" data-edit-asset="${a.id}" data-prop="${p.id}">Edit</button></td></tr>`)
            : h`<tr><td colspan="6" class="muted">No appliances recorded.</td></tr>`}</tbody></table>
            <button class="link-btn" data-add-asset="${p.id}">Add appliance</button>` : ''}
        </div>`) : h`<p class="muted">No properties yet. Add the address where the work happens.</p>`}
      </section>
      <section class="section"><div class="section-head"><h2>Jobs</h2></div>
        ${c.jobs.length ? h`<table class="table"><thead><tr><th>Job</th><th>Title</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>
          ${c.jobs.map(j => h`<tr><td><a href="#/jobs/${j.id}">${j.ref}</a></td><td>${j.title}</td><td>${UI.jobPill(j.status)}</td><td class="num">${j.total.accepted === null ? '–' : money(j.total.total)}</td></tr>`)}</tbody></table>`
        : h`<p class="muted">No jobs yet.</p>`}</section>
      ${gas ? h`<section class="section"><div class="section-head"><h2>Certificates</h2></div>
        ${c.certificates.length ? h`<table class="table"><thead><tr><th>Number</th><th>Type</th><th>Issued</th><th>Next due</th></tr></thead><tbody>
          ${c.certificates.map(x => h`<tr><td><a href="#/certificates/${x.id}">${x.number}</a></td><td>${Labels.certTypes[x.type]}</td><td>${date(x.issue_date)}</td><td>${date(x.next_due)}</td></tr>`)}</tbody></table>`
        : h`<p class="muted">No certificates yet. Issue them from a job.</p>`}</section>` : ''}
      </div>`);
    const on = (sel, fn) => main.querySelectorAll(sel).forEach(el => el.addEventListener('click', () => fn(el)));
    on('[data-edit]', async () => { if (await editClient(c)) App.reload(); });
    on('[data-job]', () => newJob({ clientId: c.id, propertyId: c.properties[0]?.id }));
    on('[data-add-prop]', async () => { if (await editProperty(c.id, {}, c)) App.reload(); });
    on('[data-edit-prop]', async el => { if (await editProperty(c.id, c.properties.find(p => p.id === Number(el.dataset.editProp)), c)) App.reload(); });
    on('[data-job-prop]', el => newJob({ clientId: c.id, propertyId: Number(el.dataset.jobProp) }));
    on('[data-add-asset]', async el => { if (await editAsset(Number(el.dataset.addAsset))) App.reload(); });
    on('[data-edit-asset]', async el => {
      const p = c.properties.find(x => x.id === Number(el.dataset.prop));
      if (await editAsset(p.id, p.assets.find(a => a.id === Number(el.dataset.editAsset)))) App.reload();
    });
  };
})();
