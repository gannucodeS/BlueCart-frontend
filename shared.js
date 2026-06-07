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

// ── IN-MEMORY API CACHE ───────────────────────────────────────────────────────
// Persists across InstantClick navigations; avoids redundant API calls
window.__cache = window.__cache || {};

// ── CART ─────────────────────────────────────────────────────────────────────
// Load cart from localStorage to persist across pages
// Use window.cartItems for global access from all pages
window.cartItems = JSON.parse(localStorage.getItem('bc_cart') || '[]');
var cartOpen = false;

// Also expose as local var for backward compatibility
var cartItems = window.cartItems;

// ── CACHE WRAPPERS FOR BC API ────────────────────────────────────────────────
// Prevent redundant API calls across InstantClick navigations
(function() {
  if (typeof BC === 'undefined' || window.__cacheWrapped) return;
  window.__cacheWrapped = true;
  var PROD_TTL  = 300000;
  var SESS_TTL  = 60000;

  var _origGetAll = BC.getAllProducts;
  BC.getAllProducts = function() {
    var c = window.__cache.products;
    if (c && Date.now() - c.ts < c.ttl) return Promise.resolve(c.data);
    return _origGetAll.call(BC).then(function(data) {
      window.__cache.products = { data: data, ts: Date.now(), ttl: PROD_TTL };
      return data;
    });
  };

  var _origGetByCat = BC.getProductsByCategory;
  BC.getProductsByCategory = function(cat) {
    var c = window.__cache.products;
    if (c && Date.now() - c.ts < c.ttl) {
      var filtered = cat ? c.data.filter(function(p) { return p.category === cat; }) : c.data;
      return Promise.resolve(filtered);
    }
    return _origGetByCat.call(BC, cat).then(function(data) {
      window.__cache.products = { data: data, ts: Date.now(), ttl: PROD_TTL };
      return data;
    });
  };

  var _origGetSess = BC.getSession;
  BC.getSession = function() {
    var c = window.__cache.session;
    if (c && Date.now() - c.ts < c.ttl) return Promise.resolve(c.data);
    return _origGetSess.call(BC).then(function(data) {
      window.__cache.session = { data: data, ts: Date.now(), ttl: SESS_TTL };
      return data;
    });
  };
})();

function saveCart() {
  window.cartItems = window.cartItems || [];
  localStorage.setItem('bc_cart', JSON.stringify(window.cartItems));
}

function toggleCart() {
  cartOpen = !cartOpen;
  var c = document.getElementById('cart'), o = document.getElementById('cart-overlay');
  if (c) c.classList.toggle('active', cartOpen);
  if (o) o.classList.toggle('open', cartOpen);
}
function addToCart(name, price, qty, imageUrl) {
  window.cartItems = window.cartItems || [];
  qty = qty || 1;
  for (var i = 0; i < qty; i++) window.cartItems.push({ name: name, price: price, imageUrl: imageUrl || '' });
  saveCart();
  renderCart();
  showToast('Added: ' + name);
}
function handleAddToCart(btn) {
  var name = btn.getAttribute('data-name') || '';
  var price = parseFloat(btn.getAttribute('data-price')) || 0;
  var img = btn.getAttribute('data-img') || '';
  var qty = window.currentQty || 1;
  addToCart(name, price, qty, img);
}
function handleBuyNow(btn) {
  var id = btn.getAttribute('data-id') || '';
  var name = btn.getAttribute('data-name') || '';
  var img = btn.getAttribute('data-img') || '';
  var price = parseFloat(btn.getAttribute('data-price')) || 0;
  buyNow(id, name, img, price);
}
function removeFromCart(i) { 
  window.cartItems = window.cartItems || [];
  window.cartItems.splice(i, 1); 
  saveCart(); 
  renderCart(); 
}
function clearCart() {
  window.cartItems = [];
  saveCart();
  renderCart();
  showToast('Cart cleared');
}
window.clearCart = clearCart;

// ── WISHLIST ─────────────────────────────────────────────────────────────────
window.wishlistItems = JSON.parse(localStorage.getItem('bc_wishlist') || '[]');

function saveWishlist() {
  window.wishlistItems = window.wishlistItems || [];
  localStorage.setItem('bc_wishlist', JSON.stringify(window.wishlistItems));
}

