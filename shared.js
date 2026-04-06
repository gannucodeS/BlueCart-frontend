/**
 * BlueCart — Shared JavaScript
 * Included on every page. Handles:
 *  - Session-aware navbar
 *  - Location panel (with API-based pincode lookup)
 *  - Search redirect
 *  - Cart sidebar
 *  - Product view linking
 *  - goOrders redirect
 */

// ── CART ─────────────────────────────────────────────────────────────────────
var cartItems = [], cartOpen = false;

function toggleCart() {
  cartOpen = !cartOpen;
  var c = document.getElementById('cart'), o = document.getElementById('cart-overlay');
  if (c) c.classList.toggle('active', cartOpen);
  if (o) o.classList.toggle('open', cartOpen);
}
function addToCart(name, price, qty) {
  qty = qty || 1;
  for (var i = 0; i < qty; i++) cartItems.push({ name: name, price: price });
  renderCart();
  showToast('Added: ' + name);
}
function removeFromCart(i) { cartItems.splice(i, 1); renderCart(); }
function renderCart() {
  var list  = document.getElementById('cart-items');
  var total = document.getElementById('cart-total');
  var count = document.getElementById('cart-count');
  if (count) count.textContent = cartItems.length;
  if (!list) return;
  if (!cartItems.length) {
    list.innerHTML = '<div class="empty-cart"><div class="icon">&#128722;</div><p>Your cart is empty</p></div>';
    if (total) total.textContent = '₹0';
    return;
  }
  list.innerHTML = cartItems.map(function(item, i) {
    return '<li class="cart-item"><div><div class="cart-item-name">' + item.name +
      '</div><div class="cart-item-price">₹' + item.price.toLocaleString('en-IN') +
      '</div></div><button class="remove-btn" onclick="removeFromCart(' + i + ')">Remove</button></li>';
  }).join('');
  var sum = cartItems.reduce(function(a, b) { return a + b.price; }, 0);
  if (total) total.textContent = '₹' + sum.toLocaleString('en-IN');
}
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2800);
}
function requireLogin(callback) {
  if (typeof BC !== 'undefined') {
    BC.ready.then(function() {
      return BC.getSession();
    }).then(function(sess) {
      if (!sess) {
        sessionStorage.setItem('bc_redirect', window.location.href);
        window.location.href = 'login.html';
        return false;
      }
      if (callback) callback();
      return true;
    }).catch(function() {
      sessionStorage.setItem('bc_redirect', window.location.href);
      window.location.href = 'login.html';
    });
  } else {
    window.location.href = 'login.html';
  }
}
function buyNow(name, img, price) {
  requireLogin(function() {
    var p = new URLSearchParams();
    p.set('name', name); p.set('img', img || ''); p.set('price', price); p.set('mode', 'buynow');
    window.location.href = 'checkout.html?' + p.toString();
  });
}
function checkoutCart() {
  if (!cartItems.length) { showToast('Your cart is empty!'); return; }
  requireLogin(function() {
    var p = new URLSearchParams();
    p.set('mode', 'cart'); p.set('items', JSON.stringify(cartItems));
    window.location.href = 'checkout.html?' + p.toString();
  });
}

// ── SEARCH ────────────────────────────────────────────────────────────────────
function doSearchNav() {
  var inp = document.getElementById('searchInput') || document.getElementById('navSearch');
  var q   = inp ? inp.value.trim() : '';
  if (q) window.location.href = 'search.html?q=' + encodeURIComponent(q);
}

// ── LIVE SEARCH SUGGESTIONS ─────────────────────────────────────────────────
var searchTimeout = null;
var suggestionsData = null;

