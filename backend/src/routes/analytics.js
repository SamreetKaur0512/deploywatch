const express = require('express');
const router = express.Router();
const {
  trackView,
  getDashboardStats,
  getAllViews,
  getProjectRankings,
  getPublicKey,
  getEncryptedViews,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');

// Public route - for tracking script
router.post('/track', trackView);
router.options('/track', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

// Public route - tracking script fetches the project's public key once, to
// encrypt visitor identity client-side before sending it. Not sensitive to
// expose — that is the entire point of a public key.
router.get('/public-key/:trackingId', getPublicKey);
router.options('/public-key/:trackingId', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.sendStatus(200);
});

// Private routes
router.get('/dashboard', protect, getDashboardStats);
router.get('/views', protect, getAllViews);
router.get('/rankings', protect, getProjectRankings);

// Private — returns raw ciphertext blobs for a project's views so the
// developer's browser can decrypt them locally with their own private key.
// The server never decrypts anything here; it just returns what's stored.
router.get('/encrypted-views/:projectId', protect, getEncryptedViews);

module.exports = router;
