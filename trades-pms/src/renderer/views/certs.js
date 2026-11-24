'use strict';
window.Views = window.Views || {};
(() => {
  const { h, raw, render, api, options, pairsOf, toast, modal, date, addr, sigField, mountSig, formData, esc } = UI;
  const F = (...a) => Views.field(...a);
  const S = (...a) => Views.select(...a);
  const YN = [['yes', 'Yes'], ['no', 'No']];

  const selectCell = (name, opts, value, label) => h`<label class="mini"><span>${label}</span><select name="${name}">${options(opts, value, '–')}</select></label>`;
  const inputCell = (name, value, label, type = 'text', list = '') => h`<label class="mini"><span>${label}</span><input name="${name}" value="${value ?? ''}" ${type === 'number' ? raw('inputmode="decimal"') : ''}${list ? raw(` list="${esc(list)}" autocomplete="off"`) : ''}></label>`;
  // CO/CO2 ratio is worked out from the two readings next to it, never typed.
  const ratioCell = (name, coName, co2Name, label) => h`<label class="mini"><span>${label}</span><input name="${name}" class="calc" readonly tabindex="-1" data-co="${coName}" data-co2="${co2Name}" placeholder="Worked out"></label>`;
  function mountRatios(form) {
    const update = () => form.querySelectorAll('input[data-co]').forEach(r => {
      const co = form.querySelector(`[name="${r.dataset.co}"]`), co2 = form.querySelector(`[name="${r.dataset.co2}"]`);
      r.value = co && co2 ? Labels.coRatio(co.value.trim(), co2.value.trim()) : '';
    });
    form.addEventListener('input', update); update();
  }
  // Tick-in phrases under a free-text box: each click adds the phrase on its own line.
  const chips = (target, phrases) => h`<div class="chips" data-chips-for="${target}">${phrases.map(p => h`<button type="button" class="chip" data-phrase="${p}">${p}</button>`)}</div>`;
  function mountChips(form) {
    form.addEventListener('click', e => {
      const c = e.target.closest('.chip'); if (!c) return;
      const box = form.querySelector(`textarea[name="${c.parentElement.dataset.chipsFor}"]`);
      const lines = box.value.split('\n').map(x => x.trim()).filter(Boolean);
      if (!lines.includes(c.dataset.phrase)) { lines.push(c.dataset.phrase); box.value = lines.join('\n'); }
      c.classList.add('used');
    });
  }
  const checks = (group, list, values = {}) => h`<div class="tick-grid">${list.map(c => h`<label class="check"><input type="checkbox" name="${group}.${c.key}"${values[c.key] ? raw(' checked') : ''}> ${c.label}</label>`)}</div>`;
  const readChecks = (d, group) => Object.fromEntries(Object.entries(d).filter(([k]) => k.startsWith(group + '.')).map(([k, v]) => [k.slice(group.length + 1), v]));

  function applianceCard(i, a = {}) {
    const fields = Labels.lgsrApplianceFields;
    return h`<fieldset class="appliance" data-app="${i}"><legend>Appliance ${i + 1}</legend><button type="button" class="icon-btn remove-app" data-remove-app="${i}" aria-label="Remove appliance">×</button>
      <div class="mini-grid">${fields.map(f => {
        const name = `app${i}.${f.key}`;
        if (f.type === 'appliance') return selectCell(name, Labels.applianceTypes.map(x => [x, x]), a[f.key], f.label);
        if (f.type === 'flue') return selectCell(name, Labels.flueTypes, a[f.key], f.label);
        if (f.type === 'select') return selectCell(name, f.options, a[f.key] ?? (f.key === 'landlord_owned' ? 'yes' : ''), f.label);
        if (f.type === 'ratio') return ratioCell(name, `app${i}.co_ppm`, `app${i}.co2_pct`, `${f.label} (worked out)`);
        const list = { location: 'dl-locations', make: 'dl-makes', model: 'dl-models' }[f.key] || '';
        return inputCell(name, a[f.key], f.label, f.type, list);
      })}</div></fieldset>`;
  }

  function applianceSelect(property, value) {
    const pairs = property.assets.map(a => [a.id, [a.appliance_type, [a.make, a.model].filter(Boolean).join(' '), a.location].filter(Boolean).join(', ')]);
    return h`<div class="field"><label for="f-asset_id">Appliance <span class="req">required</span></label><select id="f-asset_id" name="asset_id">${options([...pairs, ['new', 'Another appliance (add it to this property)']], value || (pairs[0] ? pairs[0][0] : 'new'))}</select></div>
      <div class="new-asset" hidden><div class="grid3">${S('Appliance type', 'new.appliance_type', Labels.applianceTypes.map(x => [x, x]), '')}${F('Make', 'new.make', '', { list: Labels.makes })}${F('Model', 'new.model', '')}</div>
      <div class="grid3">${F('Location', 'new.location', '', { list: Labels.locations })}${S('Flue type', 'new.flue_type', Labels.flueTypes, '')}${F('Serial number', 'new.serial', '')}</div></div>`;
  }
  function mountApplianceSelect(form) {
    const sel = form.querySelector('[name=asset_id]');
    if (!sel) return;
    const sync = () => { form.querySelector('.new-asset').hidden = sel.value !== 'new'; };
    sel.addEventListener('change', sync); sync();
  }
  async function resolveAsset(d, property) {
    if (d.asset_id && d.asset_id !== 'new') return property.assets.find(a => a.id === Number(d.asset_id));
    const n = readChecks(d, 'new');
    if (!n.appliance_type) throw new Error('Pick the appliance type for the new appliance.');
    return api('saveAsset', { ...n, property_id: property.id });
  }

  const receivedBlock = (b, label = 'Received by (optional)') => h`<div class="grid2">${F(label, 'received_by', b)}<div></div></div>${sigField('recv-sig', 'Their signature (optional)')}`;
  // Engineers come from Settings; their licence card number follows the engineer picked.
  const engineers = b => [{ name: b.engineer_name || '', licence: b.engineer_licence || '' }].filter(x => x.name);
  const engineerBlock = b => h`<div class="grid2">${S('Engineer', 'engineer_name', engineers(b).map(x => [x.name, x.name]), engineers(b)[0] ? engineers(b)[0].name : '', engineers(b).length ? { blank: undefined } : { blank: 'Add your name in Settings first' })}
    ${F('Gas Safe licence card number', 'engineer_licence', engineers(b)[0] ? engineers(b)[0].licence : '', { readonly: true, hint: 'From Settings, under Gas and heating.' })}</div>${sigField('eng-sig', 'Engineer signature')}`;

  const FORMS = {
    lgsr: {
      body: ({ client, property, business, warnings }) => h`
        <section class="form-section"><h2>Landlord or agent</h2>
          <div class="grid2">${F('Name', 'landlord_name', client.name)}${F('Phone or email', 'landlord_contact', [client.phone, client.email].filter(Boolean).join(', '))}</div>
          ${F('Address', 'landlord_address', [client.address_line1, client.address_line2, client.town, client.postcode].filter(Boolean).join('\n'), { textarea: true, rows: 3 })}
          ${F('Tenant or occupier', 'occupier_name', property.occupier_name)}</section>
        <section class="form-section"><div class="section-head"><h2>Appliances</h2><button type="button" class="btn btn-small" data-add-app>Add appliance</button></div>
          <div id="appliances">${(property.assets.length ? property.assets : [{}]).map((a, i) => applianceCard(i, { location: a.location, appliance_type: a.appliance_type, make: a.make, model: a.model, flue_type: a.flue_type, landlord_owned: a.landlord_owned === 0 ? 'no' : 'yes', inspected: 'yes' }))}</div></section>
        <section class="form-section"><h2>Installation</h2><div class="mini-grid">${Labels.lgsrInstallationChecks.map(c => selectCell(`inst.${c.key}`, c.options, '', c.label))}</div></section>
        <section class="form-section"><h2>Defects and remedial action</h2>
          <div class="grid2"><div>${F('Defects identified', 'defects', '', { textarea: true })}${chips('defects', Labels.defectPhrases)}</div>
            <div>${F('Remedial action taken', 'remedial', '', { textarea: true })}${chips('remedial', Labels.remedialPhrases)}</div></div>
          <div class="grid2">${S('Gas warning notice issued', 'warning_issued', YN, 'no', { blank: undefined })}
            ${S('Warning notice', 'warning_number', warnings.map(w => [w.number, `${w.number}, issued ${date(w.issue_date)}`]), '', { blank: warnings.length ? 'Not issued yet' : 'None for this property yet', hint: 'Issue the notice after this record if it is not listed.' })}</div>
          <p class="callout danger" id="unsafe-note" hidden>An appliance is marked not safe to use. Issue a gas warning notice for it after saving this record.</p></section>`,
      mount: form => {
        mountRatios(form); mountChips(form);
        const wrap = form.querySelector('#appliances');
        const count = () => wrap.querySelectorAll('.appliance').length;
        form.querySelector('[data-add-app]').addEventListener('click', () => { wrap.insertAdjacentHTML('beforeend', applianceCard(count(), { inspected: 'yes' }).s); });
        wrap.addEventListener('click', e => { const b = e.target.closest('[data-remove-app]'); if (b && count() > 1) b.closest('.appliance').remove(); });
        form.addEventListener('change', () => { form.querySelector('#unsafe-note').hidden = !form.querySelector('select[name$=".safe_to_use"] option[value="no"]:checked'); });
      },
      read: (d, form) => {
        const appliances = [...form.querySelectorAll('.appliance')].map(fs => Object.fromEntries(Labels.lgsrApplianceFields.map(f => [f.key, fs.querySelector(`[name$=".${f.key}"]`).value.trim()])));
        if (appliances.some(a => !a.appliance_type)) throw new Error('Pick the type for every appliance.');
        if (appliances.some(a => !a.safe_to_use)) throw new Error('Say whether every appliance is safe to use.');
        const installation = readChecks(d, 'inst');
        if (!installation.tightness) throw new Error('Record the gas tightness test result.');
        return { data: { landlord_name: d.landlord_name, landlord_contact: d.landlord_contact, landlord_address: d.landlord_address, occupier_name: d.occupier_name, appliances, installation, defects: d.defects, remedial: d.remedial, warning_issued: d.warning_issued, warning_number: d.warning_number } };
      },
    },
    service: {
      body: ({ property, business }) => h`<section class="form-section"><h2>Appliance</h2>${applianceSelect(property)}</section>
        <section class="form-section"><h2>Work carried out</h2>${checks('chk', Labels.serviceChecks)}</section>
        <section class="form-section"><h2>Readings</h2><div class="mini-grid">${inputCell('operating_pressure', '', 'Operating pressure (mbar)', 'number')}${inputCell('heat_input', '', 'Heat input (kW)', 'number')}${inputCell('co_ppm', '', 'CO (ppm)', 'number')}${inputCell('co2_pct', '', 'CO₂ (%)', 'number')}${ratioCell('ratio', 'co_ppm', 'co2_pct', 'CO/CO₂ ratio (worked out)')}${selectCell('safe_to_use', YN, '', 'Safe to use')}</div></section>
        <section class="form-section"><h2>Parts and notes</h2><div class="grid2"><div>${F('Parts fitted', 'parts', '', { textarea: true })}${chips('parts', parts(business))}</div>${F('Notes', 'notes', '', { textarea: true })}</div></section>`,
      mount: form => { mountApplianceSelect(form); mountRatios(form); mountChips(form); },
      read: async (d, _f, ctx) => {
        if (!d.safe_to_use) throw new Error('Say whether the appliance is safe to use.');
        const asset = await resolveAsset(d, ctx.property);
        return { asset_id: asset.id, data: { appliance: snapshot(asset), checks: readChecks(d, 'chk'), operating_pressure: d.operating_pressure, heat_input: d.heat_input, co_ppm: d.co_ppm, co2_pct: d.co2_pct, ratio: d.ratio, safe_to_use: d.safe_to_use, parts: d.parts, notes: d.notes } };
      },
    },
    warning: {
      body: ({ property, client }) => h`<section class="form-section"><h2>Appliance or installation</h2>${applianceSelect(property)}</section>
        <section class="form-section"><h2>Classification</h2><fieldset class="field radios"><legend>How serious is it? <span class="req">required</span></legend>
          <label class="radio-card danger-card"><input type="radio" name="classification" value="ID"><span><b>Immediately Dangerous</b><small>Disconnect it now. It must not be used.</small></span></label>
          <label class="radio-card"><input type="radio" name="classification" value="AR"><span><b>At Risk</b><small>Turn it off. It should not be used until put right.</small></span></label></fieldset>
          ${F('Fault found', 'fault', '', { textarea: true, rows: 3 })}<div id="fault-chips"><p class="hint">Pick how serious it is to see common faults.</p></div></section>
        <section class="form-section"><h2>Action taken</h2>${checks('act', Labels.warningActions)}</section>
        <section class="form-section"><h2>Responsible person</h2><div class="grid2">${F('Name', 'landlord_name', client.name)}${F('Phone or email', 'landlord_contact', [client.phone, client.email].filter(Boolean).join(', '))}</div>
          <label class="check"><input type="checkbox" name="customer_refused_sign"> Customer declined to sign</label></section>`,
      mount: form => {
        mountApplianceSelect(form); mountChips(form);
        form.querySelectorAll('[name=classification]').forEach(r => r.addEventListener('change', () => UI.render(form.querySelector('#fault-chips'), chips('fault', Labels.faultPhrases[r.value]))));
      },
      read: async (d, _f, ctx) => {
        if (!d.classification) throw new Error('Pick Immediately Dangerous or At Risk.');
        if (!d.fault) throw new Error('Describe the fault found.');
        const asset = await resolveAsset(d, ctx.property);
        return { asset_id: asset.id, data: { appliance: snapshot(asset), classification: d.classification, fault: d.fault, actions: readChecks(d, 'act'), landlord_name: d.landlord_name, landlord_contact: d.landlord_contact, customer_refused_sign: d.customer_refused_sign } };
      },
    },
    commissioning: {
      body: ({ property }) => h`<section class="form-section"><h2>Appliance</h2>${applianceSelect(property)}</section>
        <section class="form-section"><h2>Readings</h2><div class="mini-grid">${inputCell('gas_rate', '', 'Gas rate (kW)', 'number')}${inputCell('burner_pressure', '', 'Burner pressure (mbar)', 'number')}${inputCell('flow_temp', '', 'Heating flow (°C)', 'number')}${inputCell('hw_temp', '', 'Hot water (°C)', 'number')}</div>
          <div class="mini-grid">${inputCell('max_co', '', 'Max rate CO (ppm)', 'number')}${inputCell('max_co2', '', 'Max rate CO₂ (%)', 'number')}${ratioCell('max_ratio', 'max_co', 'max_co2', 'Max rate ratio (worked out)')}${inputCell('min_co', '', 'Min rate CO (ppm)', 'number')}${inputCell('min_co2', '', 'Min rate CO₂ (%)', 'number')}${ratioCell('min_ratio', 'min_co', 'min_co2', 'Min rate ratio (worked out)')}</div></section>
        <section class="form-section"><h2>Controls fitted</h2>${checks('ctl', Labels.commissioningControls)}</section>
        <section class="form-section"><h2>Water treatment</h2>${checks('wtr', Labels.waterTreatment)}</section>
        <section class="form-section"><h2>Gas Safe notification</h2><p class="hint">Notify the installation within 30 days. You can add the reference later from the record.</p>
          <div class="grid2">${F('Notification reference', 'notification_ref', '')}${F('Date notified', 'notification_date', '', { type: 'date' })}</div></section>`,
      mount: form => { mountApplianceSelect(form); mountRatios(form); },
      read: async (d, _f, ctx) => {
        const asset = await resolveAsset(d, ctx.property);
        return { asset_id: asset.id, data: { appliance: snapshot(asset), gas_rate: d.gas_rate, burner_pressure: d.burner_pressure, flow_temp: d.flow_temp, hw_temp: d.hw_temp,
          readings: { max_co: d.max_co, max_co2: d.max_co2, max_ratio: d.max_ratio, min_co: d.min_co, min_co2: d.min_co2, min_ratio: d.min_ratio },
          controls: readChecks(d, 'ctl'), water: readChecks(d, 'wtr'), notification_ref: d.notification_ref, notification_date: d.notification_date } };
      },
    },
  };
  const parts = b => (b.price_list || Labels.defaultPriceList).filter(i => i.kind === 'material').map(i => i.description);
  const snapshot = a => ({ appliance_type: a.appliance_type, make: a.make, model: a.model, location: a.location, flue_type: a.flue_type, serial: a.serial });

  Views.certNew = async (main, [type], q) => {
    if (!FORMS[type]) return App.go('#/certificates');
    const business = App.state.business;
    let job = null, client, property;
    if (q.job) { job = await api('getJob', Number(q.job)); client = job.client; property = job.property; }
    else if (q.property) { property = await api('getProperty', Number(q.property)); client = await api('getClient', property.client_id); }
    if (!property) return render(main, h`<div class="page"><div class="empty"><h2>Pick a job first</h2><p>Certificates are issued from a job, so they are linked to the client and property.</p><a class="btn" href="#/jobs">Go to jobs</a></div></div>`);
    const [warnings, known] = await Promise.all([api('listWarningNotices', property.id), api('knownAppliances')]);
    const ctx = { job, client, property, business, warnings };
    const lists = h`<datalist id="dl-locations">${Labels.locations.map(x => h`<option value="${x}">`)}</datalist>
      <datalist id="dl-makes">${[...new Set([...known.map(k => k.make), ...Labels.makes])].map(x => h`<option value="${x}">`)}</datalist>
      <datalist id="dl-models">${[...new Set(known.map(k => k.model).filter(Boolean))].map(x => h`<option value="${x}">`)}</datalist>`;
    const def = FORMS[type];
    render(main, h`<div class="page cert-form"><p class="crumb">${job ? h`<a href="#/jobs/${job.id}">${job.ref}</a>` : h`<a href="#/clients/${client.id}">${client.name}</a>`}</p>
      <header class="page-head"><div><h1>${Labels.certTypes[type]}</h1><p class="sub">${addr(property)}</p></div></header>
      <form id="cert" novalidate>
        <section class="form-section"><div class="grid3">${F('Date of check', 'issue_date', UI.today(), { type: 'date', required: true })}<div class="field"><label>Next due</label><p class="due-preview" id="due-preview">–</p></div><div></div></div></section>
        ${def.body(ctx)}
        <section class="form-section"><h2>Sign off</h2>${type === 'warning' ? receivedBlock('', 'Customer name') : receivedBlock('')}${engineerBlock(business)}</section>
        <p class="form-error" role="alert" hidden></p>
        <div class="step-actions"><span class="spacer"></span><button type="submit" class="btn btn-primary btn-lg">Issue ${Labels.certTypes[type].toLowerCase()}</button></div>
      </form>${lists}</div>`);
    const form = main.querySelector('#cert');
    if (def.mount) def.mount(form);
    const eng = mountSig(form, 'eng-sig'), recv = mountSig(form, 'recv-sig');
    const dateInput = form.querySelector('[name=issue_date]');
    const preview = async () => {
      const r = await api('previewNextDue', type, property.id, dateInput.value || UI.today());
      form.querySelector('#due-preview').textContent = r.date ? `${date(r.date)}${r.keptDeadline ? ' (keeps the previous deadline)' : ''}` : 'No due date';
    };
    dateInput.addEventListener('change', preview); preview();
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const err = form.querySelector('.form-error'); err.hidden = true;
      const btn = form.querySelector('[type=submit]'); btn.disabled = true;
      try {
        const d = formData(form);
        if (!d.engineer_name) throw new Error('Pick the engineer. Add your name in Settings, under Business details, if the list is empty.');
        const part = await def.read(d, form, ctx);
        const signature = eng.get();
        if (!signature) throw new Error('Sign the certificate in the engineer signature box.');
        const cert = await api('saveCertificate', {
          type, client_id: client.id, property_id: property.id, job_id: job ? job.id : null, issue_date: d.issue_date, signature,
          asset_id: part.asset_id || null,
          data: { ...part.data, engineer_name: d.engineer_name, engineer_licence: d.engineer_licence, received_by: d.received_by, received_signature: recv.get() },
        });
        const pdf = await window.tpms.pdf('certificate', cert.id, { open: false });
        if (pdf.error) toast(`Saved, but the PDF could not be made: ${pdf.error}`, 'error');
        else toast(`${cert.number} issued`);
        App.go(`#/certificates/${cert.id}`);
      } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; err.scrollIntoView({ block: 'center' }); }
    });
  };

  Views.certView = async (main, [id]) => {
    const c = await api('getCertificate', Number(id));
    if (!c) return App.go('#/certificates');
    const unsafe = c.type === 'lgsr' ? (c.data.appliances || []).some(a => a.safe_to_use === 'no') : c.data.safe_to_use === 'no';
    render(main, h`<div class="page"><p class="crumb"><a href="#/certificates">Certificates</a></p>
      <header class="page-head"><div><h1>${c.number}</h1><p class="sub">${Labels.certTypes[c.type]} for ${addr(c.property)}</p></div>
        <div class="actions">${window.tpms.web ? '' : h`<button class="btn" data-folder>Show in folder</button>`}<button class="btn btn-primary" data-pdf>${window.tpms.web ? 'Download PDF' : 'Open PDF'}</button></div></header>
      <dl class="facts wide"><dt>Client</dt><dd><a href="#/clients/${c.client.id}">${c.client.name}</a></dd>
        ${c.job ? h`<dt>Job</dt><dd><a href="#/jobs/${c.job.id}">${c.job.ref}</a> ${c.job.title}</dd>` : ''}
        <dt>Date of check</dt><dd>${date(c.issue_date)}</dd>
        ${c.next_due ? h`<dt>${c.type === 'lgsr' ? 'Next check due' : 'Next service due'}</dt><dd>${date(c.next_due)}${c.kept_deadline ? ' (kept the previous deadline)' : ''}</dd>` : ''}
        <dt>Engineer</dt><dd>${c.data.engineer_name}</dd><dt>Form</dt><dd>${c.template_version}</dd>
        ${c.type === 'warning' ? h`<dt>Classification</dt><dd>${Labels.warningClasses[c.data.classification]}</dd>` : ''}</dl>
      ${unsafe ? h`<p class="callout danger">This record has an appliance that is not safe to use.${c.job ? h` <a href="#/certificates/new/warning?job=${c.job.id}">Issue a gas warning notice</a>` : ''}</p>` : ''}
      ${c.type === 'commissioning' ? h`<section class="section"><h2>Gas Safe notification</h2>${c.notification_ref ? h`<p>Notified, reference ${c.notification_ref} on ${date(c.notification_date)}.</p>`
        : h`<p class="muted">Not notified yet. Due by ${date(UI.addDaysIso(c.issue_date, 30))}.</p><form class="inline-form" id="notify"><input name="ref" placeholder="Notification reference" aria-label="Notification reference"><input type="date" name="date" value="${UI.today()}" aria-label="Date notified"><button class="btn">Save reference</button></form>`}</section>` : ''}
      <p class="muted">Issued records cannot be edited. To correct one, issue a new record.</p></div>`);
    main.querySelector('[data-pdf]').addEventListener('click', async () => { try { await UI.openPdf('certificate', c.id); } catch (ex) { toast(ex.message, 'error'); } });
    const folderBtn = main.querySelector('[data-folder]');
    if (folderBtn) folderBtn.addEventListener('click', async () => { let p = c.pdf_path; if (!p) { const r = await window.tpms.pdf('certificate', c.id, { open: false }); p = r.ok; } if (p) window.tpms.showItem(p); });
    const nf = main.querySelector('#notify');
    if (nf) nf.addEventListener('submit', async e => { e.preventDefault(); try { const d = formData(nf); await api('setNotification', c.id, d.ref, d.date); await window.tpms.pdf('certificate', c.id, { open: false }); toast('Notification saved'); App.reload(); } catch (ex) { toast(ex.message, 'error'); } });
  };

  Views.certificates = async (main, _p, q) => {
    const all = await api('listCertificates');
    const type = Labels.certTypes[q.type] ? q.type : '';
    const list = type ? all.filter(c => c.type === type) : all;
    render(main, h`<div class="page"><header class="page-head"><div><h1>Certificates</h1><p class="sub">Issue new certificates from a job so they link to the right client and property.</p></div></header>
      <nav class="filters"><a href="#/certificates" class="${type ? '' : 'on'}">All</a>${pairsOf(Labels.certTypes).map(([k, v]) => h`<a href="#/certificates?type=${k}" class="${k === type ? 'on' : ''}">${v}</a>`)}</nav>
      ${list.length ? h`<table class="table"><thead><tr><th>Number</th><th>Type</th><th>Client</th><th>Property</th><th>Issued</th><th>Next due</th><th></th></tr></thead><tbody>
        ${list.map(c => h`<tr><td><a href="#/certificates/${c.id}">${c.number}</a></td><td>${Labels.certTypes[c.type]}</td><td>${c.client_name}</td><td>${c.address_line1}, ${c.postcode}</td><td>${date(c.issue_date)}</td><td>${date(c.next_due)}</td><td class="num"><button class="link-btn" data-pdf="${c.id}">PDF</button></td></tr>`)}</tbody></table>`
        : h`<div class="empty"><h2>No certificates yet</h2><p>Open a job and choose the certificate to issue.</p><a class="btn" href="#/jobs">Go to jobs</a></div>`}</div>`);
    main.querySelectorAll('[data-pdf]').forEach(b => b.addEventListener('click', async () => { try { await UI.openPdf('certificate', Number(b.dataset.pdf)); } catch (ex) { toast(ex.message, 'error'); } }));
  };

  Views.reminders = async (main) => {
    const list = await api('dueList');
    const groups = [['overdue', 'Overdue'], ['7', 'Due within 7 days'], ['30', 'Due within 30 days'], ['60', 'Due within 60 days']];
    const later = list.filter(x => !x.bucket);
    const row = x => h`<tr><td><b>${date(x.next_due)}</b><div class="muted small">${x.days_left < 0 ? `${-x.days_left} days overdue` : x.days_left === 0 ? 'Today' : `${x.days_left} days`}</div></td><td>${x.kind}${x.appliance_type ? h`<div class="muted small">${[x.appliance_type, x.make, x.location].filter(Boolean).join(', ')}</div>` : ''}</td>
      <td><a href="#/clients/${x.client_id}">${x.client_name}</a><div class="muted small">${[x.client_phone, x.client_email].filter(Boolean).join(', ')}</div></td><td>${x.address_line1}, ${x.postcode}${x.occupier_name ? h`<div class="muted small">Occupier: ${x.occupier_name}${x.occupier_phone ? `, ${x.occupier_phone}` : ''}</div>` : ''}</td>
      <td><a href="#/certificates/${x.id}">${x.number}</a></td><td class="num"><button class="btn btn-small" data-book="${x.client_id}" data-prop="${x.property_id}" data-title="${x.kind}">Book job</button></td></tr>`;
    const table = rows => h`<table class="table"><thead><tr><th>Due</th><th>What</th><th>Client</th><th>Property</th><th>Last record</th><th></th></tr></thead><tbody>${rows.map(row)}</tbody></table>`;
    render(main, h`<div class="page"><header class="page-head"><div><h1>Reminders</h1><p class="sub">Gas safety checks and services, worked out from the last record for each property and appliance.</p></div></header>
      ${groups.map(([k, label]) => { const rows = list.filter(x => x.bucket === k); return rows.length ? h`<section class="section"><div class="section-head"><h2 class="${k === 'overdue' ? 'bad' : ''}">${label}</h2><span class="count">${rows.length}</span></div>${table(rows)}</section>` : ''; })}
      ${list.some(x => x.bucket) ? '' : h`<div class="empty"><h2>Nothing due in the next 60 days</h2><p>Due dates appear here 60, 30 and 7 days before each check or service.</p></div>`}
      ${later.length ? h`<details class="history"><summary>Later (${later.length})</summary>${table(later)}</details>` : ''}</div>`);
    main.querySelectorAll('[data-book]').forEach(b => b.addEventListener('click', () => Views.newJob({ clientId: Number(b.dataset.book), propertyId: Number(b.dataset.prop), title: b.dataset.title })));
  };
})();