function initSearchSuggestions() {
  var searchInputs = document.querySelectorAll('#searchInput, #navSearch');
  searchInputs.forEach(function(inp) {
    if (inp.dataset.suggestionsInit) return;
    inp.dataset.suggestionsInit = 'true';
    
    inp.addEventListener('input', function(e) {
      var q = e.target.value.trim();
      if (q.length < 2) {
        hideSearchSuggestions();
        return;
      }
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function() {
        fetchSearchSuggestions(q);
      }, 300);
    });
    
    inp.addEventListener('focus', function(e) {
      var q = e.target.value.trim();
      if (q.length >= 2 && suggestionsData) {
        showSearchSuggestions();
      }
    });
    
    inp.addEventListener('blur', function() {
      setTimeout(hideSearchSuggestions, 200);
    });
  });
}

function fetchSearchSuggestions(q) {
  if (typeof BC === 'undefined' || !BC.searchProducts) {
    return;
  }
  BC.ready.then(function() {
    return BC.searchProducts(q);
  }).then(function(res) {
    if (res && res.products) {
      suggestionsData = res;
      showSearchSuggestions();
    }
  }).catch(function() {
    suggestionsData = null;
  });
}

function showSearchSuggestions() {
  var inp = document.getElementById('searchInput') || document.getElementById('navSearch');
  if (!inp || !suggestionsData) return;
  
  var container = document.getElementById('search-suggestions');
  if (!container) {
    container = document.createElement('div');
    container.id = 'search-suggestions';
    container.className = 'search-suggestions';
    inp.parentNode.appendChild(container);
  }
  
  var html = '';
  
  // Categories
  if (suggestionsData.categories && suggestionsData.categories.length) {
    html += '<div class="suggest-section"><div class="suggest-label">Categories</div>';
    suggestionsData.categories.forEach(function(cat) {
      html += '<a class="suggest-item" href="search.html?q=' + encodeURIComponent(cat) + '">' + cat + '</a>';
    });
    html += '</div>';
  }
  
  // Brands
  if (suggestionsData.brands && suggestionsData.brands.length) {
    html += '<div class="suggest-section"><div class="suggest-label">Brands</div>';
    suggestionsData.brands.forEach(function(brand) {
      html += '<a class="suggest-item" href="search.html?q=' + encodeURIComponent(brand) + '">' + brand + '</a>';
    });
    html += '</div>';
  }
  
  // Products
  if (suggestionsData.products && suggestionsData.products.length) {
    html += '<div class="suggest-section"><div class="suggest-label">Products</div>';
    suggestionsData.products.forEach(function(p) {
      var img = p.imageUrl || 'https://via.placeholder.com/40';
      html += '<a class="suggest-item suggest-product" href="product.html?name=' + encodeURIComponent(p.name) + '&price=' + (p.price || 0) + '&img=' + encodeURIComponent(img) + '&cat=' + encodeURIComponent(p.category || '') + '">';
      html += '<img src="' + img + '" alt=""/>';
      html += '<div class="suggest-prod-info"><span class="suggest-prod-name">' + p.name + '</span>';
      html += '<span class="suggest-prod-cat">' + p.category + '</span></div>';
      html += '<span class="suggest-prod-price">₹' + (p.price ? p.price.toLocaleString('en-IN') : '') + '</span>';
      html += '</a>';
    });
    html += '</div>';
  }
  
  if (!html) {
    hideSearchSuggestions();
    return;
  }
  
  container.innerHTML = html;
  container.style.display = 'block';
}

function hideSearchSuggestions() {
  var container = document.getElementById('search-suggestions');
  if (container) container.style.display = 'none';
}