function toggleWishlistDropdown() {
  var dropdown = document.getElementById('wishlist-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}

function showWishlistDropdown() {
  var dropdown = document.getElementById('wishlist-dropdown');
  if (dropdown) {
    renderWishlistDropdown();
    dropdown.classList.add('show');
  }
}

function hideWishlistDropdown() {
  var dropdown = document.getElementById('wishlist-dropdown');
  if (dropdown) {
    dropdown.classList.remove('show');
  }
}

function renderWishlistDropdown() {
  var dropdown = document.getElementById('wishlist-dropdown');
  var countEl = document.getElementById('wishlist-count');
  if (!dropdown) return;
  
  // Check login status first
  if (typeof BC !== 'undefined') {
    BC.ready.then(function() {
      return BC.getSession();
    }).then(function(sess) {
      if (!sess) {
        // Not logged in - show sign in option
        if (countEl) countEl.textContent = '0';
        dropdown.innerHTML = '<div class="wishlist-signin">' +
          '<p>Sign in to save your favorite products</p>' +
          '<a href="/login" class="wishlist-signin-btn">Sign In</a>' +
        '</div>';
        return;
      }
      
      // Logged in - show wishlist items
      if (countEl) countEl.textContent = window.wishlistItems.length;
      
      if (!window.wishlistItems.length) {
        dropdown.innerHTML = '<div class="wishlist-empty">Your wishlist is empty</div>';
        return;
      }
      
      renderWishlistItems(dropdown);
    }).catch(function() {
      if (countEl) countEl.textContent = '0';
      dropdown.innerHTML = '<div class="wishlist-empty">Your wishlist is empty</div>';
    });
  } else {
    if (countEl) countEl.textContent = window.wishlistItems.length;
    if (!window.wishlistItems.length) {
      dropdown.innerHTML = '<div class="wishlist-empty">Your wishlist is empty</div>';
      return;
    }
    renderWishlistItems(dropdown);
  }
}

function renderWishlistItems(dropdown) {
  dropdown.innerHTML = window.wishlistItems.map(function(item, i) {
    var img = item.imageUrl || 'https://placehold.co/60x60?text=W';
    return '<div class="wishlist-item">' +
      '<img src="' + img + '" class="wishlist-item-img" onerror="this.src=\'https://placehold.co/60x60?text=W\'" alt="' + item.name + '"/>' +
      '<div class="wishlist-item-info">' +
        '<div class="wishlist-item-name">' + item.name + '</div>' +
        '<div class="wishlist-item-price">₹' + (item.price || 0).toLocaleString('en-IN') + '</div>' +
      '</div>' +
      '<div class="wishlist-item-actions">' +
        '<button class="wishlist-btn-action buy" data-id="' + (item.id || '') + '" data-name="' + (item.name || '') + '" data-img="' + (item.imageUrl || '') + '" data-price="' + (item.price || 0) + '">Buy Now</button>' +
        '<button class="wishlist-btn-action cart" data-name="' + (item.name || '') + '" data-price="' + (item.price || 0) + '" data-img="' + (item.imageUrl || '') + '">Add to Cart</button>' +
        '<button class="wishlist-btn-remove" onclick="removeFromWishlist(' + i + ')">' + Icons.close + '</button>' +
      '</div>' +
    '</div>';
  }).join('');
  
  dropdown.querySelectorAll('.wishlist-btn-action.buy').forEach(function(btn) {
    btn.onclick = function() {
      var id = btn.getAttribute('data-id') || '';
      var name = btn.getAttribute('data-name') || '';
      var img = btn.getAttribute('data-img') || '';
      var price = parseFloat(btn.getAttribute('data-price')) || 0;
      buyNow(id, name, img, price);
    };
  });
  
  dropdown.querySelectorAll('.wishlist-btn-action.cart').forEach(function(btn) {
    btn.onclick = function() {
      var name = btn.getAttribute('data-name') || '';
      var price = parseFloat(btn.getAttribute('data-price')) || 0;
      var img = btn.getAttribute('data-img') || '';
      addToCart(name, price, 1, img);
    };
  });
}

function addToWishlist(product) {
  window.wishlistItems = window.wishlistItems || [];
  var exists = window.wishlistItems.some(function(item) {
    return item.id === product.id || item.name === product.name;
  });
  if (!exists) {
    window.wishlistItems.push({
      id: product.id || '',
      name: product.name || '',
      price: product.price || 0,
      imageUrl: product.imageUrl || ''
    });
    saveWishlist();
    updateWishlistCount();
    showToast('Added to wishlist: ' + product.name);
  }
}

function removeFromWishlist(index) {
  window.wishlistItems = window.wishlistItems || [];
  window.wishlistItems.splice(index, 1);
  saveWishlist();
  renderWishlistDropdown();
  updateWishlistCount();
  showToast('Removed from wishlist');
}

function updateWishlistCount() {
  var countEl = document.getElementById('wishlist-count');
  if (!countEl) return;
  
  // Check login status - show count only if logged in
  if (typeof BC !== 'undefined') {
    BC.ready.then(function() {
      return BC.getSession();
    }).then(function(sess) {
      if (sess) {
        countEl.textContent = window.wishlistItems.length;
      } else {
        countEl.textContent = '0';
      }
    }).catch(function() {
      countEl.textContent = '0';
    });
  } else {
    countEl.textContent = window.wishlistItems.length;
  }
}

function handleWishlistToggle(btn) {
  requireLogin(function() {
    var id = btn.getAttribute('data-id') || '';
    var name = btn.getAttribute('data-name') || '';
    var price = parseFloat(btn.getAttribute('data-price')) || 0;
    var img = btn.getAttribute('data-img') || '';
    
    var exists = window.wishlistItems.some(function(item) {
      return item.id === id || item.name === name;
    });
    
    if (exists) {
      var idx = window.wishlistItems.findIndex(function(item) {
        return item.id === id || item.name === name;
      });
      if (idx !== -1) {
        window.wishlistItems.splice(idx, 1);
        btn.innerHTML = '&#129293;';
        showToast('Removed from wishlist');
      }
    } else {
      addToWishlist({ id: id, name: name, price: price, imageUrl: img });
      btn.innerHTML = '&#10084;&#65039;';
    }
    saveWishlist();
    updateWishlistCount();
  });
}
function renderCart() {
  window.cartItems = window.cartItems || [];
  saveCart(); // Save cart whenever rendered
  var list  = document.getElementById('cart-items');
  var total = document.getElementById('cart-total');
  var count = document.getElementById('cart-count');
  var clearWrap = document.getElementById('cart-clear-wrap');
  if (count) count.textContent = window.cartItems.length;
  if (clearWrap) clearWrap.style.display = window.cartItems.length > 0 ? 'block' : 'none';
  if (!list) return;
  if (!window.cartItems.length) {
    list.innerHTML = '<div class="empty-cart"><div class="icon">&#128722;</div><p>Your cart is empty</p></div>';
    if (total) total.textContent = '₹0';
    return;
  }
  list.innerHTML = window.cartItems.map(function(item, i) {
    var imgHtml = item.imageUrl ? '<img src="' + item.imageUrl + '" class="cart-item-img" onerror="this.style.display=\'none\'"/>' : '';
    return '<li class="cart-item">' + imgHtml + '<div><div class="cart-item-name">' + item.name +
      '</div><div class="cart-item-price">₹' + item.price.toLocaleString('en-IN') +
      '</div></div><button class="remove-btn" onclick="removeFromCart(' + i + ')">Remove</button></li>';
  }).join('');
  var sum = window.cartItems.reduce(function(a, b) { return a + b.price; }, 0);
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
        window.location.href = '/login';
        return false;
      }
      if (callback) callback();
      return true;
    }).catch(function() {
      sessionStorage.setItem('bc_redirect', window.location.href);
      window.location.href = '/login';
    });
  } else {
    window.location.href = '/login';
  }
}
function buyNow(id, name, img, price) {
  requireLogin(function() {
    var p = new URLSearchParams();
    p.set('mode', 'buynow');
    if (id && id.startsWith('PRD-')) {
      p.set('id', id);
    } else {
      p.set('name', name || 'Product');
      if (img) p.set('img', img);
      if (price) p.set('price', price);
    }
    window.location.href = '/checkout?' + p.toString();
  });
}
function checkoutCart() {
  var items = window.cartItems || [];
  if (!items.length) { showToast('Your cart is empty!'); return; }
  requireLogin(function() {
    var p = new URLSearchParams();
    p.set('mode', 'cart'); p.set('items', JSON.stringify(items));
    window.location.href = '/checkout?' + p.toString();
  });
}

