const Project = require('../models/Project');
const dbConnector = require('../utils/dbConnector');

// Helper — save encrypted credentials
const saveCredentials = async (req, res, next) => {
  try {
    const {
      encryptedMongoUri, encryptedGithubToken, encryptedVercelToken,
      encryptedDbUri, encryptedFirebaseCreds,
      encryptedSupabaseUrl, encryptedSupabaseKey,
      userCollection, dbType,
    } = req.body;

    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const update = {};
    if (encryptedMongoUri      !== undefined) { update.encryptedMongoUri      = encryptedMongoUri;      update.hasMongoUri      = !!encryptedMongoUri; }
    if (encryptedGithubToken   !== undefined) { update.encryptedGithubToken   = encryptedGithubToken;   update.hasGithubToken   = !!encryptedGithubToken; }
    if (encryptedVercelToken   !== undefined) { update.encryptedVercelToken   = encryptedVercelToken;   update.hasVercelToken   = !!encryptedVercelToken; }
    if (encryptedDbUri         !== undefined) { update.encryptedDbUri         = encryptedDbUri;         update.hasDbCredentials = !!encryptedDbUri; }
    if (encryptedFirebaseCreds !== undefined) { update.encryptedFirebaseCreds = encryptedFirebaseCreds; update.hasDbCredentials = !!encryptedFirebaseCreds; }
    if (encryptedSupabaseUrl   !== undefined) { update.encryptedSupabaseUrl   = encryptedSupabaseUrl; }
    if (encryptedSupabaseKey   !== undefined) { update.encryptedSupabaseKey   = encryptedSupabaseKey;   update.hasDbCredentials = !!encryptedSupabaseKey; }
    if (userCollection) update.userCollection = userCollection;
    if (dbType)         update.dbType         = dbType;

    await Project.findByIdAndUpdate(req.params.id, update);
    res.status(200).json({ success: true, message: 'Credentials saved securely.' });
  } catch (error) { next(error); }
};

// Helper — get encrypted credentials (client decrypts)
const getCredentials = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id })
      .select('+encryptedMongoUri +encryptedGithubToken +encryptedVercelToken +encryptedDbUri +encryptedFirebaseCreds +encryptedSupabaseUrl +encryptedSupabaseKey +encryptedSQLitePath');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    res.status(200).json({
      success: true,
      credentials: {
        encryptedMongoUri:      project.encryptedMongoUri      || '',
        encryptedGithubToken:   project.encryptedGithubToken   || '',
        encryptedVercelToken:   project.encryptedVercelToken   || '',
        encryptedDbUri:         project.encryptedDbUri         || '',
        encryptedFirebaseCreds: project.encryptedFirebaseCreds || '',
        encryptedSupabaseUrl:   project.encryptedSupabaseUrl   || '',
        encryptedSupabaseKey:   project.encryptedSupabaseKey   || '',
        encryptedSQLitePath:    project.encryptedSQLitePath    || '',
        userCollection: project.userCollection || 'users',
        dbType:         project.dbType         || 'none',
      },
    });
  } catch (error) { next(error); }
};

// Remove credentials
const removeCredentials = async (req, res, next) => {
  try {
    const { type } = req.body;
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const update = {};
    if (type === 'mongo'    || type === 'all') { update.encryptedMongoUri      = ''; update.hasMongoUri      = false; }
    if (type === 'github'   || type === 'all') { update.encryptedGithubToken   = ''; update.hasGithubToken   = false; }
    if (type === 'vercel'   || type === 'all') { update.encryptedVercelToken   = ''; update.hasVercelToken   = false; }
    if (type === 'db'       || type === 'all') {
      update.encryptedDbUri         = '';
      update.encryptedFirebaseCreds = '';
      update.encryptedSupabaseUrl   = '';
      update.encryptedSupabaseKey   = '';
      update.encryptedSQLitePath    = '';
      update.hasDbCredentials       = false;
      update.dbType                 = 'none';
    }

    await Project.findByIdAndUpdate(req.params.id, update);
    res.status(200).json({ success: true, message: 'Credentials removed.' });
  } catch (error) { next(error); }
};

// Fetch users — client decrypts and sends plain credentials for this request only
const fetchProjectUsers = async (req, res, next) => {
  try {
    const { credentials, page = 1, limit = 20, search = '' } = req.body;
    if (!credentials) return res.status(400).json({ success: false, message: 'Credentials required.' });

    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const dbType = project.dbType || 'mongodb';
    const table  = project.userCollection || 'users';

    const { users, total } = await dbConnector.fetchUsers(dbType, credentials, table, {
      search, page: parseInt(page), limit: parseInt(limit),
    });

    res.status(200).json({
      success: true, total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      users, dbType,
    });
  } catch (error) {
    if (error.message?.includes('ENOTFOUND') || error.message?.includes('ECONNREFUSED')) {
      return res.status(400).json({ success: false, message: 'Could not connect to database. Check your credentials.' });
    }
    next(error);
  }
};

// Update user
const updateProjectUser = async (req, res, next) => {
  try {
    const { credentials, updates } = req.body;
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const safe = { ...updates };
    delete safe.password; delete safe.passwordHash; delete safe.passwd; delete safe.pwd;

    const updated = await dbConnector.updateUser(project.dbType || 'mongodb', credentials, project.userCollection || 'users', req.params.userId, safe);
    res.status(200).json({ success: true, message: 'User updated.', user: updated });
  } catch (error) { next(error); }
};

// Block/Unblock user
const blockProjectUser = async (req, res, next) => {
  try {
    const { credentials, block } = req.body;
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const updated = await dbConnector.blockUser(project.dbType || 'mongodb', credentials, project.userCollection || 'users', req.params.userId, block);
    res.status(200).json({ success: true, message: `User ${block ? 'blocked' : 'unblocked'}.`, user: updated });
  } catch (error) { next(error); }
};

// Delete user
const deleteProjectUser = async (req, res, next) => {
  try {
    const { credentials } = req.body;
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    await dbConnector.deleteUser(project.dbType || 'mongodb', credentials, project.userCollection || 'users', req.params.userId);
    res.status(200).json({ success: true, message: 'User deleted.' });
  } catch (error) { next(error); }
};

module.exports = { saveCredentials, getCredentials, removeCredentials, fetchProjectUsers, updateProjectUser, blockProjectUser, deleteProjectUser };