// Add CSS for suggestions
function addSuggestionStyles() {
  var style = document.createElement('style');
  style.textContent = `
    .search-suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      max-height: 400px;
      overflow-y: auto;
      z-index: 9999;
      display: none;
    }
    .suggest-section { padding: 8px 0; border-bottom: 1px solid #eee; }
    .suggest-section:last-child { border-bottom: none; }
    .suggest-label { padding: 4px 16px; font-size: 11px; font-weight: 800; color: #6b7a8d; text-transform: uppercase; }
    .suggest-item { display: block; padding: 10px 16px; color: #0f2d4a; text-decoration: none; font-size: 14px; }
    .suggest-item:hover { background: #f4f7fb; }
    .suggest-product { display: flex; align-items: center; gap: 12px; }
    .suggest-product img { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; }
    .suggest-prod-info { flex: 1; }
    .suggest-prod-name { font-weight: 600; display: block; }
    .suggest-prod-cat { font-size: 12px; color: #6b7a8d; }
    .suggest-prod-price { font-weight: 700; color: #0ea5a0; }
    .search-bar { position: relative; }
  `;
  document.head.appendChild(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    initSearchSuggestions();
    addSuggestionStyles();
  });
} else {
  initSearchSuggestions();
  addSuggestionStyles();
}

// ── SCROLL TO PRODUCTS ─────────────────────────────────────────────────────────
function scrollToProducts() {
  var el = document.getElementById('products-section');
  if (!el) {
    el = document.querySelector('#products-section') || 
         document.querySelector('.products-grid') || 
         document.querySelector('.dotd-body') || 
         document.querySelector('.deal-card') ||
         document.querySelector('.section-header + .products-grid');
  }
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 400, behavior: 'smooth' });
  }
}

// ── ORDERS REDIRECT ───────────────────────────────────────────────────────────
function goOrders() {
  BC.ready.then(function() { return BC.getSession(); }).then(function(sess) {
    if (!sess) { sessionStorage.setItem('bc_redirect', 'orders.html'); window.location.href = 'login.html'; }
    else window.location.href = 'orders.html';
  });
}

// ── LOCATION PANEL ────────────────────────────────────────────────────────────
var _LOC_CITIES = {
  'Rajasthan':    ['Jaipur','Jodhpur','Udaipur','Kota','Ajmer','Bikaner','Bhilwara','Alwar'],
  'Maharashtra':  ['Mumbai','Pune','Nagpur','Thane','Nashik','Aurangabad'],
  'Delhi':        ['New Delhi','Dwarka','Rohini','Saket','Lajpat Nagar'],
  'Karnataka':    ['Bengaluru','Mysuru','Hubli','Mangaluru'],
  'Tamil Nadu':   ['Chennai','Coimbatore','Madurai','Salem'],
  'Gujarat':      ['Ahmedabad','Surat','Vadodara','Rajkot'],
  'Uttar Pradesh':['Lucknow','Kanpur','Agra','Varanasi','Noida','Meerut'],
  'West Bengal':  ['Kolkata','Howrah','Asansol','Siliguri'],
  'Telangana':    ['Hyderabad','Warangal','Nizamabad'],
  'Madhya Pradesh':['Bhopal','Indore','Gwalior','Jabalpur'],
  'Kerala':       ['Thiruvananthapuram','Kochi','Kozhikode'],
  'Punjab':       ['Ludhiana','Amritsar','Jalandhar'],
  'Haryana':      ['Gurugram','Faridabad','Panipat'],
  'Bihar':        ['Patna','Gaya','Bhagalpur'],
  'Goa':          ['Panaji','Margao']
};

function toggleLocationPanel() {
  var p = document.getElementById('loc-panel'), o = document.getElementById('loc-overlay');
  if (!p) return;
  var open = p.style.display === 'block';
  p.style.display = open ? 'none' : 'block';
  if (o) o.style.display = open ? 'none' : 'block';
}
function closeLocationPanel() {
  var p = document.getElementById('loc-panel'), o = document.getElementById('loc-overlay');
  if (p) p.style.display = 'none';
  if (o) o.style.display = 'none';
}
function setLocationDisplay(city, state) {
  var el = document.getElementById('location-display');
  if (el) el.textContent = '\uD83D\uDCCD ' + city;
  if (state) localStorage.setItem('bc_location_state', state);
  localStorage.setItem('bc_location', city);
  closeLocationPanel();
}

