'use strict';
// Small helpers shared by every screen.
const UI = (() => {
  const RAW = Symbol('raw');
  const raw = s => ({ [RAW]: true, s: String(s) });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = v => (v === null || v === undefined || v === false) ? '' : Array.isArray(v) ? v.map(fmt).join('') : (v && v[RAW]) ? v.s : esc(v);
  // Tagged template: values are escaped unless they are themselves h`` results or raw().
  function h(strings, ...vals) { let out = ''; strings.forEach((s, i) => { out += s; if (i < vals.length) out += fmt(vals[i]); }); return raw(out); }
  const render = (el, tpl) => { el.innerHTML = fmt(tpl); };

  async function api(method, ...args) {
    const r = await window.tpms.call(method, ...args);
    if (r && r.error) throw new Error(r.error);
    return r ? r.ok : undefined;
  }

  const money = p => (p === null || p === undefined) ? '–' : (p < 0 ? '−' : '') + '£' + (Math.abs(p) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const moneyInput = p => (p === null || p === undefined || p === '') ? '' : (p / 100).toFixed(2);
  function parseMoney(input) {
    const s = String(input ?? '').replace(/[£,\s]/g, '');
    if (s === '') return 0;
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) : NaN;
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const date = iso => { if (!iso) return '–'; const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };
  const qty = q => (Number.isInteger(Number(q)) ? String(q) : Number(q).toFixed(2));
  const addDaysIso = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d + n)); return t.toISOString().slice(0, 10); };
  const addr = o => o ? [o.address_line1, o.address_line2, o.town, o.postcode].filter(Boolean).join(', ') : '';

  function formData(form) {
    const out = {};
    for (const el of form.querySelectorAll('input[name], select[name], textarea[name]')) {
      if (el.type === 'checkbox') {
        if (el.dataset.group) { (out[el.name] = out[el.name] || []); if (el.checked) out[el.name].push(el.value); }
        else out[el.name] = el.checked;
      } else if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; else if (!(el.name in out)) out[el.name] = out[el.name] ?? ''; }
      else out[el.name] = el.value.trim();
    }
    return out;
  }

  const options = (pairs, value, blank) => raw((blank !== undefined ? `<option value="">${esc(blank)}</option>` : '') +
    pairs.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(value ?? '') ? ' selected' : ''}>${esc(t)}</option>`).join(''));
  const pairsOf = obj => Object.entries(obj);

  function toast(msg, kind = 'ok') {
    const t = document.createElement('div');
    t.className = `toast toast-${kind}`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, kind === 'error' ? 5000 : 2600);
  }

  // A modal with a form. onConfirm(data, form) may throw to show an error and keep the modal open.
  function modal({ title, body, confirm = 'Save', danger = false, wide = false, onConfirm, onMount }) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = `<form class="modal${wide ? ' modal-wide' : ''}" novalidate><header><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">×</button></header>
        <div class="modal-body">${fmt(body)}</div><p class="form-error" role="alert" hidden></p>
        <footer><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(confirm)}</button></footer></form>`;
      document.body.appendChild(wrap);
      const form = wrap.querySelector('form');
      const err = wrap.querySelector('.form-error');
      const close = v => { wrap.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = e => { if (e.key === 'Escape') close(null); };
      document.addEventListener('keydown', onKey);
      wrap.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(null)));
      form.addEventListener('submit', async e => {
        e.preventDefault();
        err.hidden = true;
        const btn = form.querySelector('[type=submit]');
        btn.disabled = true;
        try { const r = onConfirm ? await onConfirm(formData(form), form) : formData(form); close(r === undefined ? true : r); }
        catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
      });
      if (onMount) onMount(form);
      const first = form.querySelector('.modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea');
      if (first) first.focus();
    });
  }

  // Signature box on a canvas. get() returns a PNG data URL, or null if nothing was drawn.
  function sigPad(canvas) {
    const ctx = canvas.getContext('2d');
    let drawing = false, dirty = false, last = null;
    const ratio = window.devicePixelRatio || 1;
    const size = () => { const r = canvas.getBoundingClientRect(); canvas.width = r.width * ratio; canvas.height = r.height * ratio; ctx.scale(ratio, ratio); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#17202A'; };
    size();
    const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('pointerdown', e => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; dirty = true; });
    const stop = () => { drawing = false; };
    canvas.addEventListener('pointerup', stop); canvas.addEventListener('pointerleave', stop);
    return {
      get: () => (dirty ? canvas.toDataURL('image/png') : null),
      clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; },
    };
  }
  const sigField = (id, label) => h`<div class="field sig-field"><label>${label}</label><canvas class="sig" id="${id}"></canvas><button type="button" class="link-btn" data-clear-sig="${id}">Clear signature</button></div>`;
  function mountSig(root, id) {
    const pad = sigPad(root.querySelector('#' + id));
    const clr = root.querySelector(`[data-clear-sig="${id}"]`);
    if (clr) clr.addEventListener('click', () => pad.clear());
    return pad;
  }

  const pill = (text, tone = 'neutral') => h`<span class="pill pill-${tone}">${text}</span>`;
  const STATUS_TONE = { enquiry: 'neutral', estimating: 'neutral', estimate_sent: 'info', accepted: 'ochre', in_progress: 'ochre', complete: 'safe', invoiced: 'info', paid: 'safe', cancelled: 'neutral' };
  const jobPill = s => pill(Labels.jobStatus[s] || s, STATUS_TONE[s]);

  async function openPdf(kind, id) {
    const r = await window.tpms.pdf(kind, id);
    if (r.error) throw new Error(r.error);
    toast(window.tpms.web ? 'PDF downloaded' : 'PDF saved and opened');
    return r.ok;
  }

  function csvCell(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
  const csv = rows => rows.map(r => r.map(csvCell).join(',')).join('\r\n');

  return { h, raw, esc, render, api, money, moneyInput, parseMoney, date, today, qty, addDaysIso, addr, formData, options, pairsOf, toast, modal, sigPad, sigField, mountSig, pill, jobPill, openPdf, csv };
})();
