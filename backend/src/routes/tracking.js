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
    // Get backend URL from the script src itself
    var script = document.currentScript ||
      document.querySelector('script[src*="/tracking.js"]');
    if (script && script.src) {
      try {
        var url = new URL(script.src);
        return url.origin;
      } catch (e) {}
    }
    return '';
  }

  function sendView(extraData) {
    var trackingId = getTrackingId();
    if (!trackingId) {
      console.warn('[DeployWatch] No trackingId found. Add data-tracking-id attribute to script tag.');
      return;
    }

    var backendUrl = getBackendUrl();
    if (!backendUrl) {
      console.warn('[DeployWatch] Could not detect backend URL.');
      return;
    }

    var params = new URLSearchParams(window.location.search);
    var data = Object.assign({
      trackingId:   trackingId,
      referrer:     document.referrer || '',
      utmSource:    params.get('ref') || '',
      utmMedium:    params.get('utm_medium') || '',
      visitorName:  '',
      visitorEmail: '',
    }, extraData || {});

    var url = backendUrl + '/api/analytics/track';
    var payload = JSON.stringify(data);

    if (navigator.sendBeacon) {
      try {
        var blob = new Blob([payload], { type: 'application/json' });
        if (navigator.sendBeacon(url, blob)) return;
      } catch (e) {}
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(function() {});
  }

  // Auto-track on page load
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function() { sendView(); });

  // Expose for manual calls (login tracking etc.)
  window.deployWatchTrackView = sendView;
})();
`;

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(trackingScript);
});

module.exports = router;