async function applyPincode() {
  var pin = (document.getElementById('loc-pincode') || {}).value;
  if (!pin) return;
  pin = pin.trim();
  var res = document.getElementById('pin-result');
  
  if (pin.length !== 6) { 
    if (res) res.innerHTML = '<span style="color:#dc2626">Enter a valid 6-digit pincode.</span>'; 
    return; 
  }
  
  if (res) res.innerHTML = '<span style="color:#6b7a8d">Checking...</span>';
  
  if (typeof BC !== 'undefined') {
    try {
      var data = await BC.getPincodeDetails(pin);
      if (data.ok) {
        if (res) res.innerHTML = '<span style="color:#16a34a">&#10003; Delivering to <b>' + data.city + ', ' + data.state + '</b></span>';
        setLocationDisplay(data.city, data.state);
      } else {
        if (res) res.innerHTML = '<span style="color:#dc2626">' + (data.error || 'Pincode not found') + '</span>';
      }
    } catch (e) {
      if (res) res.innerHTML = '<span style="color:#dc2626">Error checking pincode. Please try again.</span>';
    }
  } else {
    if (res) res.innerHTML = '<span style="color:#0ea5a0">Pincode ' + pin + ' \u2014 delivery available.</span>';
    setLocationDisplay(pin);
  }
}

function loadCities() {
  var s = document.getElementById('loc-state'), c = document.getElementById('loc-city');
  if (!s || !c) return;
  c.innerHTML = '<option value="">Select City</option>';
  (_LOC_CITIES[s.value] || []).forEach(function(ct) {
    var o = document.createElement('option'); o.value = ct; o.textContent = ct; c.appendChild(o);
  });
}
function applyStateCity() {
  var s = document.getElementById('loc-state'), c = document.getElementById('loc-city');
  if (!s || !c || !s.value || !c.value) { alert('Please select both state and city.'); return; }
  setLocationDisplay(c.value, s.value);
}
function setCity(city, state) {
  var s = document.getElementById('loc-state');
  if (s) { s.value = state; loadCities(); }
  setTimeout(function() { var c = document.getElementById('loc-city'); if (c) c.value = city; }, 60);
  setLocationDisplay(city, state);
}

// ── SESSION-AWARE NAVBAR ──────────────────────────────────────────────────────
function initSharedNavbar() {
  // Restore saved location
  var saved = localStorage.getItem('bc_location');
  if (saved) { var el = document.getElementById('location-display'); if (el) el.textContent = '\uD83D\uDCCD ' + saved; }

  // Wire pincode enter key
  var pinEl = document.getElementById('loc-pincode');
  if (pinEl) pinEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') applyPincode(); });

  // Wire search enter key
  var searchEl = document.getElementById('searchInput') || document.getElementById('navSearch');
  if (searchEl) searchEl.addEventListener('keydown', function(e) { if (e.key === 'Enter') doSearchNav(); });

  // Session-aware navbar
  if (typeof BC !== 'undefined') {
    BC.ready.then(function() { return BC.getSession(); }).then(function(sess) {
      if (!sess) return;
      var greet = document.getElementById('account-greeting');
      var label = document.getElementById('account-label');
      var link  = document.getElementById('account-link');
      if (greet) greet.textContent = 'Hello, ' + sess.name.split(' ')[0];
      if (label) label.textContent = 'My Account';
      if (link)  link.href = sess.role === 'admin' ? 'admin.html' : 'account.html';
    }).catch(function() {});
  }
}

