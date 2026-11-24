'use strict';
const App = (() => {
  const { h, render, api } = UI;
  const state = { account: null, business: null };
  const main = document.getElementById('main');
  const sidebar = document.getElementById('sidebar');

  const routes = [
    [/^#\/signup$/, 'signup', false],
    [/^#\/setup$/, 'setup', false],
    [/^#\/$/, 'dashboard'],
    [/^#\/clients$/, 'clients'],
    [/^#\/clients\/(\d+)$/, 'client'],
    [/^#\/jobs$/, 'jobs'],
    [/^#\/jobs\/(\d+)$/, 'job'],
    [/^#\/certificates$/, 'certificates'],
    [/^#\/certificates\/new\/(\w+)$/, 'certNew'],
    [/^#\/certificates\/(\d+)$/, 'certView'],
    [/^#\/reminders$/, 'reminders'],
    [/^#\/invoices$/, 'invoices'],
    [/^#\/invoices\/(\d+)$/, 'invoice'],
    [/^#\/vat$/, 'vat'],
    [/^#\/settings$/, 'settings'],
  ];

  async function refresh() {
    state.account = await api('getAccount');
    state.business = state.account ? await api('getBusiness') : null;
  }
  const hasTrade = t => !!(state.account && state.account.trades.includes(t));

  // Menu icons: plain line drawings that take the colour of the text beside them.
  const ICONS = {
    today: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    clients: '<circle cx="10" cy="8" r="3.5"/><path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.7a3.5 3.5 0 0 1 0 6.6"/>',
    jobs: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 3h6v3.5H9zM9 12h6M9 16h4"/>',
    certificates: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 14.5l2 2 4-4.5"/>',
    reminders: '<path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>',
    invoices: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
    vat: '<path d="M7 17 17 7"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  };
  const icon = name => UI.raw(`<svg class="nav-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`);

  function nav(active) {
    const groups = [
      ['Work', [['#/', 'Today', 'today'], ['#/clients', 'Clients', 'clients'], ['#/jobs', 'Jobs', 'jobs']]],
      hasTrade('gas') && ['Compliance', [['#/certificates', 'Certificates', 'certificates'], ['#/reminders', 'Reminders', 'reminders']]],
      ['Money', [['#/invoices', 'Invoices', 'invoices'], ['#/vat', 'VAT and expenses', 'vat']]],
    ].filter(Boolean);
    const link = ([href, label, ic]) => h`<a href="${href}" class="${active === href ? 'active' : ''}"${active === href ? UI.raw(' aria-current="page"') : ''}>${icon(ic)}${label}</a>`;
    const b = state.business || {};
    document.title = b.trading_name ? `${b.trading_name} – Trades PMS` : 'Trades PMS';
    // The business comes first: it is their workspace. The product name sits under it.
    const brand = b.logo
      ? h`<div class="brand-logo" id="brand-logo"><img src="${b.logo}" alt="${b.trading_name || 'Business logo'}"></div>`
      : h`<div class="brand"><div class="brand-mark" aria-hidden="true"></div><div class="brand-text"><div class="brand-biz">${b.trading_name || 'Trades PMS'}</div>${b.trading_name ? h`<div class="brand-name">Trades PMS</div>` : ''}</div></div>`;
    render(sidebar, h`${brand}
      <nav aria-label="Main">${groups.map(([title, items]) => h`<div class="nav-group"><div class="nav-title">${title}</div>${items.map(link)}</div>`)}</nav>
      <div class="sidebar-foot"><nav aria-label="Settings">${link(['#/settings', 'Settings', 'settings'])}</nav>
        <div class="trade-chips">${state.account.trades.map(t => h`<span class="trade-chip">${Labels.trades[t]}</span>`)}</div>
        ${b.logo ? h`<div class="powered"><span class="brand-mark small" aria-hidden="true"></span>Trades PMS</div>` : ''}</div>`);
    if (b.logo) logoBand(b.logo).then(c => { const el = document.getElementById('brand-logo'); if (el) el.style.background = c; });
  }

  // The logo sits on a band the same colour as the logo's own background, so a logo
  // with a solid background blends into the sidebar header. Transparent logos sit on the sidebar.
  const bandCache = new Map();
  function logoBand(src) {
    if (bandCache.has(src)) return Promise.resolve(bandCache.get(src));
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const [r, g, bl, a] = ctx.getImageData(Math.floor(c.width / 2), 2, 1, 1).data;
        const colour = a > 200 ? `rgb(${r}, ${g}, ${bl})` : 'transparent';
        bandCache.set(src, colour);
        resolve(colour);
      };
      img.onerror = () => resolve('transparent');
      img.src = src;
    });
  }

  async function route() {
    const hash = location.hash || '#/';
    const [path, qs] = hash.split('?');
    const query = Object.fromEntries(new URLSearchParams(qs || ''));
    await refresh();
    if (!state.account && path !== '#/signup') return go('#/signup');
    if (state.account && !state.business.wizard_done && path !== '#/setup') return go('#/setup');
    const hit = routes.find(([re]) => re.test(path));
    if (!hit) return go('#/');
    const [re, view, withNav = true] = hit;
    const params = path.match(re).slice(1);
    sidebar.hidden = !withNav;
    document.getElementById('app').classList.toggle('no-nav', !withNav);
    if (withNav) nav('#/' + (path.split('/')[1] || ''));
    main.scrollTop = 0;
    try {
      await Views[view](main, params, query);
    } catch (err) {
      render(main, h`<div class="page"><div class="empty"><h2>Something went wrong</h2><p>${err.message}</p><a class="btn" href="#/">Back to Today</a></div></div>`);
      console.error(err);
    }
    main.focus({ preventScroll: true });
  }

  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  const reload = () => route();

  window.addEventListener('hashchange', route);
  window.addEventListener('DOMContentLoaded', route);
  return { state, go, reload, refresh, hasTrade };
})();
