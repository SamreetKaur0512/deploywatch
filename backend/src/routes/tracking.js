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

  function sendView(extraData) {
    var trackingId = getTrackingId();
    if (!trackingId) return;
    var backendUrl = getBackendUrl();
    if (!backendUrl) return;

    var autoUser = detectUser();
    var params   = new URLSearchParams(window.location.search);

    var data = Object.assign({
      trackingId:   trackingId,
      referrer:     document.referrer || '',
      utmSource:    params.get('ref') || params.get('utm_source') || '',
      utmMedium:    params.get('utm_medium') || '',
      visitorName:  autoUser.name  || '',
      visitorEmail: autoUser.email || '',
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
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  ready(function() { sendView(); });

  var _pushState    = history.pushState;
  var _replaceState = history.replaceState;
  var lastPath      = location.pathname;

  function onRouteChange() {
    var currentPath = location.pathname;
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