// ── PRODUCT NAVIGATION ─────────────────────────────────────────────────────────
function goToProduct(id) {
  console.log('goToProduct called with:', id);
  if (!id) {
    console.error('No product ID');
    return;
  }
  window.location.href = '/product?id=' + encodeURIComponent(id);
}

// Make it globally available
window.goToProduct = goToProduct;

function loadProductInline(id) {
  var main = document.getElementById('products-section');
  var container = document.getElementById('category-products') || document.getElementById('pv-main') || main;
  
  // Create container if none exists - insert after navbar
  if (!container) {
    container = document.createElement('div');
    container.id = 'inline-product-container';
    var navbar = document.querySelector('.navbar-wrap');
    if (navbar) {
      navbar.parentNode.insertBefore(container, navbar.nextSibling);
    } else {
      document.body.insertBefore(container, document.body.firstChild);
    }
  }
  
  container.innerHTML = '<div style="text-align:center;padding:60px;"><div class="spin" style="width:40px;height:40px;border:3px solid #e5eaf0;border-top-color:var(--teal);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px;"></div><p>Loading product...</p></div>';
  
  BC.getProductById(id).then(function(p) {
    if (!p) {
      container.innerHTML = '<div style="text-align:center;padding:60px;"><h2>Product Not Found</h2><p>Product ID: ' + id + '</p><button onclick="history.back()" style="padding:10px 20px;background:var(--teal);color:white;border:none;border-radius:8px;cursor:pointer;">Go Back</button></div>';
      return;
    }
    renderProductPage(p, container);
  }).catch(function(e) {
    container.innerHTML = '<div style="text-align:center;padding:60px;"><h2>Error Loading Product</h2><p>' + e.message + '</p></div>';
});
}

