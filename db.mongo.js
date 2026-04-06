/**
 * BlueCart — MongoDB-backed client
 * Replaces the IndexedDB-backed `db.js`.
 *
 * This file keeps the same `window.BC` public API used by the existing HTML pages.
 * Extended with new payment, location, OTP, and OAuth methods.
 */
(function () {
  'use strict';

  var API_BASE = 'https://bluecart.onrender.com/api';
  
  var SESSION_KEY = 'bc_token';

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

    publicAPI.ready = apiJson('/ping')
      .then(function () {
        return true;
      });

    // ── AUTH ──────────────────────────────────────────────────────────────────
    
    publicAPI.registerUser = function (opts) {
      var body = {
        firstName: opts.firstName,
        lastName: opts.lastName,
        email: opts.email,
        phone: opts.phone,
        password: opts.password
      };
      return apiJson('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).catch(function (e) {
        return { ok: false, error: e.message || 'Registration failed.' };
      });
    };

    publicAPI.loginUser = function (opts) {
      var body = {
        email: opts.email,
        password: opts.password
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

    publicAPI.loginAdmin = function (opts) {
      var body = {
        email: opts.email,
        password: opts.password,
        adminKey: opts.adminKey || ''
      };
      return apiJson('/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (res) {
        if (!res || !res.ok) return res || { ok: false, error: 'Admin login failed.' };
        localStorage.setItem(SESSION_KEY, res.token);
        return { ok: true, user: res.user };
      }).catch(function (e) {
        return { ok: false, error: e.message || 'Admin login failed.' };
      });
    };

    publicAPI.loginWithGoogle = function (idToken) {
      return apiJson('/oauth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: idToken })
      }).then(function (res) {
        if (!res || !res.ok) return res || { ok: false, error: 'Google sign-in failed.' };
        localStorage.setItem(SESSION_KEY, res.token);
        return { ok: true, user: res.user };
      }).catch(function (e) {
        return { ok: false, error: e.message || 'Google sign-in failed.' };
      });
    };

    publicAPI.getGoogleConfig = function () {
      return apiJson('/oauth/google-config', { method: 'GET' });
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

    // ── USERS (admin) ────────────────────────────────────────────────────────

    publicAPI.getAllUsers = function () {
      return apiJson('/users/admin/all', { method: 'GET', headers: authHeaders() });
    };

    publicAPI.deleteUser = function (id) {
      return apiJson('/users/admin/' + encodeURIComponent(id), {
        method: 'DELETE',
        headers: authHeaders()
      }).then(function () { return true; });
    };

    // ── PRODUCTS ───────────────────────────────────────────────────────────────

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

    publicAPI.searchProducts = function (query) {
      return apiJson('/products/search?q=' + encodeURIComponent(query), { method: 'GET' });
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

    // ── ORDERS ────────────────────────────────────────────────────────────────

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

    // ── PAYMENT ───────────────────────────────────────────────────────────────

    publicAPI.createRazorpayOrder = function (amount, items) {
      return apiJson('/payment/create-razorpay-order', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ amount: amount, items: items })
      });
    };

    publicAPI.verifyRazorpayPayment = function (razorpayOrderId, razorpayPaymentId, razorpaySignature) {
      return apiJson('/payment/verify-razorpay', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({
          razorpayOrderId: razorpayOrderId,
          razorpayPaymentId: razorpayPaymentId,
          razorpaySignature: razorpaySignature
        })
      });
    };

    publicAPI.verifyUtr = function (utr, amount) {
      return apiJson('/payment/verify-utr', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ utr: utr, amount: amount })
      });
    };

    publicAPI.getBankDetails = function () {
      return apiJson('/payment/bank-details', { method: 'GET' });
    };

    publicAPI.seedUtr = function (count, amount) {
      return apiJson('/payment/seed-utr', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ count: count || 10, amount: amount || 1000 })
      });
    };

    // ── LOCATION ─────────────────────────────────────────────────────────────

    publicAPI.getPincodeDetails = function (pincode) {
      return apiJson('/location/pincode/' + encodeURIComponent(pincode), { method: 'GET' });
    };

    publicAPI.getStates = function () {
      return apiJson('/location/states', { method: 'GET' });
    };

    publicAPI.getCities = function (state) {
      return apiJson('/location/cities/' + encodeURIComponent(state), { method: 'GET' });
    };

    // ── OTP ──────────────────────────────────────────────────────────────────

    publicAPI.generateDeliveryOtp = function (orderId) {
      return apiJson('/otp/generate', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ orderId: orderId })
      });
    };

    publicAPI.verifyDeliveryOtp = function (orderId, otp) {
      return apiJson('/otp/verify', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ orderId: orderId, otp: otp })
      });
    };

    publicAPI.resendDeliveryOtp = function (orderId) {
      return apiJson('/otp/resend', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ orderId: orderId })
      });
    };

    publicAPI.getOtpStatus = function (orderId) {
      return apiJson('/otp/status/' + encodeURIComponent(orderId), { method: 'GET', headers: authHeaders() });
    };

    // ── STATS (admin) ─────────────────────────────────────────────────────────

    publicAPI.getDashboardStats = function () {
      return apiJson('/stats/admin/dashboard', { method: 'GET', headers: authHeaders() });
    };

    return publicAPI;
  })();

  window.BC = BC;
})();

