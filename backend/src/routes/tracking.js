const express = require('express');
const router = express.Router();

const trackingScript = `
(function() {
  if (window.deployWatchScriptLoaded) return;
  window.deployWatchScriptLoaded = true;

  // IMPORTANT: document.currentScript is ONLY valid while this script is
  // executing synchronously. Every call site below (sendView) runs later,
  // inside a setTimeout — by then document.currentScript is always null,
  // regardless of project type. So we grab it here, at parse time, once,
  // and reuse it. This is the reliable path; the DOM-query fallback below
  // only kicks in for the rare case this line itself failed to run early
  // enough (e.g. script re-inserted dynamically after load).
  var initialScriptEl = document.currentScript || null;

  function findScriptEl() {
    if (initialScriptEl && document.contains(initialScriptEl)) return initialScriptEl;
    var scripts = Array.from(document.querySelectorAll('script[data-tracking-id]'));
    return scripts.find(function(item) {
      return (item.getAttribute('src') || '').includes('/tracking.js');
    }) || scripts[0] || null;
  }

  function getTrackingId() {
    var script = findScriptEl();
    var id = (script && script.getAttribute('data-tracking-id')) ||
      window.deployWatchTrackingId || '';

    if (!id && window.console && console.warn) {
      console.warn(
        '[DeployWatch] Could not find a data-tracking-id on the tracking script tag. ' +
        'Views for this project will NOT be counted. Check that the <script src=".../tracking.js" data-tracking-id="..."> ' +
        'tag is present in the page and was not stripped/rewritten by your build tool.'
      );
    }
    return id;
  }

  function getSessionId() {
    var key = 'deployWatchSessionId';
    try {
      var existing = sessionStorage.getItem(key);
      if (existing) return existing;
    } catch (e) {}

    var id = 'dw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    try {
      sessionStorage.setItem(key, id);
    } catch (e) {}
    return id;
  }

  function getBackendUrl() {
    var script = findScriptEl();
    if (!script) {
      var scripts = Array.from(document.querySelectorAll('script[src]'));
      script = scripts.find(function(item) {
        return (item.getAttribute('src') || '').includes('/tracking.js');
      }) || scripts[0];
    }

    if (script && script.src) {
      try { return new URL(script.src).origin; } catch(e) {}
    }

    if (window.console && console.warn) {
      console.warn(
        '[DeployWatch] Could not resolve the backend URL from the tracking script tag. ' +
        'Views for this project will NOT be counted.'
      );
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

  function detectUser() {
    var name  = '';
    var email = '';
    var userKeys  = ['user','currentUser','userData','loggedInUser','authUser','profile','me','account'];
    var tokenKeys = ['token','authToken','accessToken','jwt','auth_token','access_token','userToken'];
    var storages  = [localStorage, sessionStorage];

    for (var s = 0; s < storages.length; s++) {
      var storage = storages[s];
      try {
        for (var i = 0; i < userKeys.length; i++) {
          var raw = storage.getItem(userKeys[i]);
          if (!raw) continue;
          try {
            var obj = JSON.parse(raw);
            if (typeof obj === 'object' && obj !== null) {
              name  = name  || obj.name || obj.username || obj.displayName || obj.fullName || obj.first_name || '';
              email = email || obj.email || obj.emailAddress || obj.mail || '';
              if (name && email) return { name: name, email: email };
            }
          } catch(e) {}
        }
        for (var j = 0; j < tokenKeys.length; j++) {
          var token = storage.getItem(tokenKeys[j]);
          if (!token) continue;
          if (token.indexOf('Bearer ') === 0) token = token.slice(7);
          var decoded = decodeJWT(token);
          if (decoded) {
            name  = name  || decoded.name || decoded.username || decoded.displayName || '';
            email = email || decoded.email || '';
            if (decoded.sub && decoded.sub.indexOf('@') !== -1) email = email || decoded.sub;
            if (name && email) return { name: name, email: email };
          }
        }
      } catch(e) {}
    }

    var globals = ['currentUser','user','authUser','loggedInUser','__user','APP_USER'];
    for (var g = 0; g < globals.length; g++) {
      try {
        var u = window[globals[g]];
        if (u && typeof u === 'object') {
          name  = name  || u.name || u.username || u.displayName || '';
          email = email || u.email || u.emailAddress || '';
          if (name || email) return { name: name, email: email };
        }
      } catch(e) {}
    }

    return { name: name, email: email };
  }

  var lastSentKey = '';
  var lastSentAt = 0;

  function sendView(extraData) {
    var trackingId = getTrackingId();
    if (!trackingId) return;
    var backendUrl = getBackendUrl();
    if (!backendUrl) return;

    var sessionId = getSessionId();
    var sessionFlag = 'deployWatchTrackedSession';
    try {
      if (sessionStorage.getItem(sessionFlag) === sessionId) return;
      sessionStorage.setItem(sessionFlag, sessionId);
    } catch (e) {}

    var currentKey = [trackingId, sessionId, window.location.pathname, window.location.search, window.location.hash].join('|');
    var now = Date.now();
    if (currentKey === lastSentKey && now - lastSentAt < 5000) return;
    lastSentKey = currentKey;
    lastSentAt = now;

    var autoUser = detectUser();
    var params   = new URLSearchParams(window.location.search);

    var data = Object.assign({
      trackingId:   trackingId,
      sessionId:    sessionId,
      referrer:     document.referrer || '',
      utmSource:    params.get('ref') || params.get('utm_source') || '',
      utmMedium:    params.get('utm_medium') || '',
      visitorName:  autoUser.name  || '',
      visitorEmail: autoUser.email || '',
      page:         window.location.pathname,
      hash:         window.location.hash || '',
    }, extraData || {});

    var url     = backendUrl + '/api/analytics/track';
    var payload = JSON.stringify(data);

    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) return;
      } catch(e) {}
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(function() {});
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else { fn(); }
  }

  ready(function() {
    setTimeout(function() { sendView(); }, 100);
    window.addEventListener('load', function() {
      setTimeout(function() { sendView(); }, 200);
    }, { once: true });
  });

  var _pushState    = history.pushState;
  var _replaceState = history.replaceState;
  var lastPath      = window.location.pathname + window.location.search + window.location.hash;

  function onRouteChange() {
    var currentPath = window.location.pathname + window.location.search + window.location.hash;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      setTimeout(function() { sendView(); }, 300);
    }
  }

  history.pushState = function() {
    _pushState.apply(history, arguments);
    onRouteChange();
  };
  history.replaceState = function() {
    _replaceState.apply(history, arguments);
    onRouteChange();
  };
  window.addEventListener('popstate', onRouteChange);
  window.addEventListener('hashchange', onRouteChange);

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