function renderProductPage(p, container) {
  if (!container) return;
  
  var disc = (p.mrp || 0) > (p.price || 0) ? Math.round((1-(p.price||0)/(p.mrp||1))*100) : 0;
  var productImages = (Array.isArray(p.images) && p.images.length > 0) ? p.images.slice() : (p.imageUrl ? [p.imageUrl] : ['https://placehold.co/600x600?text=' + encodeURIComponent(p.name || 'Product')]);
  var mainImg = productImages[0];
  var pName = p.name || 'Product';
  var pPrice = p.price || 0;
  var pMrp = p.mrp || pPrice;
  var pBrand = p.brand || '';
  var stock = p.stock !== undefined && p.stock !== null ? p.stock : 10;
  
  var html = '<div style="max-width:1200px;margin:0 auto;padding:28px 4%;">';
  html += '<button onclick="history.back()" style="background:none;border:none;color:var(--teal);cursor:pointer;font-size:14px;margin-bottom:16px;">← Back to products</button>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start;">';
  html += '<div style="position:sticky;top:80px;">';
  html += '<div style="border-radius:18px;overflow:hidden;background:white;box-shadow:0 8px 32px rgba(15,45,74,0.1);border:1.5px solid #e5eaf0;aspect-ratio:1;display:flex;align-items:center;justify-content:center;">';
  html += '<img src="' + mainImg + '" alt="' + pName + '" style="width:100%;height:100%;object-fit:contain;padding:20px;" onerror="this.src=\'https://placehold.co/600x600?text=Product\'"/>';
  html += '</div></div>';
  html += '<div><div style="font-size:13px;font-weight:800;color:var(--teal);text-transform:uppercase;margin-bottom:8px;">' + pBrand + '</div>';
  html += '<h1 style="font-family:Syne,sans-serif;font-size:28px;color:var(--navy);margin-bottom:12px;">' + pName + '</h1>';
  html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;"><span style="color:#ffb703;">★★★★★</span><span style="font-size:14px;font-weight:800;color:var(--navy);">4.8</span></div>';
  html += '<div style="background:var(--off);border-radius:14px;padding:18px 20px;margin-bottom:20px;border:1.5px solid #e5eaf0;">';
  html += '<div style="display:flex;align-items:baseline;gap:12px;"><span style="font-family:Syne,sans-serif;font-size:36px;font-weight:800;color:var(--navy);">₹' + pPrice.toLocaleString('en-IN') + '</span>';
  if (pMrp > pPrice) {
    html += '<span style="font-size:18px;color:var(--muted);text-decoration:line-through;">₹' + pMrp.toLocaleString('en-IN') + '</span>';
    html += '<span style="background:var(--coral);color:white;font-size:14px;font-weight:800;padding:4px 12px;border-radius:20px;">' + disc + '% off</span>';
  }
  html += '</div></div>';
  
  // Stock status display
  var stockLabel = stock > 0 ? (stock < 5 ? 'Only ' + stock + ' left!' : 'In Stock') : 'Out of Stock';
  var stockColor = stock > 0 ? '#16a34a' : '#dc2626';
  html += '<div style="margin-bottom:16px;padding:8px 12px;background:' + (stock > 0 ? '#dcfce7' : '#fee2e2') + ';border-radius:8px;color:' + stockColor + ';font-weight:700;font-size:14px;">' + stockLabel + '</div>';
  
  html += '<div style="display:flex;gap:12px;margin-bottom:20px;">';
  if (stock > 0) {
    html += '<button data-name="' + pName.replace(/"/g, '&quot;') + '" data-price="' + pPrice + '" data-img="" onclick="handleAddToCart(this)" style="flex:1;padding:15px;background:white;border:2px solid var(--teal);color:var(--teal);border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;">&#128722; Add to Cart</button>';
    html += '<button data-name="' + pName.replace(/"/g, '&quot;') + '" data-id="" data-img="" data-price="' + pPrice + '" onclick="handleBuyNow(this)" style="flex:1;padding:15px;background:linear-gradient(90deg,var(--teal),#0891b2);color:white;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;">&#9889; Buy Now</button>';
  } else {
    html += '<button disabled style="flex:1;padding:15px;background:#e5eaf0;color:#6b7a8d;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:not-allowed;">Out of Stock</button>';
  }
  html += '</div>';
  html += '<div style="background:var(--off);border-radius:14px;padding:18px;border:1px solid #e5eaf0;"><h3 style="margin:0 0 12px;font-size:16px;color:var(--navy);">Description</h3>';
  html += '<p style="margin:0;color:#334155;line-height:1.6;">' + (p.description || 'Premium quality product from ' + pBrand + '.') + '</p></div>';
  html += '</div></div></div>';
  
  container.innerHTML = html;
}

// Handle browser back/forward (registered once via guard)
if (!window.__popstateWired) {
  window.__popstateWired = true;
  window.addEventListener('popstate', function(e) {
    var params = new URLSearchParams(window.location.search);
    var pid = params.get('id');
    if (pid) {
      var container = document.getElementById('category-products') || document.getElementById('pv-main');
      if (container) loadProductInline(pid);
    }
  });
}

// ── SEARCH ────────────────────────────────────────────────────────────────────
function doSearchNav() {
  var inp = document.getElementById('searchInput') || document.getElementById('navSearch');
  var q   = inp ? inp.value.trim() : '';
  if (q) window.location.href = '/search?q=' + encodeURIComponent(q);
}

// ── LIVE SEARCH SUGGESTIONS ─────────────────────────────────────────────────
var searchTimeout = null;

var searchSuggestions = [
  'iPhone 15 Pro', 'iPhone 15', 'Samsung Galaxy S24 Ultra', 'MacBook Air M3',
  'MacBook Pro 16"', 'Sony WH-1000XM5', 'AirPods Pro 2', 'PlayStation 5',
  'Xbox Series X', 'Apple Watch Ultra 2', 'Samsung Galaxy Watch 6', 'Canon EOS R6',
  'Sony Alpha A7 IV', 'iPad Pro 12.9"', 'Amazon Echo Dot', 'OnePlus 12',
  'Dell XPS 15', 'Smartphones', 'Laptops', 'Audio', 'Gaming', 'Wearables',
  'Cameras', 'Tablets', 'Smart Home', 'Accessories', 'Electronics',
  'Apple', 'Samsung', 'Sony', 'LG', 'Dell', 'HP', 'Asus', 'OnePlus',
  'Bose', 'JBL', 'Canon', 'Razer', 'Logitech', 'Realme', 'Xiaomi', 'Vivo', 'Oppo',
  'Wireless Earbuds', 'Bluetooth Speaker', 'Smart TV', 'LED TV', '4K TV',
  'Gaming Laptop', 'Business Laptop', 'Mechanical Keyboard', 'Gaming Mouse',
  'USB Cable', 'Phone Charger', 'Power Bank', 'Laptop Bag', 'Screen Protector'
];

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function initSearchSuggestions() {
  var searchInputs = document.querySelectorAll('#searchInput, #navSearch');
  searchInputs.forEach(function(inp) {
    if (inp.dataset.suggestionsInit) return;
    inp.dataset.suggestionsInit = 'true';
    
    var wrapper = inp.closest('.sac-wrapper') || inp.closest('.search-bar');
    if (!wrapper) return;
    
    wrapper.style.position = 'relative';
    wrapper.style.zIndex = '1';
    
    var dropdown = document.createElement('div');
    dropdown.className = 'sac-dropdown';
    dropdown.style.cssText = 'display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1.5px solid #d0e0ed;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.12);overflow:hidden;z-index:2147483647;max-height:340px;overflow-y:auto;margin-top:6px;animation:sacFadeIn .12s ease;';
    dropdown.innerHTML = '<ul style="list-style:none;padding:6px 0;margin:0;max-height:300px;overflow-y:auto;"></ul><div style="padding:6px 16px 7px;font-size:11.5px;color:#a0b0c0;border-top:1px solid #f0f4f8;display:flex;gap:14px;"><span><kbd style="display:inline-flex;align-items:center;justify-content:center;background:#f0f4f8;border:1px solid #d0e0ed;border-radius:4px;padding:1px 5px;font-size:10.5px;color:#6b8090;">↑</kbd> <kbd style="display:inline-flex;align-items:center;justify-content:center;background:#f0f4f8;border:1px solid #d0e0ed;border-radius:4px;padding:1px 5px;font-size:10.5px;color:#6b8090;">↓</kbd> Navigate</span><span><kbd style="display:inline-flex;align-items:center;justify-content:center;background:#f0f4f8;border:1px solid #d0e0ed;border-radius:4px;padding:1px 5px;font-size:10.5px;color:#6b8090;">Enter</kbd> Select</span><span><kbd style="display:inline-flex;align-items:center;justify-content:center;background:#f0f4f8;border:1px solid #d0e0ed;border-radius:4px;padding:1px 5px;font-size:10.5px;color:#6b8090;">Esc</kbd> Close</span></div>';
    
    // Add animation style
    var animStyle = document.createElement('style');
    animStyle.textContent = '@keyframes sacFadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }';
    document.head.appendChild(animStyle);
    
    wrapper.appendChild(dropdown);
    
    var ul = dropdown.querySelector('ul');
    var activeIndex = -1;
    
    function renderSuggestions(items, query) {
      ul.innerHTML = '';
      activeIndex = -1;
      
      if (items.length === 0) {
        var li = document.createElement('li');
        li.style.cssText = 'padding:10px 16px;font-size:14.5px;color:#a0b0c0;cursor:default;';
        li.textContent = 'No suggestions found';
        ul.appendChild(li);
        dropdown.style.display = 'block';
        return;
      }
      
      items.forEach(function(item, index) {
        var li = document.createElement('li');
        li.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:14.5px;color:#1a3c5e;cursor:pointer;transition:background .13s;border-bottom:1px solid #f0f4f8;';
        
        var safeValue = escapeRegex(query);
        var regex = new RegExp('(' + safeValue + ')', 'gi');
        var highlighted = item.replace(regex, '<strong style="font-weight:800;color:#0c5f5c;">$1</strong>');
        
        li.innerHTML = '<span style="font-size:14px;color:#a0b8c8;">&#128269;</span><span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + highlighted + '</span><span style="font-size:13px;color:#c0d0e0;opacity:0;transition:opacity .15s;">&#10140;</span>';
        
        li.addEventListener('mouseenter', function() {
          ul.querySelectorAll('li').forEach(function(l) { l.style.background = ''; l.querySelectorAll('span')[2].style.opacity = '0'; });
          li.style.background = '#f0fdfc';
          li.querySelectorAll('span')[2].style.opacity = '1';
          li.querySelectorAll('span')[2].style.color = '#0ea5a0';
        });
        
        li.addEventListener('click', function() {
          inp.value = item;
          dropdown.style.display = 'none';
          window.location.href = '/search?q=' + encodeURIComponent(item);
        });
        
        ul.appendChild(li);
      });
      
      dropdown.style.display = 'block';
    }
    
    function hideDropdown() {
      dropdown.style.display = 'none';
    }
    
    inp.addEventListener('input', function(e) {
      var q = e.target.value.trim();
      hideDropdown();
      if (q.length < 1) return;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function() {
        var filtered = searchSuggestions.filter(function(item) {
          return item.toLowerCase().includes(q.toLowerCase());
        }).slice(0, 10);
        renderSuggestions(filtered, q);
      }, 150);
    });
    
    inp.addEventListener('focus', function(e) {
      var q = e.target.value.trim();
      if (q.length >= 1) {
        var filtered = searchSuggestions.filter(function(item) {
          return item.toLowerCase().includes(q.toLowerCase());
        }).slice(0, 10);
        renderSuggestions(filtered, q);
      }
    });
    
    inp.addEventListener('keydown', function(e) {
      var items = ul.querySelectorAll('li');
      if (!items.length || dropdown.style.display === 'none') return;
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = activeIndex >= items.length - 1 ? 0 : activeIndex + 1;
        updateActive(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
        updateActive(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].click();
        } else if (inp.value.trim()) {
          window.location.href = '/search?q=' + encodeURIComponent(inp.value.trim());
        }
      } else if (e.key === 'Escape') {
        hideDropdown();
      }
    });
    
    function updateActive(items) {
      items.forEach(function(item) {
        item.style.background = '';
        var arrow = item.querySelector('span:last-child');
        if (arrow) arrow.style.opacity = '0';
      });
      if (activeIndex >= 0 && items[activeIndex]) {
        items[activeIndex].style.background = '#f0fdfc';
        var arrow = items[activeIndex].querySelector('span:last-child');
        if (arrow) { arrow.style.opacity = '1'; arrow.style.color = '#0ea5a0'; }
        items[activeIndex].scrollIntoView({ block: 'nearest' });
      }
    }
    
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.search-bar') && !e.target.closest('.sac-dropdown')) {
        hideDropdown();
      }
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
  
  // Categories with icons
  if (suggestionsData.categories && suggestionsData.categories.length) {
    html += '<div class="suggest-section"><div class="suggest-label">Categories</div>';
    suggestionsData.categories.forEach(function(cat) {
      var icon = getCategoryIcon(cat);
      html += '<a class="suggest-item suggest-item-cat" href="/search?q=' + encodeURIComponent(cat) + '">';
      html += '<span class="suggest-icon">' + icon + '</span>';
      html += '<span>' + cat + '</span>';
      html += '</a>';
    });
    html += '</div>';
  }
  
  // Brands with icons
  if (suggestionsData.brands && suggestionsData.brands.length) {
    html += '<div class="suggest-section"><div class="suggest-label">Brands</div>';
    suggestionsData.brands.forEach(function(brand) {
      html += '<a class="suggest-item suggest-item-brand" href="/search?q=' + encodeURIComponent(brand) + '">';
      html += '<span class="suggest-icon ic">' + Icons.star + '</span>';
      html += '<span>' + brand + '</span>';
      html += '</a>';
    });
    html += '</div>';
  }
  
  // Products
  if (suggestionsData.products && suggestionsData.products.length) {
    html += '<div class="suggest-section"><div class="suggest-label">Products</div>';
    suggestionsData.products.forEach(function(p) {
      var img = p.imageUrl || 'https://via.placeholder.com/44x44?text=Product';
      html += '<a class="suggest-item suggest-product" href="/product?id=' + encodeURIComponent(p.id) + '">';
      html += '<img src="' + img + '" alt=""/>';
      html += '<div class="suggest-prod-info"><span class="suggest-prod-name">' + p.name + '</span>';
      html += '<span class="suggest-prod-cat">' + (p.brand || p.category || '') + '</span></div>';
      html += '<span class="suggest-prod-price">' + (p.price ? '₹' + p.price.toLocaleString('en-IN') : '') + '</span>';
      html += '</a>';
    });
    html += '</div>';
  }
  
  // Trending searches (when no results or minimal)
  if (!html) {
    html += '<div class="suggest-section"><div class="suggest-label">Trending</div>';
    html += '<a class="suggest-item" href="/search?q=iPhone"><span class="suggest-icon ic">' + Icons.phoneMobile + '</span><span>iPhone 15 Pro</span></a>';
    html += '<a class="suggest-item" href="/search?q=MacBook"><span class="suggest-icon ic">' + Icons.laptop + '</span><span>MacBook Air</span></a>';
    html += '<a class="suggest-item" href="/search?q=Headphones"><span class="suggest-icon ic">' + Icons.headphones + '</span><span>Wireless Headphones</span></a>';
    html += '</div>';
  }
  
  container.innerHTML = html;
  container.style.display = 'block';
}

function getCategoryIcon(category) {
  var icons = {
    'Smartphones': Icons.phoneMobile,
    'Laptops': Icons.laptop,
    'Audio': Icons.headphones,
    'Cameras': Icons.camera,
    'Gaming': Icons.gamepad,
    'Accessories': Icons.cog,
    'Wearables': Icons.cog,
    'Smart Home': Icons.home,
    'Tablets': Icons.phoneMobile,
    'Televisions': Icons.headphones,
    'Electronics': Icons.bolt
  };
  return icons[category] || Icons.package;
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
      background: #fff;
      border-radius: 0 0 12px 12px;
      box-shadow: 0 10px 40px rgba(15,45,74,0.2), 0 2px 12px rgba(0,0,0,0.1);
      max-height: 420px;
      overflow-y: auto;
      z-index: 99999;
      display: none;
      border: 1px solid #e5eaf0;
      margin-top: 4px;
    }
    .suggest-section { border-bottom: 1px solid #f0f4f8; }
    .suggest-section:last-child { border-bottom: none; }
    .suggest-label {
      padding: 10px 16px 8px;
      font-size: 11px;
      font-weight: 800;
      color: #0ea5a0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #f8fafc;
    }
    .suggest-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      color: #0f2d4a;
      text-decoration: none;
      font-size: 14px;
      cursor: pointer;
      transition: background 0.15s ease;
    }
    .suggest-item:hover, .suggest-item.active {
      background: linear-gradient(90deg, rgba(14,165,160,0.08) 0%, rgba(14,165,160,0.03) 100%);
    }
    .suggest-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #f0f7fb;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-size: 16px;
      flex-shrink: 0;
    }
    .suggest-product { gap: 0; }
    .suggest-product img {
      width: 44px;
      height: 44px;
      object-fit: cover;
      border-radius: 8px;
      margin-right: 12px;
      border: 1px solid #e5eaf0;
    }
    .suggest-prod-info { flex: 1; min-width: 0; }
    .suggest-prod-name {
      font-weight: 600;
      color: #0f2d4a;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .suggest-prod-cat {
      font-size: 12px;
      color: #6b7a8d;
      margin-top: 2px;
    }
    .suggest-prod-price {
      font-weight: 700;
      color: #059669;
      font-size: 14px;
      white-space: nowrap;
      margin-left: auto;
      padding-left: 12px;
    }
    .suggest-item-cat {
      font-size: 13px;
    }
    .suggest-item-cat .suggest-icon {
      background: linear-gradient(135deg, #0ea5a0 0%, #0891b2 100%);
      color: white;
    }
    .suggest-item-brand {
      font-size: 13px;
    }
    .suggest-item-brand .suggest-icon {
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: white;
    }
    .search-bar { position: relative; }
    .search-bar input {
      position: relative;
      z-index: 1;
    }
    @media (max-width: 480px) {
      .search-suggestions {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// Initialize cart from localStorage on page load
if (window.cartItems && window.cartItems.length > 0) {
  renderCart();
}

// Search suggestions init (runs once on initial page load only)
function initSearch() {
  initSearchSuggestions();
  addSuggestionStyles();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSearch);
} else {
  initSearch();
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
    if (!sess) { sessionStorage.setItem('bc_redirect', '/orders'); window.location.href = '/login'; }
    else window.location.href = '/orders';
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
    BC.ready.then(function() { 
      return BC.getSession(); 
    }).then(function(sess) {
      if (!sess) return;
      var greet = document.getElementById('account-greeting');
      var label = document.getElementById('account-label');
      var link  = document.getElementById('account-link');
      if (greet) greet.textContent = 'Hello, ' + sess.name.split(' ')[0];
      if (label) label.textContent = 'My Account';
      if (link)  link.href = sess.role === 'admin' ? '/admin' : '/account';
    }).catch(function(e) {
      console.error('Session check error:', e);
    });
  }
}

// ── PRODUCT VIEW LINKING ──────────────────────────────────────────────────────
function attachProductLinks() {
  function goProduct(name, price, img, cat, pid) {
    if (pid && pid.startsWith('PRD-')) {
      goToProduct(pid);
    } else if (name) {
      // Fallback: pass name as query param
      var params = new URLSearchParams();
      params.set('name', name);
      if (price) params.set('price', price);
      if (img) params.set('img', img);
      if (cat) params.set('cat', cat);
      window.location.href = '/product?' + params.toString();
    }
  }
  function getImg(card) { var i = card.querySelector('img'); return i ? i.src : ''; }
  function getNum(el) { return el ? parseInt(el.textContent.replace(/[^0-9]/g,'')) || 0 : 0; }
  function noBtn(e) { return e.target.closest('.wishlist-btn,.btn-cart,.btn-buy,.add-to-cart,.new-wishlist,.new-add-btn,.deal-btn,.exp-cart,.exp-buy,.explore-btns'); }

  function link(card, nameEl, priceEl, catTxt, pid) {
    if (!nameEl || card.dataset.pvLinked) return;
    
    // Skip if card already has onclick with proper product?id format
    var existingOnclick = card.getAttribute('onclick');
    if (existingOnclick) {
      // Decode the onclick to check for /product?id= pattern
      try { existingOnclick = decodeURIComponent(existingOnclick); } catch(e) {}
      if (existingOnclick.includes('/product?id=')) {
        card.dataset.pvLinked = '1';
        return;
      }
    }
    
    card.dataset.pvLinked = '1';
    var name = nameEl.textContent.trim();
    var price = getNum(priceEl);
    var img   = getImg(card);
    var cat   = catTxt || 'Electronics';
    function go(e) {
      if (noBtn(e)) return; e.stopPropagation();
      if (pid && pid.startsWith('PRD-')) {
        goToProduct(pid);
      } else {
        // Fallback: pass all params
        var params = new URLSearchParams();
        params.set('name', name);
        if (price) params.set('price', price);
        if (img) params.set('img', encodeURIComponent(img));
        if (cat) params.set('cat', cat);
      window.location.href = '/product?' + params.toString();
      }
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
  if (e.key === 'Escape') { closeHamburger(); hideWishlistDropdown(); }
});

// ── AUTO-INIT ─────────────────────────────────────────────────────────────────
function initWishlistHover() {
  var wishlistTrigger = document.querySelector('.wishlist-trigger');
  var wishlistDropdown = document.getElementById('wishlist-dropdown');
  if (!wishlistTrigger && !wishlistDropdown) return;
  var hideTimeout;
  function ch() { clearTimeout(hideTimeout); }
  function sh() { clearTimeout(hideTimeout); hideTimeout = setTimeout(hideWishlistDropdown, 500); }
  if (wishlistTrigger && !wishlistTrigger.dataset.hoverWired) {
    wishlistTrigger.dataset.hoverWired = '1';
    wishlistTrigger.addEventListener('mouseenter', function() { ch(); showWishlistDropdown(); });
    wishlistTrigger.addEventListener('mouseleave', sh);
  }
  if (wishlistDropdown && !wishlistDropdown.dataset.hoverWired) {
    wishlistDropdown.dataset.hoverWired = '1';
    wishlistDropdown.addEventListener('mouseenter', ch);
    wishlistDropdown.addEventListener('mouseleave', sh);
  }
}

function initPage() {
  initSharedNavbar();
  attachProductLinks();
  initWishlist();
  initWishlistHover();
  updateWishlistCount();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}
document.addEventListener('instantclick:change', initPage);
// Re-run for DB-injected cards
setTimeout(function() { attachProductLinks(); initWishlist(); updateWishlistCount(); }, 800);
setTimeout(function() { attachProductLinks(); initWishlist(); updateWishlistCount(); }, 2500);

function scrollRow(id, dir) {
  var el = document.getElementById(id);
  if (!el) return;
  var scrollAmount = 220;
  el.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
}


// -- SKELETON HELPERS --------------------------------------
var Skeleton = {
  text: function(w, h) {
    return '<div class="skeleton s-line-md" style="width:'+w+';height:'+(h||14)+'px"></div>';
  },
  circle: function(s) {
    return '<div class="skeleton s-circle" style="width:'+s+'px;height:'+s+'px"></div>';
  },
  img: function(w, h) {
    return '<div class="skeleton" style="width:'+w+';height:'+h+'px;border-radius:8px"></div>';
  },
  productCard: function() {
    return '<div class="product-card" style="pointer-events:none;background:white;">' +
      '<div class="skeleton" style="height:200px;border-radius:0"></div>' +
      '<div style="padding:14px;display:flex;flex-direction:column;gap:8px;">' +
        '<div class="skeleton s-line-md" style="width:60%;height:11px"></div>' +
        '<div class="skeleton s-line-lg" style="width:95%;height:14px"></div>' +
        '<div class="skeleton s-line-lg" style="width:80%;height:14px"></div>' +
        '<div class="skeleton s-line-sm" style="width:50%;height:10px"></div>' +
        '<div class="skeleton s-line-md" style="width:40%;height:16px;margin-top:6px"></div>' +
        '<div class="skeleton s-line-md" style="width:100%;height:32px;margin-top:10px;border-radius:8px"></div>' +
      '</div>' +
    '</div>';
  },
  productCardGrid: function(count) {
    count = count || 8;
    var html = '';
    for (var i=0; i<count; i++) html += this.productCard();
    return html;
  },
  productDetail: function() {
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:40px 4%;">' +
      '<div class="skeleton" style="height:480px;border-radius:14px"></div>' +
      '<div style="display:flex;flex-direction:column;gap:14px;">' +
        '<div class="skeleton s-line-md" style="width:30%;height:11px"></div>' +
        '<div class="skeleton s-line-lg" style="width:90%;height:24px"></div>' +
        '<div class="skeleton s-line-lg" style="width:70%;height:24px"></div>' +
        '<div class="skeleton s-line-md" style="width:40%;height:30px;margin-top:8px"></div>' +
        '<div class="skeleton s-line-sm" style="width:60%;height:10px;margin-top:8px"></div>' +
        '<div class="skeleton s-line-sm" style="width:100%;height:12px;margin-top:16px"></div>' +
        '<div class="skeleton s-line-sm" style="width:100%;height:12px"></div>' +
        '<div class="skeleton s-line-sm" style="width:90%;height:12px"></div>' +
        '<div style="display:flex;gap:10px;margin-top:20px;">' +
          '<div class="skeleton" style="flex:1;height:46px;border-radius:10px"></div>' +
          '<div class="skeleton" style="flex:1;height:46px;border-radius:10px"></div>' +
        '</div>' +
      '</div>' +
    '</div>';
  },
  cartItem: function() {
    return '<li style="display:flex;gap:12px;padding:12px;border-bottom:1px solid #e5eaf0;">' +
      '<div class="skeleton" style="width:60px;height:60px;border-radius:8px;flex-shrink:0"></div>' +
      '<div style="flex:1;display:flex;flex-direction:column;gap:6px;justify-content:center;">' +
        '<div class="skeleton s-line-md" style="width:80%;height:13px"></div>' +
        '<div class="skeleton s-line-sm" style="width:50%;height:10px"></div>' +
        '<div class="skeleton s-line-md" style="width:30%;height:14px;margin-top:4px"></div>' +
      '</div>' +
    '</li>';
  },
  cartList: function(count) {
    count = count || 3;
    var html = '';
    for (var i=0; i<count; i++) html += this.cartItem();
    return html;
  },
  wishlistItem: function() {
    return '<li style="display:flex;gap:10px;padding:10px;border-bottom:1px solid #e5eaf0;">' +
      '<div class="skeleton" style="width:44px;height:44px;border-radius:6px;flex-shrink:0"></div>' +
      '<div style="flex:1;display:flex;flex-direction:column;gap:5px;justify-content:center;">' +
        '<div class="skeleton s-line-md" style="width:90%;height:12px"></div>' +
        '<div class="skeleton s-line-sm" style="width:60%;height:10px"></div>' +
      '</div>' +
    '</li>';
  },
  orderCard: function() {
    return '<div style="background:white;border:1.5px solid #e5eaf0;border-radius:12px;padding:18px;margin-bottom:14px;">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:14px;">' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:6px;">' +
          '<div class="skeleton s-line-md" style="width:35%;height:14px"></div>' +
          '<div class="skeleton s-line-sm" style="width:25%;height:10px"></div>' +
        '</div>' +
        '<div class="skeleton" style="width:80px;height:24px;border-radius:20px"></div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-bottom:14px;">' +
        '<div class="skeleton" style="width:60px;height:60px;border-radius:8px"></div>' +
        '<div class="skeleton" style="width:60px;height:60px;border-radius:8px"></div>' +
        '<div class="skeleton" style="width:60px;height:60px;border-radius:8px"></div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div class="skeleton s-line-md" style="width:30%;height:14px"></div>' +
        '<div class="skeleton" style="width:120px;height:32px;border-radius:8px"></div>' +
      '</div>' +
    '</div>';
  },
  addressCard: function() {
    return '<div style="background:#f4f7fb;border:1.5px solid #e5eaf0;border-radius:12px;padding:16px 18px;margin-bottom:12px;">' +
      '<div class="skeleton s-line-md" style="width:40%;height:14px;margin-bottom:8px"></div>' +
      '<div class="skeleton s-line-sm" style="width:90%;height:12px;margin-bottom:4px"></div>' +
      '<div class="skeleton s-line-sm" style="width:70%;height:12px;margin-bottom:4px"></div>' +
      '<div class="skeleton s-line-sm" style="width:50%;height:12px"></div>' +
    '</div>';
  },
  profileHero: function() {
    return '' +
      '<div class="skeleton s-circle shimmer-dark" style="width:88px;height:88px"></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;">' +
        '<div class="skeleton shimmer-dark s-line-lg" style="width:220px;height:24px"></div>' +
        '<div class="skeleton shimmer-dark s-line-md" style="width:280px;height:14px"></div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<div class="skeleton shimmer-dark" style="width:110px;height:22px;border-radius:20px"></div>' +
          '<div class="skeleton shimmer-dark" style="width:100px;height:22px;border-radius:20px"></div>' +
          '<div class="skeleton shimmer-dark" style="width:90px;height:22px;border-radius:20px"></div>' +
        '</div>' +
      '</div>';
  },
  statBlock: function() {
    return '<div class="skeleton s-line-lg" style="width:60%;height:24px;margin:0 auto"></div>';
  },
  minDelay: function(promise, ms) {
    ms = ms || 200;
    return new Promise(function(resolve) {
      var done = false;
      promise.then(function(v){ if(!done){ done=true; resolve(v); }});
      setTimeout(function(){ if(!done){ done=true; resolve(null); }}, ms);
    });
  }
};


// -- ICONS (Heroicons-style inline SVG) ----------------------
var Icons = {
  cart: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/></svg>',
  search: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  user: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  heart: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
  close: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  location: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  package: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><line x1="3.27" y1="6.96" x2="12" y2="12.01"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  lock: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
  phone: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>',
  refresh: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  cog: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
  desktop: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  shield: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  truck: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  home: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  phoneMobile: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
  laptop: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  headphones: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>',
  camera: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  gamepad: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.545-.604-6.584-.685-7.258A4 4 0 0017.32 5z"/></svg>',
  bolt: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  fire: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>',
  star: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  starOutline: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>',
  chevronLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>',
  menu: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  shoppingBag: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
  creditCard: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
  mail: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  chat: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
  arrowRight: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
  arrowLeft: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  edit: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
  plus: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  eye: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  logOut: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  bell: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
  tag: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
  grid: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
  list: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  truckOutline: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
  gift: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>',
  money: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>',
  bank: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="5 6 12 3 19 6"/><line x1="4" y1="10" x2="4" y2="21"/><line x1="20" y1="10" x2="20" y2="21"/><line x1="8" y1="14" x2="8" y2="17"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="16" y1="14" x2="16" y2="17"/></svg>',
  chart: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  users: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
  wrench: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
  pencil: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  fileText: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
  clipboard: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>',
  lightbulb: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.74V17a1 1 0 001 1h6a1 1 0 001-1v-2.26A7 7 0 0012 2z"/></svg>',
  bike: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h2"/></svg>'
};


// -- DATA-ICON PROCESSOR (replaces <span data-icon="X"> with SVG) --
function initIcons() {
  var els = document.querySelectorAll('[data-icon]');
  for (var i = 0, len = els.length; i < len; i++) {
    var el = els[i];
    var name = el.dataset.icon;
    if (name && Icons[name]) {
      el.innerHTML = Icons[name];
      el.classList.add('ic');
    }
  }
}
document.addEventListener('DOMContentLoaded', initIcons);
document.addEventListener('instantclick:change', initIcons);

// -- SERVICE WORKER REGISTRATION --
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
