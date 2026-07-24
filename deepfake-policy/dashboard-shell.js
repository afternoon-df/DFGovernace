(function () {
  const LANG_KEY = 'deepfakePolicyLang';
  const CONTINENT_ORDER = ['Asia', 'Europe', 'Africa', 'Middle East', 'Americas', 'Oceania'];
  const CONTINENT_LABELS = {
    en: {
      Asia: 'Asia',
      Europe: 'Europe',
      Africa: 'Africa',
      'Middle East': 'Middle East',
      Americas: 'Americas',
      Oceania: 'Oceania'
    },
    ko: {
      Asia: 'x',
      Europe: 'x',
      Africa: 'x',
      'Middle East': 'x',
      Americas: 'x x',
      Oceania: 'x'
    }
  };
  let countries = [];

  async function loadCountries() {
    try {
      const response = await fetch('/w/DFGovernace/api-static/jurisdictions.json?v=20260720-jurisdictions1');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return Array.isArray(payload) ? payload : [];
    } catch (error) {
      console.warn('Jurisdiction navigation failed to load', error);
      return [];
    }
  }

  const labels = {
    en: {
      language: 'Language',
      search: 'Search',
      searchPlaceholder: 'Search country or page',
      dashboard: 'Dashboard',
      countries: 'Countries',
      coding: 'Corpus & Clause coding',
      penalties: 'What is illegal?',
      research: 'Research Topic (RQ)',
      top: 'Back to top',
      detail: 'Country detail'
    },
    ko: {
      language: 'x',
      search: 'x',
      searchPlaceholder: 'x x x x',
      dashboard: 'Dashboard',
      countries: 'Countries',
      coding: 'Corpus & Clause coding',
      penalties: 'What is illegal?',
      research: 'Research Topic (RQ)',
      top: 'x x',
      detail: 'x x'
    }
  };

  function currentLang() {
    const qs = new URLSearchParams(location.search);
    const q = qs.get('lang');
    if (q === 'ko' || q === 'en') return q;
    try { return localStorage.getItem(LANG_KEY) === 'ko' ? 'ko' : 'en'; }
    catch (_) { return 'en'; }
  }

  function withLang(path, lang = currentLang()) {
    const url = new URL(path, location.origin);
    url.searchParams.set('lang', lang);
    return url.pathname + url.search + url.hash;
  }

  function pageItems(lang) {
    const t = labels[lang];
    return [
      { key: 'dashboard', label: t.dashboard, href: '/w/DFGovernace/deepfake-policy/dashboard/index.html' },
      { key: 'countries', label: t.countries, href: '/w/DFGovernace/deepfake-policy/countries/index.html' },
      { key: 'coding', label: t.coding, href: '/w/DFGovernace/deepfake-policy/coding/index.html' },
      { key: 'penalties', label: t.penalties, href: '/w/DFGovernace/deepfake-policy/penalties/index.html' },
      { key: 'research', label: t.research, href: '/w/DFGovernace/deepfake-policy/rq/index.html' }
    ];
  }

  function activeKey() {
    const p = location.pathname;
    if (p.includes('/dashboard/') || p.includes('/geography/')) return 'dashboard';
    if (p.includes('/rq/')) return 'research';
    if (p.includes('/countries/') || p.includes('/country/')) return 'countries';
    if (p.includes('/coding/')) return 'coding';
    if (p.includes('/penalties/')) return 'penalties';
    return '';
  }

  function continentKey(country) {
    return country.continent || country.region || 'Other';
  }

  function continentLabel(continent, lang) {
    return CONTINENT_LABELS[lang]?.[continent] || continent;
  }

  function regionHtml(lang) {
    const grouped = countries.reduce((acc, c) => {
      (acc[continentKey(c)] ||= []).push(c);
      return acc;
    }, {});
    const orderedRegions = [
      ...CONTINENT_ORDER.filter((continent) => grouped[continent]),
      ...Object.keys(grouped).filter((continent) => !CONTINENT_ORDER.includes(continent))
    ];
    return orderedRegions.map((continent) => {
      const list = grouped[continent].slice().sort((a, b) => a.en.localeCompare(b.en, 'en'));
      return `
      <details class="policy-shell-region">
        <summary>${continentLabel(continent, lang)}</summary>
        <div class="policy-shell-country-list">
          ${list.map((c) => `<a class="policy-shell-country-link" href="${withLang('/w/DFGovernace/deepfake-policy/country/' + c.slug + '/index.html', lang)}">${lang === 'ko' ? c.ko : c.en}</a>`).join('')}
        </div>
      </details>
    `;
    }).join('');
  }

  function renderSearchResults(host, query, lang) {
    const q = query.trim().toLowerCase();
    if (!q) {
      host.classList.remove('is-open');
      host.innerHTML = '';
      return;
    }
    const pages = pageItems(lang).map((p) => ({ ...p, type: 'Page' }));
    const countryItems = countries.map((c) => ({
      label: lang === 'ko' ? c.ko : c.en,
      sub: continentLabel(continentKey(c), lang),
      href: '/w/DFGovernace/deepfake-policy/country/' + c.slug + '/index.html',
      type: labels[lang].detail
    }));
    const results = [...pages, ...countryItems].filter((item) => {
      const hay = [item.label, item.sub, item.type].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    }).slice(0, 9);
    host.innerHTML = results.length
      ? results.map((item) => `<button type="button" class="policy-shell-result" data-href="${withLang(item.href, lang)}">${item.label}<small>${item.sub || item.type}</small></button>`).join('')
      : `<button type="button" class="policy-shell-result">${lang === 'ko' ? 'x x x' : 'No results'}</button>`;
    host.classList.add('is-open');
  }

  function syncExistingLanguage(lang) {
    const select = document.getElementById('lang') || document.getElementById('uiLang');
    if (select && select.value !== lang) {
      select.value = lang;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  async function init() {
    if (document.querySelector('.policy-shell-sidebar')) return;
    countries = await loadCountries();
    const lang = currentLang();
    const t = labels[lang];
    document.body.classList.add('has-policy-shell');
    const active = activeKey();
    const nav = pageItems(lang).map((item) => {
      const link = `<a class="${item.key === active ? 'is-active' : ''}" data-policy-nav="${item.key}" ${item.key === 'countries' ? `aria-expanded="${active === 'countries' ? 'true' : 'false'}"` : ''} href="${withLang(item.href, lang)}">${item.label}</a>`;
      return item.key === 'countries'
        ? `${link}<div class="policy-shell-country-groups">${regionHtml(lang)}</div>`
        : link;
    }).join('');

    const aside = document.createElement('aside');
    aside.className = `policy-shell-sidebar${active === 'countries' ? ' is-country-menu-open' : ''}`;
    aside.innerHTML = `
      <a class="policy-shell-brand" href="${withLang('/w/DFGovernace/deepfake-policy/index.html', lang)}">
        <strong>DeepfakePolicy</strong>
      </a>
      <div class="policy-shell-lang">
        <label class="policy-shell-label" for="policyShellLang">${t.language}</label>
        <select id="policyShellLang">
          <option value="en" ${lang === 'en' ? 'selected' : ''}>English</option>
          <option value="ko" ${lang === 'ko' ? 'selected' : ''}>koreax</option>
        </select>
      </div>
      <div class="policy-shell-search">
        <input id="policyShellSearch" type="search" placeholder="${t.searchPlaceholder}" aria-label="${t.search}" autocomplete="off" />
        <div class="policy-shell-results" id="policyShellResults"></div>
      </div>
      <nav class="policy-shell-nav">${nav}</nav>
      <div class="policy-shell-footer">
        <a class="policy-shell-top" href="#top">${t.top}</a>
      </div>
    `;
    document.body.prepend(aside);
    if (!document.getElementById('top')) document.body.id = 'top';

    const shellLang = aside.querySelector('#policyShellLang');
    shellLang.addEventListener('change', () => {
      const next = shellLang.value;
      try { localStorage.setItem(LANG_KEY, next); } catch (_) {}
      const url = new URL(location.href);
      url.searchParams.set('lang', next);
      location.href = url.pathname + url.search + url.hash;
    });

    const search = aside.querySelector('#policyShellSearch');
    const results = aside.querySelector('#policyShellResults');
    const countriesNav = aside.querySelector('[data-policy-nav="countries"]');
    if (countriesNav) {
      countriesNav.addEventListener('click', (event) => {
        if (!aside.classList.contains('is-country-menu-open')) {
          event.preventDefault();
          aside.classList.add('is-country-menu-open');
          countriesNav.setAttribute('aria-expanded', 'true');
        }
      });
    }
    search.addEventListener('input', () => renderSearchResults(results, search.value, lang));
    results.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-href]');
      if (btn) location.href = btn.dataset.href;
    });
    document.addEventListener('click', (event) => {
      if (!aside.contains(event.target)) results.classList.remove('is-open');
    });
    syncExistingLanguage(lang);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
