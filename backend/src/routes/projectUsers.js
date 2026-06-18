const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams for :id
const {
  saveCredentials,
  getCredentials,
  removeCredentials,
  fetchProjectUsers,
  updateProjectUser,
  blockProjectUser,
  deleteProjectUser,
} = require('../controllers/projectUsersController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Credentials
router.put('/credentials',    saveCredentials);
router.get('/credentials',    getCredentials);
router.delete('/credentials', removeCredentials);

// Project users (client decrypts URI and sends it)
router.post('/users/fetch',               fetchProjectUsers);
router.post('/users/:userId/update',      updateProjectUser);
router.post('/users/:userId/block',       blockProjectUser);
router.post('/users/:userId/delete',      deleteProjectUser);

module.exports = router;
