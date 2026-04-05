/**
 * BlueCart — Shared Filter & Sort Engine
 * Included on product listing pages.
 * Uses data-* attributes set by each page's config.
 *
 * Page must set window.PAGE_FILTER_CONFIG = { brands: [], label: '' }
 * before including this file, or the filter bar inits with defaults.
 */
(function() {
  'use strict';

  var cfg = window.PAGE_FILTER_CONFIG || { brands: [], label: 'Products' };
  var allCards  = [];
  var activeMin = 0, activeMax = 99999999;
  var activeBrands = [], activeKW = '', activeSort = 'featured';

  // ── COLLECT CARDS ──────────────────────────────────────────────────────────
  function collectCards() {
    allCards = [];
    document.querySelectorAll('.product-card').forEach(function(card) {
      var nameEl  = card.querySelector('.prod-name');
      var priceEl = card.querySelector('.price-now');
      if (!nameEl || !priceEl) return;
      var name  = nameEl.textContent.trim();
      var price = parseInt(priceEl.textContent.replace(/[^0-9]/g, '')) || 0;
      var mrpEl = card.querySelector('.price-old');
      var mrp   = mrpEl ? parseInt(mrpEl.textContent.replace(/[^0-9]/g, '')) || price : price;
      var catEl = card.querySelector('.prod-category');
      var cat   = catEl ? catEl.textContent.trim() : '';
      // Detect brand from name/category text
      var brand = '';
      (cfg.brands || []).forEach(function(b) {
        if (name.toLowerCase().indexOf(b.toLowerCase()) !== -1 || cat.indexOf(b) !== -1) brand = b;
      });
      allCards.push({ el: card, name: name.toLowerCase(), brand: brand, price: price, mrp: mrp, cat: cat.toLowerCase() });
    });
    updateCount(allCards.length);
  }

  // ── FILTER ─────────────────────────────────────────────────────────────────
  function runFilter() {
    var shown = 0;
    allCards.forEach(function(item) {
      var ok = true;
      if (item.price < activeMin || item.price > activeMax) ok = false;
      if (activeBrands.length && activeBrands.indexOf(item.brand) === -1) ok = false;
      if (activeKW && item.name.indexOf(activeKW) === -1 && item.cat.indexOf(activeKW) === -1) ok = false;
      item.el.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    updateCount(shown);
    doSort();
  }

  function updateCount(n) {
    var el = document.getElementById('pg-result-count');
    if (el) el.textContent = n + ' product' + (n !== 1 ? 's' : '') + (activeKW ? ' matching "' + activeKW + '"' : '');
  }

  // ── SORT ───────────────────────────────────────────────────────────────────
  function doSort() {
    var grid = document.querySelector('.products-grid');
    if (!grid) return;
    var vis = allCards.filter(function(c) { return c.el.style.display !== 'none'; });
    if (activeSort === 'price-asc')  vis.sort(function(a, b) { return a.price - b.price; });
    if (activeSort === 'price-desc') vis.sort(function(a, b) { return b.price - a.price; });
    if (activeSort === 'discount')   vis.sort(function(a, b) { return (b.mrp - b.price) - (a.mrp - a.price); });
    if (activeSort === 'name-asc')   vis.sort(function(a, b) { return a.name.localeCompare(b.name); });
    if (activeSort === 'name-desc')  vis.sort(function(a, b) { return b.name.localeCompare(a.name); });
    vis.forEach(function(item) { grid.appendChild(item.el); });
  }

  // ── BUILD FILTER BAR ───────────────────────────────────────────────────────
  function buildFilterBar() {
    var existing = document.getElementById('shared-filter-bar');
    if (existing) return; // already built

    var priceChips = (cfg.priceChips || [
      { label: 'All', min: 0, max: 99999999 },
      { label: 'Under ₹;10K', min: 0, max: 10000 },
      { label: '₹;10K\u201325K', min: 10000, max: 25000 },
      { label: '₹;25K\u201350K', min: 25000, max: 50000 },
      { label: '₹;50K+', min: 50000, max: 99999999 }
    ]);

    var bar = document.createElement('div');
    bar.id = 'shared-filter-bar';
    bar.style.cssText = 'background:white;border-radius:14px;padding:14px 18px;margin:0 0 16px;box-shadow:0 2px 10px rgba(15,45,74,.07);border:1.5px solid #e5eaf0;';

    // Row 1: Search + count + clear
    bar.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px;">' +
        '<span style="font-size:11px;font-weight:900;color:#0f2d4a;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">&#127775; Filter &amp; Sort</span>' +
        '<div style="flex:1;display:flex;background:#f4f7fb;border-radius:8px;overflow:hidden;height:34px;min-width:160px;max-width:300px;">' +
          '<input type="text" id="pg-search-inp" placeholder="Search ' + (cfg.label || 'products') + '..." ' +
            'style="flex:1;border:none;background:transparent;padding:0 11px;font-size:13px;font-family:Nunito,sans-serif;outline:none;color:#0f2d4a;" ' +
            'oninput="sfSearch(this.value)"/>' +
          '<button onclick="sfSearch(document.getElementById(\'pg-search-inp\').value)" ' +
            'style="background:#0ea5a0;border:none;padding:0 11px;color:white;cursor:pointer;font-size:14px;">&#128269;</button>' +
        '</div>' +
        '<span id="pg-result-count" style="font-size:12px;font-weight:800;color:#6b7a8d;white-space:nowrap;"></span>' +
        '<button onclick="sfClearAll()" style="background:none;border:1.5px solid #e0e7ef;color:#6b7a8d;padding:5px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Nunito,sans-serif;white-space:nowrap;">&#10005; Clear</button>' +
      '</div>' +
      // Row 2: Price chips
      '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:9px;">' +
        '<span style="font-size:11px;font-weight:900;color:#0f2d4a;white-space:nowrap;">PRICE:</span>' +
        priceChips.map(function(c, i) {
          return '<span class="filter-chip price-chip' + (i === 0 ? ' active' : '') + '" ' +
            'style="cursor:pointer;" ' +
            'onclick="sfSetPrice(' + c.min + ',' + c.max + ',this)">' + c.label + '</span>';
        }).join('') +
      '</div>' +
      // Row 3: Brand chips
      '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:9px;">' +
        '<span style="font-size:11px;font-weight:900;color:#0f2d4a;white-space:nowrap;">BRAND:</span>' +
        (cfg.brands || []).map(function(b) {
          return '<span class="filter-chip brand-chip" style="cursor:pointer;" onclick="sfToggleBrand(\'' + b + '\',this)">' + b + '</span>';
        }).join('') +
      '</div>' +
      // Row 4: Sort buttons
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
        '<span style="font-size:11px;font-weight:900;color:#0f2d4a;white-space:nowrap;">SORT:</span>' +
        ['featured:Featured','price-asc:Price &#8593;','price-desc:Price &#8595;','discount:Best Discount','name-asc:A&#8594;Z'].map(function(s) {
          var parts = s.split(':'); var val = parts[0]; var lbl = parts[1];
          return '<button class="sort-btn' + (val === 'featured' ? ' sort-active' : '') + '" data-val="' + val + '" ' +
            'onclick="sfSetSort(\'' + val + '\',this)" ' +
            'style="border:1.5px solid #e0e7ef;border-radius:7px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;background:white;font-family:Nunito,sans-serif;color:#0f2d4a;transition:all .2s;">' +
            lbl + '</button>';
        }).join('') +
      '</div>';

    // Insert before products-grid
    var grid = document.querySelector('.products-grid');
    if (grid && grid.parentNode) {
      grid.parentNode.insertBefore(bar, grid);
    }

    // Style active states
    if (!document.getElementById('sf-style')) {
      var style = document.createElement('style');
      style.id = 'sf-style';
      style.textContent =
        '.sort-btn.sort-active{background:#0f2d4a!important;color:white!important;border-color:#0f2d4a!important;}' +
        '.price-chip.active,.brand-chip.active{background:#0ea5a0!important;color:white!important;border-color:#0ea5a0!important;}' +
        '@media(max-width:600px){#shared-filter-bar{padding:10px 12px;}.sort-btn{padding:4px 8px;font-size:11px;}}';
      document.head.appendChild(style);
    }
  }

  // ── PUBLIC FUNCTIONS (window.*) ────────────────────────────────────────────
  window.sfSetPrice = function(mn, mx, el) {
    activeMin = mn; activeMax = mx;
    document.querySelectorAll('.price-chip').forEach(function(c) { c.classList.remove('active'); });
    if (el) el.classList.add('active');
    runFilter();
  };
  window.sfToggleBrand = function(b, el) {
    var i = activeBrands.indexOf(b);
    if (i === -1) { activeBrands.push(b); if (el) el.classList.add('active'); }
    else { activeBrands.splice(i, 1); if (el) el.classList.remove('active'); }
    runFilter();
  };
  window.sfSetSort = function(val, el) {
    activeSort = val;
    document.querySelectorAll('.sort-btn').forEach(function(b) { b.classList.remove('sort-active'); });
    if (el) el.classList.add('sort-active');
    else document.querySelectorAll('.sort-btn[data-val="' + val + '"]').forEach(function(b) { b.classList.add('sort-active'); });
    doSort();
  };
  window.sfSearch = function(q) {
    activeKW = q.toLowerCase().trim();
    runFilter();
  };
  window.sfClearAll = function() {
    activeMin = 0; activeMax = 99999999; activeBrands = []; activeKW = ''; activeSort = 'featured';
    document.querySelectorAll('.price-chip').forEach(function(c, i) { c.classList.toggle('active', i === 0); });
    document.querySelectorAll('.brand-chip').forEach(function(c) { c.classList.remove('active'); });
    document.querySelectorAll('.sort-btn').forEach(function(b) { b.classList.toggle('sort-active', b.dataset.val === 'featured'); });
    var ki = document.getElementById('pg-search-inp'); if (ki) ki.value = '';
    allCards.forEach(function(c) { c.el.style.display = ''; });
    updateCount(allCards.length);
  };

  // ── INIT ───────────────────────────────────────────────────────────────────
  function init() {
    buildFilterBar();
    collectCards();
    // Read URL search query
    var q = new URLSearchParams(window.location.search).get('q');
    if (q) {
      activeKW = q.toLowerCase();
      var ki = document.getElementById('pg-search-inp');
      if (ki) ki.value = q;
      runFilter();
    }
    // Re-collect after DB products inject
    setTimeout(function() { collectCards(); if (activeKW || activeBrands.length || activeMin > 0 || activeMax < 99999999) runFilter(); }, 1000);
    setTimeout(function() { collectCards(); if (activeKW || activeBrands.length || activeMin > 0 || activeMax < 99999999) runFilter(); }, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
