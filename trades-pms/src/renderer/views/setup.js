'use strict';
window.Views = window.Views || {};
(() => {
  const { h, raw, render, api, options, pairsOf, toast, formData, esc } = UI;

  // ---------------- account creation ----------------
  Views.signup = async (main) => {
    render(main, h`<div class="signup">
      <section class="signup-side">
        <div class="brand-mark big" aria-hidden="true"></div>
        <h1>Trades PMS</h1>
        <p>Estimates that keep every version, extras logged as the job runs, invoices in one click, and certificates with their due dates tracked.</p>
        <p class="muted-on-ink">For gas, plumbing, electrical and building businesses in England and Wales.</p>
      </section>
      <section class="signup-form">
        <form id="signup" novalidate>
          <h2>Create your account</h2>
          <div class="grid2">
            ${field('Your name', 'owner_name', '', { required: true, autocomplete: 'name' })}
            ${field('Business name', 'business_name', '', { required: true })}
            ${field('Email', 'email', '', { required: true, type: 'email', autocomplete: 'email' })}
            ${field('Phone', 'phone', '', { type: 'tel', autocomplete: 'tel' })}
          </div>
          <h3>Business address</h3>
          ${field('Address', 'address_line1', '', { required: true, autocomplete: 'address-line1' })}
          <div class="grid2">
            ${field('Town', 'town', '', { autocomplete: 'address-level2' })}
            <div class="field"><label for="f-postcode">Postcode <span class="req">required</span></label><input id="f-postcode" name="postcode" autocomplete="postal-code" required><p class="hint" id="pc-result" aria-live="polite"></p></div>
          </div>
          <h3>Your trades</h3>
          <p class="hint">Pick every trade you do. Each one adds its own certificates and registration details.</p>
          <div class="trade-picks">
            ${pairsOf(Labels.trades).map(([k, v]) => h`<label class="trade-pick"><input type="checkbox" name="trades" value="${k}" data-group="1"><span>${v}</span></label>`)}
          </div>
          <p class="form-error" id="signup-error" role="alert" hidden></p>
          <button class="btn btn-primary btn-lg" type="submit">Create account</button>
        </form>
      </section></div>`);
    const form = main.querySelector('#signup');
    const pcInput = form.querySelector('#f-postcode');
    const pcResult = form.querySelector('#pc-result');
    let pcCheck = null;
    async function checkPc() {
      const v = pcInput.value.trim();
      if (!v) { pcResult.textContent = ''; pcCheck = null; return null; }
      pcResult.textContent = 'Checking postcode…';
      pcCheck = await window.tpms.checkPostcode(v);
      pcInput.value = pcCheck.postcode || v;
      if (!pcCheck.valid) pcResult.textContent = pcCheck.reason;
      else if (!pcCheck.allowed) pcResult.textContent = `This postcode is in ${pcCheck.country}. Trades PMS is only available for businesses in England and Wales.`;
      else pcResult.textContent = pcCheck.country === 'England or Wales' ? 'Postcode accepted.' : `Postcode accepted: ${pcCheck.country}.`;
      pcResult.classList.toggle('bad', !pcCheck.allowed);
      return pcCheck;
    }
    pcInput.addEventListener('blur', checkPc);
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const err = main.querySelector('#signup-error');
      err.hidden = true;
      const d = formData(form);
      try {
        const missing = [['owner_name', 'your name'], ['business_name', 'business name'], ['email', 'email'], ['address_line1', 'address'], ['postcode', 'postcode']].filter(([k]) => !d[k]).map(([, l]) => l);
        if (missing.length) throw new Error('Fill in ' + missing.join(', ') + '.');
        if (!/^\S+@\S+\.\S+$/.test(d.email)) throw new Error('Check the email address.');
        const pc = await checkPc();
        if (!pc || !pc.allowed) throw new Error(pc && pc.valid ? `Trades PMS is only available for businesses in England and Wales. This postcode is in ${pc.country}.` : 'Enter a full UK postcode.');
        if (!d.trades.length) throw new Error('Pick at least one trade.');
        const acc = await api('createAccount', { ...d, postcode: pc.postcode, country: pc.country });
        render(main, h`<div class="signup"><section class="signup-side"><div class="brand-mark big" aria-hidden="true"></div><h1>Trades PMS</h1></section>
          <section class="signup-form"><div class="done-card"><h2>Your account is ready</h2>
          <p>Your licence key unlocks Trades PMS on this computer. Keep it somewhere safe: you will need it to move to a new computer.</p>
          <div class="licence-key">${acc.licence_key}</div>
          <p>Next, a few questions about your business set up your VAT, certificates and invoices.</p>
          <a class="btn btn-primary btn-lg" href="#/setup">Start setup</a></div></section></div>`);
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    });
  };

  // ---------------- setup wizard and settings ----------------
  function field(label, name, value, o = {}) {
    const id = 'f-' + name;
    return h`<div class="field${o.cls ? ' ' + o.cls : ''}"><label for="${id}">${label}${o.required ? raw(' <span class="req">required</span>') : ''}</label>
      ${o.textarea ? h`<textarea id="${id}" name="${name}" rows="${o.rows || 3}">${value ?? ''}</textarea>`
        : h`<input id="${id}" name="${name}" type="${o.type || 'text'}" value="${value ?? ''}"${o.required ? raw(' required') : ''}${o.readonly ? raw(' readonly') : ''}${o.list ? raw(` list="dl-${esc(name)}" autocomplete="off"`) : ''}${o.autocomplete ? raw(` autocomplete="${esc(o.autocomplete)}"`) : ''}${o.step ? raw(` step="${esc(o.step)}"`) : ''}${o.placeholder ? raw(` placeholder="${esc(o.placeholder)}"`) : ''}>${o.list ? datalist('dl-' + name, o.list) : ''}`}
      ${o.hint ? h`<p class="hint">${o.hint}</p>` : ''}</div>`;
  }
  Views.field = field;
  // Suggestions shown under a box as you type; anything else can still be typed.
  function datalist(id, items) { return h`<datalist id="${id}">${items.map(x => h`<option value="${x}">`)}</datalist>`; }
  Views.datalist = datalist;
  // VAT to put aside follows the VAT answers: none if not registered, the flat rate on flat rate,
  // otherwise the VAT inside a price that includes 20% VAT.
  const vatPotFor = b => (!b.vat_registered ? 0 : b.vat_scheme === 'flat' ? Number(b.flat_rate_pct || 0) : 16.67);
  function select(label, name, pairs, value, o = {}) {
    const blank = 'blank' in o ? o.blank : 'Choose…';
    return h`<div class="field"><label for="f-${name}">${label}${o.required ? raw(' <span class="req">required</span>') : ''}</label><select id="f-${name}" name="${name}">${options(pairs, value, blank)}</select>${o.hint ? h`<p class="hint">${o.hint}</p>` : ''}</div>`;
  }
  Views.select = select;
  function radios(label, name, pairs, value, o = {}) {
    return h`<fieldset class="field radios"><legend>${label}${o.required ? raw(' <span class="req">required</span>') : ''}</legend>
      ${pairs.map(([v, t, sub]) => h`<label class="radio-card"><input type="radio" name="${name}" value="${v}"${String(value) === String(v) ? raw(' checked') : ''}><span><b>${t}</b>${sub ? h`<small>${sub}</small>` : ''}</span></label>`)}</fieldset>`;
  }
  function frsOptions(value) {
    const opt = ([k, label, pct]) => `<option value="${esc(k)}"${k === value ? ' selected' : ''}>${esc(label)}: ${pct}%</option>`;
    return raw(`<option value="">Choose…</option><optgroup label="Building and trades">${Labels.frsSectors.filter(x => x[3]).map(opt).join('')}</optgroup>`
      + `<optgroup label="All other sectors">${Labels.frsSectors.filter(x => !x[3]).map(opt).join('')}</optgroup>`);
  }
  function priceRow(i, vr) {
    return h`<tr><td><input data-f="description" value="${i.description || ''}" placeholder="e.g. Boiler service" aria-label="Item"></td>
      <td><select data-f="kind" aria-label="Type">${options(pairsOf(Labels.lineKinds), i.kind || 'labour')}</select></td>
      <td class="num"><input data-f="unit_price" class="w-money" value="${i.unit_price === null || i.unit_price === undefined ? '' : UI.moneyInput(i.unit_price)}" inputmode="decimal" aria-label="Price"></td>
      ${vr ? h`<td><select data-f="vat_rate" aria-label="VAT rate">${options(Labels.vatRates, i.vat_rate ?? 20)}</select></td>` : ''}
      <td class="num"><button type="button" class="icon-btn" data-del-item aria-label="Remove item">×</button></td></tr>`;
  }
  const yesNo = v => (v === true || v === 'yes') ? 'yes' : (v === false || v === 'no') ? 'no' : '';

  const STEPS = [
    {
      id: 'business', title: 'Business details', required: true,
      form: b => h`${field('Trading name', 'trading_name', b.trading_name, { required: true })}
        ${field('Address', 'address_line1', b.address_line1, { required: true })}${field('Address line 2', 'address_line2', b.address_line2)}
        <div class="grid2">${field('Town', 'town', b.town)}${field('Postcode', 'postcode', b.postcode, { required: true })}</div>
        <div class="grid2">${field('Phone', 'phone', b.phone, { type: 'tel' })}${field('Email', 'email', b.email, { type: 'email' })}</div>
        <div class="field"><label>Logo</label><div class="logo-row">${b.logo ? h`<img class="logo-preview" src="${b.logo}" alt="Current logo">` : h`<span class="hint">No logo yet</span>`}<input type="file" id="logo-file" accept="image/png,image/jpeg"><input type="hidden" name="logo" value="${b.logo || ''}"></div><p class="hint">PNG or JPG under 500 KB. It goes at the top of the menu and on every estimate, invoice and certificate.</p></div>
        <div class="grid2">${field('Public liability insurer', 'insurer', b.insurer)}${field('Policy number', 'policy_no', b.policy_no)}</div>
        <div class="grid2">${field('Your name as it appears on certificates', 'engineer_name', b.engineer_name)}${select('Payment terms', 'payment_terms_days', Labels.paymentTerms, b.payment_terms_days ?? 14, { blank: undefined, hint: 'Sets the due date on invoices.' })}</div>`,
      read: d => ({ ...d, payment_terms_days: d.payment_terms_days === '' ? 14 : Number(d.payment_terms_days) }),
      check: d => { if (!d.trading_name) return 'Enter your trading name.'; if (!d.address_line1 || !d.postcode) return 'Enter your business address and postcode.'; },
      mount: form => {
        const file = form.querySelector('#logo-file');
        file.addEventListener('change', () => {
          const f = file.files[0];
          if (!f) return;
          if (f.size > 500 * 1024) { toast('That logo is over 500 KB. Pick a smaller file.', 'error'); file.value = ''; return; }
          const r = new FileReader();
          r.onload = () => { form.querySelector('[name=logo]').value = r.result; const prev = form.querySelector('.logo-preview') || document.createElement('img'); prev.className = 'logo-preview'; prev.src = r.result; form.querySelector('.logo-row').prepend(prev); const span = form.querySelector('.logo-row .hint'); if (span) span.remove(); };
          r.readAsDataURL(f);
        });
      },
    },
    {
      id: 'structure', title: 'Business structure', required: true,
      form: b => h`${radios('How is the business set up?', 'structure', [
        ['sole_trader', 'Sole trader', 'You are self-employed and file a Self Assessment return.'],
        ['partnership', 'Partnership', 'Two or more partners share the business.'],
        ['limited', 'Limited company', 'The company is registered at Companies House.']], b.structure, { required: true })}
        <div class="grid2">${field('Unique Taxpayer Reference (UTR)', 'tax_ref', b.tax_ref, { hint: 'Sole traders and partnerships. 10 digits, on letters from HMRC.' })}${field('Company number', 'company_no', b.company_no, { hint: 'Limited companies only.' })}</div>`,
      check: d => { if (!d.structure) return 'Pick how the business is set up.'; if (d.tax_ref && !/^\d{10}$/.test(d.tax_ref.replace(/\s/g, ''))) return 'A UTR is 10 digits.'; },
    },
    {
      id: 'vat', title: 'VAT', required: true,
      form: b => h`${radios('Are you VAT registered?', 'vat_registered', [['yes', 'Yes'], ['no', 'No, not yet']], yesNo(b.vat_registered), { required: true })}
        <div class="vat-only">
          <div class="grid2">${field('VAT number', 'vat_number', b.vat_number, { placeholder: 'GB123456789' })}${field('Date registration took effect', 'vat_reg_date', b.vat_reg_date, { type: 'date', hint: 'On your VAT registration certificate.' })}</div>
          ${radios('VAT scheme', 'vat_scheme', [
          ['standard', 'Standard', 'You charge VAT on invoices and reclaim the VAT on what you buy. VAT is due on the invoice date.'],
          ['cash', 'Standard with cash accounting', 'Same as standard, but VAT is due when the customer pays you. Helps when customers pay late.'],
          ['flat', 'Flat rate', 'You pay a fixed percentage of your takings and do not reclaim VAT on materials. Rarely worth it if you buy a lot of materials.']], b.vat_scheme)}
          <div class="field flat-only"><label for="f-flat_rate_sector">Flat rate trade sector</label><select id="f-flat_rate_sector" name="flat_rate_sector">${frsOptions(b.flat_rate_sector)}</select>
            <p class="hint" id="frs-pct">${b.flat_rate_sector ? `Your flat rate: ${b.flat_rate_pct}% of takings including VAT.` : 'The sector is on your HMRC letter. It sets your flat rate percentage.'}</p></div>
          ${select('Your VAT quarters end in', 'vat_stagger', pairsOf(Labels.staggers), b.vat_stagger || '')}
          <p class="callout">Not sure which scheme you are on? It is on your VAT registration letter. Check the choice with your accountant.</p>
        </div>`,
      read: d => {
        const sector = Labels.frsSectors.find(x => x[0] === d.flat_rate_sector);
        const out = { ...d, vat_registered: d.vat_registered === 'yes', vat_stagger: Number(d.vat_stagger || 0) || null,
          flat_rate_sector: d.vat_scheme === 'flat' && sector ? sector[0] : null, flat_rate_pct: d.vat_scheme === 'flat' && sector ? sector[2] : null,
          vat_number: d.vat_number ? d.vat_number.replace(/\s/g, '').toUpperCase() : '' };
        return { ...out, vat_pot_pct: vatPotFor(out) };
      },
      check: d => {
        if (!d.vat_registered) return 'Say whether you are VAT registered.';
        if (d.vat_registered === 'yes') {
          if (!/^(GB)?\d{9}$/.test((d.vat_number || '').replace(/\s/g, '').toUpperCase())) return 'A VAT number is GB followed by 9 digits.';
          if (!d.vat_reg_date) return 'Enter the date your VAT registration took effect.';
          if (!d.vat_scheme) return 'Pick your VAT scheme.';
          if (d.vat_scheme === 'flat' && !d.flat_rate_sector) return 'Pick your flat rate trade sector.';
          if (!d.vat_stagger) return 'Pick the months your VAT quarters end.';
        }
      },
      mount: form => {
        const sync = () => {
          const on = form.querySelector('[name=vat_registered]:checked')?.value === 'yes';
          form.querySelector('.vat-only').hidden = !on;
          form.querySelector('.flat-only').hidden = form.querySelector('[name=vat_scheme]:checked')?.value !== 'flat';
          const sector = Labels.frsSectors.find(x => x[0] === form.querySelector('[name=flat_rate_sector]').value);
          form.querySelector('#frs-pct').textContent = sector ? `Your flat rate: ${sector[2]}% of takings including VAT.` : 'The sector is on your HMRC letter. It sets your flat rate percentage.';
        };
        form.querySelectorAll('[name=vat_registered], [name=vat_scheme], [name=flat_rate_sector]').forEach(r => r.addEventListener('change', sync)); sync();
      },
    },
    {
      id: 'income', title: 'Income Tax', when: b => b.structure === 'sole_trader',
      form: b => h`<p class="lead">Sole traders send Income Tax updates to HMRC every quarter once their income passes a threshold. Your answers set your start date.</p>
        ${radios('Has HMRC written to you about Making Tax Digital for Income Tax?', 'mtd_letter', [['yes', 'Yes'], ['no', 'No'], ['unsure', 'Not sure']], b.mtd_letter)}
        <div class="grid2">${select('Gross income from self-employment in 2024/25', 'income_2425', pairsOf(Labels.incomeBands), b.income_2425)}
        ${select('Gross income from self-employment in 2025/26', 'income_2526', pairsOf(Labels.incomeBands), b.income_2526)}</div>
        <p class="hint">Gross means your takings before expenses. Include any rental income.</p>
        <div class="callout" id="mtd-preview">${b.mtd ? b.mtd.text : ''}</div>`,
      mount: form => {
        const upd = async () => { const d = formData(form); const r = await api('mtdPreview', 'sole_trader', d.income_2425, d.income_2526); form.querySelector('#mtd-preview').textContent = r.text; };
        form.querySelectorAll('select').forEach(s => s.addEventListener('change', upd)); upd();
      },
    },
    {
      id: 'devices', title: 'On-site devices',
      form: b => h`${radios('Do you fill in paperwork on a phone or tablet on site?', 'on_site_devices', [['yes', 'Yes', 'Certificates and signatures can be done on site.'], ['no', 'No, I do it at the computer']], b.on_site_devices)}`,
    },
    {
      id: 'bank', title: 'Bank and pots',
      form: b => {
        const pot = vatPotFor(b);
        const potHint = !b.vat_registered ? 'You are not VAT registered, so there is no VAT to put aside.' : b.vat_scheme === 'flat' ? 'Your flat rate, worked out from your VAT answers.' : 'The VAT inside a price that includes 20% VAT, worked out from your VAT answers.';
        return h`${select('Business bank', 'bank', Labels.banks.map(x => [x, x]), b.bank)}
        <h3>Printed on your invoices</h3>
        <div class="grid3">${field('Account name', 'bank_account_name', b.bank_account_name)}${field('Sort code', 'bank_sort_code', b.bank_sort_code, { placeholder: '00-00-00' })}${field('Account number', 'bank_account_no', b.bank_account_no)}</div>
        <h3>Money to put aside from each payment</h3>
        <div class="grid2">${field('VAT pot (% of each payment)', 'vat_pot_pct', pot, { readonly: true, hint: potHint })}
        ${field('Income tax reserve (% of each payment)', 'tax_reserve_pct', b.tax_reserve_pct ?? 20, { type: 'number', step: '0.5', list: Labels.taxReservePresets.map(String), hint: 'Pick 15, 20, 25 or 30, or type your own. Ask your accountant what suits your profits.' })}</div>`;
      },
      check: d => { if (d.bank_sort_code && !/^\d{2}-?\d{2}-?\d{2}$/.test(d.bank_sort_code)) return 'A sort code is 6 digits, like 00-00-00.'; if (d.bank_account_no && !/^\d{8}$/.test(d.bank_account_no)) return 'An account number is 8 digits.'; },
      read: d => ({ ...d, vat_pot_pct: vatPotFor(App.state.business), tax_reserve_pct: Number(d.tax_reserve_pct || 0) }),
    },
    {
      id: 'accountant', title: 'Accountant',
      form: b => h`<div class="grid2">${field('Name', 'accountant_name', b.accountant_name)}${field('Firm', 'accountant_firm', b.accountant_firm)}</div>
        ${field('Email', 'accountant_email', b.accountant_email, { type: 'email' })}
        <label class="check"><input type="checkbox" name="accountant_invite"${b.accountant_invite ? raw(' checked') : ''}> Give my accountant a read-only login</label>`,
    },
    {
      id: 'suppliers', title: 'Suppliers',
      form: b => h`<p class="lead">Tick the merchants you have trade accounts with.</p>
        <div class="tick-grid">${Labels.suppliers.map(s => h`<label class="check"><input type="checkbox" name="suppliers" value="${s}" data-group="1"${(b.suppliers || []).includes(s) ? raw(' checked') : ''}> ${s}</label>`)}</div>
        ${field('Others', 'suppliers_other', b.suppliers_other, { hint: 'Separate names with commas.' })}`,
    },
    {
      id: 'prices', title: 'Price list',
      form: b => {
        const items = b.price_list || Labels.defaultPriceList.map(i => ({ ...i, unit_price: null, vat_rate: b.vat_registered ? 20 : 0 }));
        return h`<p class="lead">Your usual jobs, labour rates and parts. Pick them from the list when writing an estimate and the price fills in. Leave a price blank to fill it in each time.</p>
          <table class="table compact price-list"><thead><tr><th>Item</th><th>Type</th><th class="num">Price (£)</th>${b.vat_registered ? h`<th>VAT</th>` : ''}<th></th></tr></thead>
          <tbody id="pl-rows">${items.map(i => priceRow(i, b.vat_registered))}</tbody></table>
          <button type="button" class="btn btn-small" data-add-item>Add item</button>`;
      },
      mount: form => {
        const rows = form.querySelector('#pl-rows');
        form.querySelector('[data-add-item]').addEventListener('click', () => { rows.insertAdjacentHTML('beforeend', priceRow({ kind: 'labour', vat_rate: 20 }, App.state.business.vat_registered).s); rows.lastElementChild.querySelector('input').focus(); });
        rows.addEventListener('click', e => { const x = e.target.closest('[data-del-item]'); if (x) x.closest('tr').remove(); });
      },
      check: (d, form) => {
        for (const tr of form.querySelectorAll('#pl-rows tr')) {
          const p = tr.querySelector('[data-f=unit_price]').value.trim();
          if (p && Number.isNaN(UI.parseMoney(p))) return `Check the price for “${tr.querySelector('[data-f=description]').value}”.`;
        }
      },
      read: (d, form) => ({
        price_list: [...form.querySelectorAll('#pl-rows tr')].map(tr => {
          const v = f => tr.querySelector(`[data-f=${f}]`);
          const p = v('unit_price').value.trim();
          return { description: v('description').value.trim(), kind: v('kind').value, unit_price: p ? UI.parseMoney(p) : null, vat_rate: v('vat_rate') ? Number(v('vat_rate').value) : 0 };
        }).filter(i => i.description),
      }),
    },
    {
      id: 'gas', title: 'Gas and heating', trade: 'gas', required: true,
      form: b => h`<div class="grid2">${field('Gas Safe registration number', 'gas_safe_reg', b.gas_safe_reg, { required: true, hint: 'The business registration number, printed on every gas certificate.' })}
        ${field('Your Gas Safe licence card number', 'engineer_licence', b.engineer_licence, { hint: 'The personal number on your ID card.' })}</div>
        <label class="check"><input type="checkbox" name="g3"${b.g3 ? raw(' checked') : ''}> I hold the G3 unvented hot water qualification</label>
        ${field('G3 expiry date', 'g3_expiry', b.g3_expiry, { type: 'date' })}`,
      check: d => { if (!/^\d{6,7}$/.test(d.gas_safe_reg || '')) return 'A Gas Safe registration number is 6 or 7 digits.'; },
    },
    {
      id: 'plumbing', title: 'Plumbing', trade: 'plumbing', required: true,
      form: b => h`<div class="grid2">${select('Competent person scheme', 'plumbing_scheme', Labels.plumbingSchemes.map(x => [x, x]), b.plumbing_scheme)}${field('Membership number', 'plumbing_scheme_no', b.plumbing_scheme_no, { required: true })}</div>
        <label class="check"><input type="checkbox" name="g3"${b.g3 ? raw(' checked') : ''}> I hold the G3 unvented hot water qualification</label>
        ${field('G3 expiry date', 'g3_expiry', b.g3_expiry, { type: 'date' })}`,
      check: d => { if (!d.plumbing_scheme_no) return 'Enter your scheme membership number.'; },
    },
    {
      id: 'electrical', title: 'Electrical', trade: 'electrical', required: true,
      form: b => h`<div class="grid2">${select('Competent person scheme', 'electrical_scheme', Labels.electricalSchemes.map(x => [x, x]), b.electrical_scheme)}${field('Membership number', 'electrical_scheme_no', b.electrical_scheme_no, { required: true })}</div>`,
      check: d => { if (!d.electrical_scheme_no) return 'Enter your scheme membership number.'; },
    },
    {
      id: 'building', title: 'Building', trade: 'building', required: true,
      form: b => h`${radios('Construction Industry Scheme (CIS)', 'cis_role', pairsOf(Labels.cisRoles), b.cis_role, { required: true })}
        ${radios('Do you have gross payment status?', 'cis_gross', [['yes', 'Yes', 'Contractors pay you without deducting tax.'], ['no', 'No']], b.cis_gross)}`,
      check: d => { if (!d.cis_role) return 'Pick your CIS role.'; },
    },
  ];

  const visibleSteps = (b, acc) => STEPS.filter(s => (!s.trade || acc.trades.includes(s.trade)) && (!s.when || s.when(b)));

  async function wizard(main, mode, query) {
    const acc = App.state.account;
    let b = App.state.business;
    let steps = visibleSteps(b, acc);
    let idx = Math.max(0, steps.findIndex(s => s.id === (query.step || (mode === 'setup' ? b.wizard_step : 'business'))));
    if (mode === 'settings' && query.step === 'account') idx = -1;

    const draw = () => {
      steps = visibleSteps(b, acc);
      const step = idx >= 0 ? steps[idx] : null;
      const isLast = idx === steps.length - 1;
      render(main, h`<div class="page wizard ${mode}">
        <header class="page-head"><div><h1>${mode === 'setup' ? 'Set up your business' : 'Settings'}</h1>
          <p class="sub">${mode === 'setup' ? 'Business details, structure and VAT are needed to start. The rest can be finished later in Settings.' : 'Change any of your business details. Changes apply to new documents.'}</p></div></header>
        <div class="wizard-body">
          <ol class="steps">${steps.map((s, i) => h`<li class="${i === idx ? 'current' : ''}"><button type="button" data-step="${i}">${s.title}${s.required ? '' : raw(' <small>optional</small>')}</button></li>`)}
            ${mode === 'settings' ? h`<li class="${idx === -1 ? 'current' : ''} step-account"><button type="button" data-step="-1">Account and trades</button></li>` : ''}</ol>
          <form class="step-form" novalidate>
            ${step ? h`<h2>${step.title}</h2>${step.form(b)}` : accountForm(acc)}
            <p class="form-error" role="alert" hidden></p>
            <div class="step-actions">
              ${mode === 'setup' && idx > 0 ? h`<button type="button" class="btn" data-back>Back</button>` : ''}
              <span class="spacer"></span>
              ${mode === 'setup' && step && !step.required && !isLast ? h`<button type="button" class="btn btn-quiet" data-skip>Skip for now</button>` : ''}
              <button type="submit" class="btn btn-primary">${mode === 'settings' ? 'Save changes' : isLast ? 'Finish setup' : 'Save and continue'}</button>
            </div>
          </form>
        </div></div>`);
      const form = main.querySelector('.step-form');
      if (step && step.mount) step.mount(form);
      main.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => { idx = Number(btn.dataset.step); draw(); }));
      const back = main.querySelector('[data-back]'); if (back) back.addEventListener('click', () => { idx--; draw(); });
      const skip = main.querySelector('[data-skip]'); if (skip) skip.addEventListener('click', () => { idx++; draw(); });
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const err = form.querySelector('.form-error');
        err.hidden = true;
        try {
          if (!step) {
            const d = formData(form);
            await api('setTrades', d.trades);
            await App.refresh();
            toast('Trades saved');
            return draw();
          }
          const d = formData(form);
          const problem = step.check && step.check(d, form);
          if (problem) throw new Error(problem);
          const patch = step.read ? step.read(d, form) : d;
          if (mode === 'setup') patch.wizard_step = steps[Math.min(idx + 1, steps.length - 1)].id;
          b = await api('saveBusiness', patch);
          App.state.business = b;
          if (mode === 'settings') { toast('Changes saved'); return draw(); }
          if (isLast) {
            await api('completeWizard');
            toast('Setup complete');
            return App.go('#/');
          }
          idx++;
          draw();
        } catch (ex) { err.textContent = ex.message; err.hidden = false; }
      });
    };
    draw();
  }

  function accountForm(acc) {
    return h`<h2>Account and trades</h2>
      <p class="lead">Adding a trade adds its registration details and certificates. Its step appears in this list once saved.</p>
      <div class="trade-picks">${pairsOf(Labels.trades).map(([k, v]) => h`<label class="trade-pick"><input type="checkbox" name="trades" value="${k}" data-group="1"${acc.trades.includes(k) ? raw(' checked') : ''}><span>${v}</span></label>`)}</div>
      <dl class="facts"><dt>Account holder</dt><dd>${acc.owner_name} (${acc.email})</dd><dt>Licence key</dt><dd>${acc.licence_key}</dd><dt>Plan</dt><dd>Trial</dd></dl>`;
  }

  Views.setup = (main, _p, q) => wizard(main, 'setup', q);
  Views.settings = (main, _p, q) => wizard(main, 'settings', q);
})();
