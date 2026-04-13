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
// Load cart from localStorage to persist across pages
// Use window.cartItems for global access from all pages
window.cartItems = JSON.parse(localStorage.getItem('bc_cart') || '[]');
var cartOpen = false;

// Also expose as local var for backward compatibility
var cartItems = window.cartItems;

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
  if (countEl) countEl.textContent = window.wishlistItems.length;
  if (!dropdown) return;
  
  if (!window.wishlistItems.length) {
    dropdown.innerHTML = '<div class="wishlist-empty">Your wishlist is empty</div>';
    return;
  }
  
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
        '<button class="wishlist-btn-remove" onclick="removeFromWishlist(' + i + ')">✕</button>' +
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
  if (countEl) countEl.textContent = window.wishlistItems.length;
}

function handleWishlistToggle(btn) {
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

// Handle browser back/forward
window.addEventListener('popstate', function(e) {
  var params = new URLSearchParams(window.location.search);
  var pid = params.get('id');
  if (pid) {
    loadProductInline(pid);
  }
});

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

// Handle browser back/forward
window.addEventListener('popstate', function(e) {
  var params = new URLSearchParams(window.location.search);
  var pid = params.get('id');
  if (pid) {
    loadProductInline(pid);
  }
});
}

function renderProductPage(p, container) {
  if (!container) return;
  console.log('renderProductPage called, p.stock:', p.stock, 'p:', p);
  var disc = (p.mrp || 0) > (p.price || 0) ? Math.round((1-(p.price||0)/(p.mrp||1))*100) : 0;
  var category = p.category || 'Electronics';
  var productImages = (Array.isArray(p.images) && p.images.length > 0) ? p.images.slice() : (p.imageUrl ? [p.imageUrl] : ['https://placehold.co/600x600?text=' + encodeURIComponent(p.name || 'Product')]);
  var mainImg = productImages[0];
  var pName = p.name || 'Product';
  var pPrice = p.price || 0;
  var pMrp = p.mrp || pPrice;
  var pBrand = p.brand || '';
  var stock = p.stock !== undefined ? p.stock : 10;
  console.log('stock variable:', stock);
  var stockHtml = stock > 0 ? 'In Stock' : 'Out of Stock';
  var stockClass = stock > 0 ? 'var(--teal)' : '#dc2626';
  
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

// Handle browser back/forward
window.addEventListener('popstate', function(e) {
  var params = new URLSearchParams(window.location.search);
  var pid = params.get('id');
  if (pid) {
    var container = document.getElementById('category-products') || document.getElementById('pv-main');
    if (container) loadProductInline(pid);
  }
});

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
      html += '<span class="suggest-icon">★</span>';
      html += '<span>' + brand + '</span>';
      html += '</a>';
    });
    html += '</div>';
  }
  
  // Products
  if (suggestionsData.products && suggestionsData.products.length) {
    html += '<div class="suggest-section"><div class="suggest-label">Products</div>';
    suggestionsData.products.forEach(function(p) {
      var img = p.imageUrl || 'https://via.placeholder.com/44x44?text=📦';
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
    html += '<a class="suggest-item" href="/search?q=iPhone"><span class="suggest-icon">📱</span><span>iPhone 15 Pro</span></a>';
    html += '<a class="suggest-item" href="/search?q=MacBook"><span class="suggest-icon">💻</span><span>MacBook Air</span></a>';
    html += '<a class="suggest-item" href="/search?q=Headphones"><span class="suggest-icon">🎧</span><span>Wireless Headphones</span></a>';
    html += '</div>';
  }
  
  container.innerHTML = html;
  container.style.display = 'block';
}

function getCategoryIcon(category) {
  var icons = {
    'Smartphones': '📱',
    'Laptops': '💻',
    'Audio': '🎧',
    'Cameras': '📷',
    'Gaming': '🎮',
    'Accessories': '⌚',
    'Wearables': '⌚',
    'Smart Home': '🏠',
    'Tablets': '📱',
    'Televisions': '📺',
    'Electronics': '⚡'
  };
  return icons[category] || '📦';
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
  setTimeout(function() { attachProductLinks(); initWishlist(); updateWishlistCount(); }, 800);
  setTimeout(function() { attachProductLinks(); initWishlist(); updateWishlistCount(); }, 2500);
})();

function scrollRow(id, dir) {
  var el = document.getElementById(id);
  if (!el) return;
  var scrollAmount = 220;
  el.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
}
