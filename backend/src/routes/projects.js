const express = require('express');
const router = express.Router();
const {
  addProject,
  getMyProjects,
  getProject,
  updateProject,
  deleteProject,
  pingProject,
  getProjectAnalytics,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

router.use(protect); // All project routes require login

router.route('/').get(getMyProjects).post(addProject);
router.route('/:id').get(getProject).put(updateProject).delete(deleteProject);
router.post('/:id/ping', pingProject);
router.get('/:id/analytics', getProjectAnalytics);

module.exports = router;
