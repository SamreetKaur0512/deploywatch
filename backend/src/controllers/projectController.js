const axios = require('axios');
const Project = require('../models/Project');
const View = require('../models/View');
const ErrorLog = require('../models/ErrorLog');
const Notification = require('../models/Notification');

// @desc    Add new project
// @route   POST /api/projects
// @access  Private
const addProject = async (req, res, next) => {
  try {
    const { name, description, platform, liveUrl, githubUrl, techStack } = req.body;

    if (!name || !platform || !liveUrl) {
      return res.status(400).json({
        success: false,
        message: 'Name, platform and liveUrl are required.',
      });
    }

    const project = await Project.create({
      owner: req.user._id,
      name,
      description,
      platform,
      liveUrl,
      githubUrl,
      techStack: techStack || [],
    });

    // Update user project count
    await require('../models/User').findByIdAndUpdate(req.user._id, {
      $inc: { projectCount: 1 },
    });

    res.status(201).json({
      success: true,
      message: 'Project added successfully!',
      project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all projects of logged in user
// @route   GET /api/projects
// @access  Private
const getMyProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ owner: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    res.status(200).json({ success: true, project });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res, next) => {
  try {
    const { name, description, platform, liveUrl, githubUrl, techStack, trackingEnabled } = req.body;

    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, platform, liveUrl, githubUrl, techStack, trackingEnabled },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Project updated!', project: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    await Project.findByIdAndDelete(req.params.id);

    // Clean up related data
    await View.deleteMany({ project: req.params.id });
    await ErrorLog.deleteMany({ project: req.params.id });
    await Notification.deleteMany({ project: req.params.id });

    // Update user project count
    await require('../models/User').findByIdAndUpdate(req.user._id, {
      $inc: { projectCount: -1 },
    });

    res.status(200).json({ success: true, message: 'Project deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually ping / check status of a project
// @route   POST /api/projects/:id/ping
// @access  Private
const pingProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const result = await checkProjectStatus(project, req.app.get('io'));

    res.status(200).json({
      success: true,
      message: 'Ping complete.',
      status: result.status,
      responseTime: result.responseTime,
      lastChecked: result.lastChecked,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project analytics summary
// @route   GET /api/projects/:id/analytics
// @access  Private
const getProjectAnalytics = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const views = await View.find({ project: req.params.id }).sort({ viewedAt: -1 }).limit(100);

    // Device breakdown
    const deviceStats = await View.aggregate([
      { $match: { project: project._id } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
    ]);

    // Country breakdown
    const countryStats = await View.aggregate([
      { $match: { project: project._id } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Views by day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyViews = await View.aggregate([
      { $match: { project: project._id, viewedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Recruiter visits
    const recruiterVisits = await View.countDocuments({ project: project._id, isRecruiter: true });

    res.status(200).json({
      success: true,
      analytics: {
        totalViews: project.totalViews,
        uniqueVisitors: project.uniqueVisitors,
        recentViews: views.slice(0, 20),
        deviceStats,
        countryStats,
        dailyViews,
        recruiterVisits,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Internal Helper: Check single project status ───────────────────────────
const checkProjectStatus = async (project, io) => {
  const start = Date.now();
  let status = 'down';
  let responseTime = null;
  let statusCode = null;

  try {
    const response = await axios.get(project.liveUrl, {
      timeout: 10000,
      validateStatus: () => true, // don't throw on any status
    });

    responseTime = Date.now() - start;
    statusCode = response.status;

    if (response.status >= 200 && response.status < 400) {
      status = 'active';
    } else {
      status = 'down';
    }
  } catch (err) {
    responseTime = Date.now() - start;
    status = 'down';

    // Log the error
    await ErrorLog.create({
      project: project._id,
      owner: project.owner,
      errorType: err.code === 'ECONNABORTED' ? 'timeout' : 'down',
      message: err.message || 'Connection failed',
      statusCode: statusCode,
      responseTime,
    });

    // Send notification if io available
    if (io) {
      const notification = await Notification.create({
        recipient: project.owner,
        type: 'project_down',
        title: '🔴 Project Down!',
        message: `${project.name} is not responding. Check your deployment.`,
        project: project._id,
        meta: { liveUrl: project.liveUrl },
      });

      io.to(project.owner.toString()).emit('notification', notification);
    }
  }

  // Update project status
  await Project.findByIdAndUpdate(project._id, {
    status,
    lastChecked: new Date(),
    responseTime,
  });

  // If came back up, send notification
  if (status === 'active' && project.status === 'down' && io) {
    const notification = await Notification.create({
      recipient: project.owner,
      type: 'project_up',
      title: '🟢 Project Back Online!',
      message: `${project.name} is back online! Response time: ${responseTime}ms`,
      project: project._id,
    });
    io.to(project.owner.toString()).emit('notification', notification);
  }

  return { status, responseTime, lastChecked: new Date() };
};

// @desc    Save/update a project's visitor-identity-encryption public key
// @route   PATCH /api/projects/:id/public-key
// @access  Private (owner only)
// The public key is generated in the developer's OWN browser (Web Crypto API)
// and is safe to store as plaintext. The matching private key never leaves the
// developer's device and is never sent to this server — see PrivacyKeysModal.jsx.
const setPublicKey = async (req, res, next) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ success: false, message: 'publicKey is required.' });
    }

    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    project.visitorEncryptionPublicKey = publicKey;
    await project.save();

    res.status(200).json({ success: true, message: 'Encryption key saved.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addProject,
  getMyProjects,
  getProject,
  updateProject,
  deleteProject,
  pingProject,
  getProjectAnalytics,
  checkProjectStatus,
  setPublicKey,
};