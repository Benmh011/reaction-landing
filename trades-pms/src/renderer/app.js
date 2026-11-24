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

  function nav(active) {
    const items = [
      ['#/', 'Today'], ['#/clients', 'Clients'], ['#/jobs', 'Jobs'],
      hasTrade('gas') && ['#/certificates', 'Certificates'], hasTrade('gas') && ['#/reminders', 'Reminders'],
      ['#/invoices', 'Invoices'], ['#/vat', 'VAT and expenses'], ['#/settings', 'Settings'],
    ].filter(Boolean);
    const b = state.business || {};
    document.title = b.trading_name ? `${b.trading_name} – Trades PMS` : 'Trades PMS';
    const brand = b.logo
      ? h`<div class="brand-logo" id="brand-logo"><img src="${b.logo}" alt="${b.trading_name || 'Business logo'}"></div>`
      : h`<div class="brand"><div class="brand-mark" aria-hidden="true"></div><div><div class="brand-name">Trades PMS</div><div class="brand-biz">${b.trading_name || ''}</div></div></div>`;
    render(sidebar, h`${brand}
      <nav>${items.map(([href, label]) => h`<a href="${href}" class="${active === href ? 'active' : ''}">${label}</a>`)}</nav>
      <div class="sidebar-foot">${state.account.trades.map(t => h`<span class="trade-chip">${Labels.trades[t]}</span>`)}
        ${b.logo ? h`<div class="powered"><span class="brand-mark small" aria-hidden="true"></span>Trades PMS</div>` : ''}
        <div class="licence">Licence ${state.account.licence_key}</div></div>`);
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