// ── PRODUCT VIEW LINKING ──────────────────────────────────────────────────────
function attachProductLinks() {
  function goProduct(name, price, img, cat) {
    window.location.href = 'product.html?name=' + encodeURIComponent(name) +
      '&price=' + price + '&img=' + encodeURIComponent(img || '') + '&cat=' + encodeURIComponent(cat || 'Electronics');
  }
  function getImg(card) { var i = card.querySelector('img'); return i ? i.src : ''; }
  function getNum(el) { return el ? parseInt(el.textContent.replace(/[^0-9]/g,'')) || 0 : 0; }
  function noBtn(e) { return e.target.closest('.wishlist-btn,.btn-cart,.btn-buy,.add-to-cart,.new-wishlist,.new-add-btn,.deal-btn,.exp-cart,.exp-buy,.explore-btns'); }

  function link(card, nameEl, priceEl, catTxt, pid) {
    if (!nameEl || card.dataset.pvLinked) return;
    card.dataset.pvLinked = '1';
    var name = nameEl.textContent.trim();
    var price = getNum(priceEl);
    var img   = getImg(card);
    var cat   = catTxt || 'Electronics';
    function go(e) {
      if (noBtn(e)) return; e.stopPropagation();
      if (pid) window.location.href = 'product.html?id=' + encodeURIComponent(pid);
      else goProduct(name, price, img, cat);
    }
    var wrap = card.querySelector('.prod-img-wrap,.new-img-wrap,.explore-img-wrap');
    var dimg = card.querySelector('.deal-img');
    [wrap, dimg, nameEl].forEach(function(el) {
      if (!el) return; el.style.cursor = 'pointer'; el.addEventListener('click', go);
    });
  }

  document.querySelectorAll('.product-card').forEach(function(c) {
    link(c, c.querySelector('.prod-name'), c.querySelector('.price-now'), (c.querySelector('.prod-category') || {}).textContent, c.dataset.dbid || null);
  });
  document.querySelectorAll('.deal-card').forEach(function(c) {
    link(c, c.querySelector('.deal-name'), c.querySelector('.deal-price-now'), (c.querySelector('.deal-cat') || {}).textContent, null);
  });
  document.querySelectorAll('.new-card').forEach(function(c) {
    link(c, c.querySelector('.new-name'), c.querySelector('.new-price-now'), (c.querySelector('.new-cat') || {}).textContent, null);
  });
  document.querySelectorAll('.explore-card').forEach(function(c) {
    link(c, c.querySelector('.explore-name'), c.querySelector('.exp-now'), (c.querySelector('.explore-cat') || {}).textContent, null);
  });
}

// ── WISHLIST BUTTONS ──────────────────────────────────────────────────────────
function initWishlist() {
  document.querySelectorAll('.wishlist-btn, .new-wishlist').forEach(function(btn) {
    if (btn.dataset.wishLinked) return;
    btn.dataset.wishLinked = '1';
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      var filled = '\u2764\uFE0F', empty = '\uD83E\uDD0D';
      btn.textContent = btn.textContent.indexOf('\u2764') !== -1 ? empty : filled;
    });
  });
}


// ── HAMBURGER DRAWER ──────────────────────────────────────────────────────────
function toggleHamburger() {
  var btn     = document.getElementById('hamburger-btn');
  var drawer  = document.getElementById('hm-drawer');
  var overlay = document.getElementById('hm-overlay');
  if (!drawer) return;
  var open = drawer.classList.contains('open');
  drawer.classList.toggle('open', !open);
  if (overlay) overlay.classList.toggle('open', !open);
  if (btn) btn.classList.toggle('open', !open);
}
function closeHamburger() {
  var btn     = document.getElementById('hamburger-btn');
  var drawer  = document.getElementById('hm-drawer');
  var overlay = document.getElementById('hm-overlay');
  if (drawer)  drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (btn)     btn.classList.remove('open');
}
// Close drawer on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeHamburger();
});

// ── AUTO-INIT ─────────────────────────────────────────────────────────────────
(function() {
  function run() {
    initSharedNavbar();
    attachProductLinks();
    initWishlist();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  // Re-run for DB-injected cards
  setTimeout(function() { attachProductLinks(); initWishlist(); }, 800);
  setTimeout(function() { attachProductLinks(); initWishlist(); }, 2500);
})();
