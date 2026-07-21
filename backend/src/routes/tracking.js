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
  // Pure in-memory flag, private to this closure — unlike sessionStorage,
  // nothing on the host page can ever reset this. Protects against the host
  // project's own code (e.g. an app that clears sessionStorage on load as
  // part of its own auth/session logic) accidentally wiping our dedup flag
  // and letting a second, genuine duplicate request out for the same load.
  var hasSentThisPageLoad = false;

  // Persistent first-party cookie, separate from the developer's own login
  // cookies/session. Lets a returning visitor be recognized across days and
  // browser sessions (e.g. cookie-based auth that never re-exposes identity
  // to localStorage) so their previously-captured identity can be carried
  // forward onto new views without needing to re-detect it.
  function getUid() {
    try {
      var match = document.cookie.match(/(?:^|; )dw_uid=([^;]*)/);
      if (match) return decodeURIComponent(match[1]);
    } catch (e) {}

    var uid = 'dwu_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
    try {
      var maxAge = 400 * 24 * 60 * 60; // 400 days — the max Chrome allows
      document.cookie = 'dw_uid=' + encodeURIComponent(uid) + '; max-age=' + maxAge + '; path=/; SameSite=Lax';
    } catch (e) {}
    return uid;
  }

  // Fetches and caches the project's public key (once per page load). Returns
  // null if the project hasn't set up encryption or the fetch/crypto isn't
  // available — callers fall back to plaintext in that case.
  var publicKeyPromise = null;
  function getCachedPublicKey(backendUrl, trackingId) {
    if (publicKeyPromise) return publicKeyPromise;
    if (!window.crypto || !window.crypto.subtle) {
      publicKeyPromise = Promise.resolve(null);
      return publicKeyPromise;
    }
    publicKeyPromise = fetch(backendUrl + '/api/analytics/public-key/' + encodeURIComponent(trackingId))
      .then(function(r) { return r.json(); })
      .then(function(json) { return (json && json.publicKey) || null; })
      .catch(function() { return null; });
    return publicKeyPromise;
  }

  function base64ToBuffer(base64) {
    var binary = atob(base64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  function bufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  // Hybrid encryption (RSA-OAEP wraps a random AES-GCM key) so the payload
  // size isn't limited by RSA's small max plaintext. DeployWatch's server
  // only ever sees the three base64 blobs below — it has no private key and
  // cannot decrypt them. Only the developer, holding the matching private
  // key generated in their own browser, can.
  function encryptIdentity(publicKeyBase64, name, email) {
    return crypto.subtle.importKey(
      'spki',
      base64ToBuffer(publicKeyBase64),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt']
    ).then(function(publicKey) {
      return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']).then(function(aesKey) {
        var iv = crypto.getRandomValues(new Uint8Array(12));
        var plaintext = new TextEncoder().encode(JSON.stringify({ name: name || '', email: email || '' }));

        return Promise.all([
          crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, aesKey, plaintext),
          crypto.subtle.exportKey('raw', aesKey).then(function(rawKey) {
            return crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawKey);
          }),
        ]).then(function(results) {
          var ciphertext = results[0];
          var encryptedAesKey = results[1];
          return JSON.stringify({
            k: bufferToBase64(encryptedAesKey),
            iv: bufferToBase64(iv.buffer),
            d: bufferToBase64(ciphertext),
          });
        });
      });
    }).catch(function() { return null; });
  }

  function sendView(extraData) {
    if (hasSentThisPageLoad) return;

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
    hasSentThisPageLoad = true;

    var autoUser = detectUser();
    var params   = new URLSearchParams(window.location.search);
    var uid      = getUid();

    // extraData (from a manual window.deployWatchTrackView({visitorName, visitorEmail})
    // call) takes priority over what was auto-detected from storage.
    var manualName  = (extraData && extraData.visitorName)  || '';
    var manualEmail = (extraData && extraData.visitorEmail) || '';
    var finalName   = manualName  || autoUser.name  || '';
    var finalEmail  = manualEmail || autoUser.email || '';

    var restExtraData = Object.assign({}, extraData);
    delete restExtraData.visitorName;
    delete restExtraData.visitorEmail;

    var baseData = Object.assign({
      trackingId:   trackingId,
      sessionId:    sessionId,
      uid:          uid,
      referrer:     document.referrer || '',
      utmSource:    params.get('ref') || params.get('utm_source') || '',
      utmMedium:    params.get('utm_medium') || '',
      page:         window.location.pathname,
      hash:         window.location.hash || '',
    }, restExtraData);

    function deliver(data) {
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

    var hasIdentity = finalName || finalEmail;

    if (!hasIdentity) {
      deliver(baseData);
      return;
    }

    // If the project has set up end-to-end encryption, encrypt the identity
    // client-side before it ever leaves the browser. Otherwise fall back to
    // sending it as plaintext, same as before.
    getCachedPublicKey(backendUrl, trackingId).then(function(publicKey) {
      if (!publicKey) {
        deliver(Object.assign({}, baseData, { visitorName: finalName, visitorEmail: finalEmail }));
        return;
      }
      encryptIdentity(publicKey, finalName, finalEmail).then(function(encrypted) {
        if (encrypted) {
          deliver(Object.assign({}, baseData, { encryptedVisitorData: encrypted }));
        } else {
          deliver(Object.assign({}, baseData, { visitorName: finalName, visitorEmail: finalEmail }));
        }
      });
    });
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
