const User = require('../models/User');
const Project = require('../models/Project');
const View = require('../models/View');

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const query = search
      ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
      : {};

    const total = await User.countDocuments(query);
    // Password is excluded by default via schema (select: false)
    const users = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user details (admin) - password hidden
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id); // password auto-hidden (select:false)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const projects = await Project.find({ owner: user._id }).select('-__v');
    const totalViews = await View.countDocuments({ projectOwner: user._id });

    res.status(200).json({
      success: true,
      user,
      projects,
      totalViews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role or status (admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res, next) => {
  try {
    const { role, isActive, name } = req.body;

    // Prevent admin from editing themselves via this route
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Use profile settings to edit your own account.' });
    }

    const updateFields = {};
    if (role) updateFields.role = role;
    if (typeof isActive === 'boolean') updateFields.isActive = isActive;
    if (name) updateFields.name = name;

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({ success: true, message: 'User updated.', user });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Delete all user data
    const projects = await Project.find({ owner: user._id });
    const projectIds = projects.map((p) => p._id);
    await Project.deleteMany({ owner: user._id });
    await View.deleteMany({ projectOwner: user._id });
    await require('../models/Notification').deleteMany({ recipient: user._id });
    await require('../models/ErrorLog').deleteMany({ owner: user._id });
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'User and all associated data deleted.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform-wide stats (admin)
// @route   GET /api/admin/stats
// @access  Private/Admin
const getPlatformStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalProjects = await Project.countDocuments();
    const totalViews = await View.countDocuments();

    const newUsersThisWeek = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    const platformBreakdown = await Project.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalProjects,
        totalViews,
        newUsersThisWeek,
        platformBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser, getPlatformStats };
