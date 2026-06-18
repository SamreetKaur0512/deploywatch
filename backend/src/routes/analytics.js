const express = require('express');
const router = express.Router();
const {
  trackView,
  getDashboardStats,
  getAllViews,
  getProjectRankings,
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

// Private routes
router.get('/dashboard', protect, getDashboardStats);
router.get('/views', protect, getAllViews);
router.get('/rankings', protect, getProjectRankings);

module.exports = router;
