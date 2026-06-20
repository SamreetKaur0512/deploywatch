const express = require('express');
const router = express.Router();

const trackingScript = `
(function() {
  if (window.deployWatchScriptLoaded) return;
  window.deployWatchScriptLoaded = true;

  function getTrackingId() {
    var script = document.currentScript ||
      document.querySelector('script[data-tracking-id][src*="/tracking.js"]');
    return (script && script.getAttribute('data-tracking-id')) ||
      window.deployWatchTrackingId || '';
  }

  function getBackendUrl() {
    var script = document.currentScript ||
      document.querySelector('script[src*="/tracking.js"]');
    if (script && script.src) {
      try { return new URL(script.src).origin; } catch(e) {}
    }
    return '';
  }

  function decodeJWT(token) {
    try {
      var base64 = token.split('.')[1];
      if (!base64) return null;
      var padded = base64.replace(/-/g,'+').replace(/_/g,'/');
      while (padded.length % 4) padded += '=';
      var json = decodeURIComponent(
        atob(padded).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')
      );
      return JSON.parse(json);
    } catch(e) { return null; }
  }

  function tryParseJSON(value) {
    if (!value || typeof value !== 'string') return null;
    try { return JSON.parse(value); } catch (e) { return null; }
  }

  function parseCookies() {
    var cookies = {};
    var cookieString = document.cookie || '';
    cookieString.split(/;\s*/).forEach(function(pair) {
      var idx = pair.indexOf('=');
      if (idx < 0) return;
      var key = pair.slice(0, idx);
      var value = pair.slice(idx + 1);
      try { value = decodeURIComponent(value); } catch (e) {}
      cookies[key] = value;
    });
    return cookies;
  }

  function extractUserInfo(obj) {
    if (!obj || typeof obj !== 'object') return null;
    var name = obj.name || obj.username || obj.displayName || obj.fullName || obj.userName || '';
    if (!name && obj.firstName && obj.lastName) name = obj.firstName + ' ' + obj.lastName;
    var email = obj.email || obj.emailAddress || obj.mail || (obj.contact && obj.contact.email) || (obj.user && obj.user.email) || '';
    var userId = obj.id || obj._id || obj.userId || obj.sub || (obj.user && (obj.user.id || obj.user._id || obj.user.userId)) || '';
    if (typeof obj === 'string' && obj.indexOf('@') !== -1) email = email || obj;
    if (obj.profile && typeof obj.profile === 'object') {
      email = email || obj.profile.email || '';
      name = name || obj.profile.name || obj.profile.username || '';
    }
    if (name || email || userId) return { name: name || '', email: email || '', userId: userId || '' };
    return null;
  }

  function detectUserSync() {
    var name = '', email = '', userId = '';
    var userKeys = ['dw_user','user','currentUser','userData','loggedInUser','authUser','profile','me','account','userInfo','current_user','user_info','authUserInfo','sessionUser','userState','appUser'];
    var tokenKeys = ['dw_token','token','authToken','accessToken','jwt','auth_token','access_token','userToken'];
    var storages = [localStorage, sessionStorage];

    for (var s = 0; s < storages.length; s++) {
      var storage = storages[s];
      try {
        for (var i = 0; i < userKeys.length; i++) {
          var raw = storage.getItem(userKeys[i]);
          if (!raw) continue;
          var obj = tryParseJSON(raw) || raw;
          var info = extractUserInfo(obj);
          if (info) {
            name = name || info.name;
            email = email || info.email;
            userId = userId || info.userId;
            if (name && email) return { name: name, email: email, userId: userId };
          }
        }

        for (var k = 0; k < storage.length; k++) {
          var storageKey = storage.key(k);
          if (!storageKey) continue;
          if (/user|auth|profile|account|session/i.test(storageKey) && userKeys.indexOf(storageKey) === -1) {
            var rawValue = storage.getItem(storageKey);
            if (!rawValue) continue;
            var obj = tryParseJSON(rawValue) || rawValue;
            var info = extractUserInfo(obj);
            if (info) {
              name = name || info.name;
              email = email || info.email;
              userId = userId || info.userId;
              if (name && email) return { name: name, email: email, userId: userId };
            }
          }
        }

        for (var j = 0; j < tokenKeys.length; j++) {
          var token = storage.getItem(tokenKeys[j]);
          if (!token) continue;
          if (token.indexOf('Bearer ') === 0) token = token.slice(7);
          var decoded = decodeJWT(token);
          if (decoded) {
            var info = extractUserInfo(decoded);
            if (info) {
              name = name || info.name;
              email = email || info.email;
              userId = userId || info.userId;
              if (info.sub && info.sub.indexOf('@') !== -1) email = email || info.sub;
              if (name && email) return { name: name, email: email, userId: userId };
              if (userId) return { name: name, email: email, userId: userId };
            }
          }
        }
      } catch (e) {}
    }

    try {
      var cookies = parseCookies();
      var cookieKeys = ['dw_token','token','authToken','accessToken','jwt','auth_token','access_token','userToken','session','sessionid','sid'];
      for (var c = 0; c < cookieKeys.length; c++) {
        var cookieValue = cookies[cookieKeys[c]];
        if (!cookieValue) continue;
        if (cookieValue.indexOf('Bearer ') === 0) cookieValue = cookieValue.slice(7);
        var decodedCookie = decodeJWT(cookieValue);
        if (decodedCookie) {
          var info = extractUserInfo(decodedCookie);
          if (info) {
            name = name || info.name;
            email = email || info.email;
            userId = userId || info.userId;
            if (info.sub && info.sub.indexOf('@') !== -1) email = email || info.sub;
            if (name && email) return { name: name, email: email, userId: userId };
            if (userId) return { name: name, email: email, userId: userId };
          }
        }
      }
    } catch (e) {}

    var globals = ['__NEXT_DATA__','__INITIAL_STATE__','__NUXT__','currentUser','user','authUser','loggedInUser','__user','APP_STATE','window.__APP_STATE__'];
    for (var g = 0; g < globals.length; g++) {
      try {
        var u = window[globals[g]];
        var info = extractUserInfo(u);
        if (info) {
          name = name || info.name;
          email = email || info.email;
          userId = userId || info.userId;
          if (name || email || userId) return { name: name, email: email, userId: userId };
        }
      } catch (e) {}
    }

    return { name: name, email: email, userId: userId };
  }

  function queryMetaContent(name) {
    var meta = document.querySelector('meta[name="' + name + '"]') || document.querySelector('meta[property="' + name + '"]');
    return meta ? meta.content || '' : '';
  }

  function extractUserFromDOM() {
    var name = queryMetaContent('user-name') || queryMetaContent('og:title') || queryMetaContent('profile:name') || '';
    var email = queryMetaContent('user-email') || queryMetaContent('og:email') || queryMetaContent('profile:email') || '';
    if (!email) {
      var mailto = document.querySelector('a[href^="mailto:"]');
      if (mailto) {
        email = mailto.getAttribute('href').replace(/^mailto:/i, '').split('?')[0] || '';
      }
    }
    if (!name) {
      var userEl = document.querySelector('[data-user-name], [data-current-user], .user-name, .username, .profile-name');
      if (userEl) name = userEl.textContent.trim();
    }
    if (name || email) return { name: name || '', email: email || '', userId: '' };
    return null;
  }

  function fetchJson(url) {
    try {
      return fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }).then(function(res) {
        if (!res.ok) return null;
        return res.json().catch(function() { return null; });
      }).catch(function() { return null; });
    } catch (e) {
      return Promise.resolve(null);
    }
  }

  async function probeProfileEndpoints() {
    var endpoints = ['/api/auth/me', '/auth/me', '/api/me', '/me', '/api/user', '/user', '/profile', '/api/profile'];
    for (var i = 0; i < endpoints.length; i++) {
      try {
        var result = await fetchJson(endpoints[i]);
        if (!result) continue;
        var info = extractUserInfo(result);
        if (info && (info.name || info.email || info.userId)) return info;
      } catch (e) {}
    }
    return null;
  }

  async function detectUser() {
    var auto = detectUserSync();
    if (auto.name || auto.email || auto.userId) return auto;
    var dom = extractUserFromDOM();
    if (dom && (dom.name || dom.email)) return dom;
    var apiInfo = await probeProfileEndpoints();
    if (apiInfo && (apiInfo.name || apiInfo.email || apiInfo.userId)) return apiInfo;
    return auto;
  }

  async function sendView(extraData) {
    var trackingId = getTrackingId();
    if (!trackingId) return;
    var backendUrl = getBackendUrl();
    if (!backendUrl) return;

    var autoUser = await detectUser();
    var params   = new URLSearchParams(window.location.search);

    // Build sensible fallbacks: prefer name, then userId, then email-derived name.
    var vName = autoUser.name || autoUser.userId || (autoUser.email ? autoUser.email.split('@')[0] : '');
    var vEmail = autoUser.email || (autoUser.userId && autoUser.userId.indexOf('@') !== -1 ? autoUser.userId : '');

    var data = Object.assign({
      trackingId:   trackingId,
      referrer:     document.referrer || '',
      utmSource:    params.get('ref') || params.get('utm_source') || '',
      utmMedium:    params.get('utm_medium') || '',
      visitorName:  vName || '',
      visitorEmail: vEmail || '',
      visitorId:    autoUser.userId || '',
    }, extraData || {});

    try {
      console.log('DeployWatch: sendView', data);
    } catch (e) {}
    fetch(backendUrl + '/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      mode: 'cors',
      credentials: 'omit'
    }).catch(function() {});
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function() { sendView(); });

  var _pushState = history.pushState;
  var _replaceState = history.replaceState;
  var lastPath = location.pathname;

  function onRouteChange() {
    var currentPath = location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      setTimeout(function() { sendView(); }, 300);
    }
  }

  history.pushState = function() { _pushState.apply(history, arguments); onRouteChange(); };
  history.replaceState = function() { _replaceState.apply(history, arguments); onRouteChange(); };
  window.addEventListener('popstate', onRouteChange);
  window.deployWatchTrackView = sendView;
})();
`;

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(trackingScript);
});

module.exports = router;
