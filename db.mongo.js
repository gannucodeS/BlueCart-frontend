/**
 * BlueCart — MongoDB-backed client
 * Replaces the IndexedDB-backed `db.js`.
 *
 * This file keeps the same `window.BC` public API used by the existing HTML pages.
 */
(function () {
  'use strict';

  var API_BASE = (window.BC_API_BASE || '/api').replace(/\/$/, '');
  var SESSION_KEY = 'bc_token';
  var ADMIN_SECRET = 'bluecart@admin2026';

  function authHeaders() {
    var token = localStorage.getItem(SESSION_KEY);
    if (!token) return {};
    return { Authorization: 'Bearer ' + token };
  }

  async function apiJson(pathname, opts) {
    var res = await fetch(API_BASE + pathname, opts || {});
    var data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    if (!res.ok) {
      var msg = (data && data.error) ? data.error : res.statusText;
      throw new Error(msg || 'Request failed');
    }
    return data;
  }

  var BC = (function () {
    var publicAPI = {};

    publicAPI.ADMIN_SECRET = ADMIN_SECRET;

    publicAPI.ready = apiJson('/ping')
      .then(function () {
        // Server seeds on startup; nothing else required here.
        return true;
      });

    publicAPI.registerUser = function (opts) {
      var body = {
        firstName: opts.firstName,
        lastName: opts.lastName,
        email: opts.email,
        phone: opts.phone,
        password: opts.password,
        role: opts.role || 'user',
        adminKey: opts.adminKey || ''
      };
      return apiJson('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).catch(function (e) {
        // Preserve legacy behavior: return { ok:false, error:... }
        return { ok: false, error: e.message || 'Registration failed.' };
      });
    };

    publicAPI.loginUser = function (opts) {
      var body = {
        email: opts.email,
        password: opts.password,
        role: opts.role || 'user',
        adminKey: opts.adminKey || ''
      };
      return apiJson('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (res) {
        if (!res || !res.ok) return res || { ok: false, error: 'Login failed.' };
        localStorage.setItem(SESSION_KEY, res.token);
        return { ok: true, user: res.user };
      }).catch(function (e) {
        return { ok: false, error: e.message || 'Login failed.' };
      });
    };

    publicAPI.getSession = function () {
      var token = localStorage.getItem(SESSION_KEY);
      if (!token) return Promise.resolve(null);
      return apiJson('/auth/session', { method: 'GET', headers: authHeaders() })
        .then(function (sess) {
          if (!sess) return null;
          if (sess.expiry < Date.now()) {
            localStorage.removeItem(SESSION_KEY);
            return null;
          }
          return sess;
        })
        .catch(function () {
          localStorage.removeItem(SESSION_KEY);
          return null;
        });
    };

    publicAPI.clearSession = function () {
      var token = localStorage.getItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      if (!token) return Promise.resolve();
      return fetch(API_BASE + '/auth/logout', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token }
      }).catch(function () {}).then(function () {});
    };

    // Users (admin)
    publicAPI.getAllUsers = function () {
      return apiJson('/users/admin/all', { method: 'GET', headers: authHeaders() });
    };

    publicAPI.deleteUser = function (id) {
      return apiJson('/users/admin/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: authHeaders()
      }).then(function () { return true; });
    };

    // Products
    publicAPI.saveProduct = function (data) {
      return apiJson('/products/admin/save', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify(data || {})
      });
    };

    publicAPI.getAllProducts = function () {
      return apiJson('/products', { method: 'GET' });
    };

    publicAPI.getProductById = function (id) {
      return apiJson('/products/' + encodeURIComponent(id), { method: 'GET' });
    };

    publicAPI.deleteProduct = function (id) {
      return apiJson('/products/admin/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: authHeaders()
      }).then(function () { return true; });
    };

    publicAPI.getProductsByCategory = function (category) {
      var qs = category ? '?category=' + encodeURIComponent(category) : '';
      return apiJson('/products' + qs, { method: 'GET' });
    };

    // Orders
    publicAPI.placeOrder = function (opts) {
      return apiJson('/orders', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify(opts || {})
      });
    };

    publicAPI.getAllOrders = function () {
      return apiJson('/orders', { method: 'GET', headers: authHeaders() });
    };

    publicAPI.getOrderById = function (id) {
      return apiJson('/orders/' + encodeURIComponent(id), { method: 'GET', headers: authHeaders() });
    };

    publicAPI.getOrdersByUser = function (email) {
      var qs = '?userEmail=' + encodeURIComponent(email);
      return apiJson('/orders' + qs, { method: 'GET', headers: authHeaders() });
    };

    publicAPI.updateOrderStatus = function (id, deliveryStatus) {
      return apiJson('/orders/admin/' + encodeURIComponent(id) + '/status', {
        method: 'PATCH',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ deliveryStatus: deliveryStatus })
      });
    };

    publicAPI.deleteOrder = function (id) {
      return apiJson('/orders/admin/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: authHeaders()
      }).then(function () { return true; });
    };

    // Stats (admin)
    publicAPI.getDashboardStats = function () {
      return apiJson('/stats/admin/dashboard', { method: 'GET', headers: authHeaders() });
    };

    return publicAPI;
  })();

  window.BC = BC;
})();

