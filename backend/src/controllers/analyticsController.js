const { sendViewNotificationEmail } = require("../utils/emailService");
const View = require('../models/View');
const Project = require('../models/Project');
const Notification = require('../models/Notification');

const parseDevice = (ua = '') => {
  if (/mobile/i.test(ua)) return 'Mobile';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  if (ua) return 'Desktop';
  return 'Unknown';
};

const parseBrowser = (ua = '') => {
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/edge/i.test(ua)) return 'Edge';
  if (/msie|trident/i.test(ua)) return 'IE';
  return 'Unknown';
};

const trackView = async (req, res) => {
  try {
    const { trackingId, referrer, utmSource, utmMedium, visitorName, visitorEmail, visitorId } = req.body;

    if (!trackingId) {
      return res.status(400).json({ success: false, message: 'trackingId is required.' });
    }

    const project = await Project.findOne({ trackingId });
    if (!project || !project.trackingEnabled) {
      return res.status(404).json({ success: false, message: 'Project not found or tracking disabled.' });
    }

    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.headers['cf-connecting-ip'] ||
      req.socket?.remoteAddress ||
      'unknown';

    let country = 'Unknown';
    let city = 'Unknown';
    try {
      const geoip = require('geoip-lite');
      const geo = geoip.lookup(ip);
      if (geo) {
        country = geo.country || 'Unknown';
        city = geo.city || 'Unknown';
      }
    } catch (e) {}

    const ua = req.headers['user-agent'] || '';
    const device = parseDevice(ua);
    const browser = parseBrowser(ua);

    const recruiterSources = ['linkedin', 'naukri', 'indeed', 'resume', 'cv', 'recruiter'];
    const isRecruiter =
      recruiterSources.some((s) => (utmSource || '').toLowerCase().includes(s)) ||
      recruiterSources.some((s) => (referrer || '').toLowerCase().includes(s));

    const recentDuplicate = await View.findOne({
      project: project._id,
      ipAddress: ip,
      viewedAt: { $gte: new Date(Date.now() - 5000) },
    });
    if (recentDuplicate) {
      return res.status(200).json({ success: true, message: 'View already tracked recently.' });
    }

    const previousVisit = await View.findOne({ project: project._id, ipAddress: ip });
    const isUniqueVisitor = !previousVisit;

    const finalName  = visitorName  || '';
    const finalEmail = visitorEmail || '';

    await View.create({
      project:      project._id,
      projectOwner: project.owner,
      ipAddress:    ip,
      country,
      city,
      device,
      browser,
      referrer:     referrer  || '',
      utmSource:    utmSource || '',
      utmMedium:    utmMedium || '',
      isRecruiter,
      isUniqueVisitor,
      visitorName:  finalName,
      visitorEmail: finalEmail,
    });

    await Project.findByIdAndUpdate(project._id, {
      $inc: {
        totalViews: 1,
        ...(isUniqueVisitor && { uniqueVisitors: 1 }),
      },
    });

    const io = req.app.get('io');
    if (io) {
      const notifData = {
        type: isRecruiter ? 'recruiter_visit' : 'project_view',
        title: isRecruiter
          ? `👔 Recruiter viewing ${project.name}!`
          : finalName
            ? `👁️ ${finalName} viewed ${project.name}`
            : `👁️ Someone viewed ${project.name}`,
        message: isRecruiter
          ? `A recruiter from ${country} (via ${utmSource || referrer || 'direct'}) is viewing your project!`
          : finalName
            ? `${finalName} (${finalEmail || 'no email'}) viewed from ${country} on ${device}`
            : `New view from ${city !== 'Unknown' ? city + ', ' : ''}${country} on ${device}`,
        project: project._id,
        meta: { country, city, device, browser, isRecruiter, utmSource, referrer, visitorName: finalName, visitorEmail: finalEmail },
      };

      const notification = await Notification.create({
        recipient: project.owner,
        ...notifData,
      });

      io.to(project.owner.toString()).emit('notification', notification);

      try {
        const User = require('../models/User');
        const owner = await User.findById(project.owner);
        if (owner && owner.email) {
          const emailPrefs = owner.emailNotifications || {};
          const shouldEmail = emailPrefs.onEveryView || (isRecruiter && emailPrefs.onRecruiterOnly);
          if (shouldEmail) {
            await sendViewNotificationEmail({
              toEmail:      owner.email,
              ownerName:    owner.name,
              projectName:  project.name,
              liveUrl:      project.liveUrl,
              country, city, device,
              visitorName:  finalName,
              visitorEmail: finalEmail,
              isRecruiter,
              utmSource: utmSource || '',
            });
          }
        }
      } catch (emailErr) {
        console.error('Email notification error:', emailErr.message);
      }
    }

    res.header('Access-Control-Allow-Origin', '*');
    res.status(200).json({ success: true, message: 'View tracked.' });
  } catch (error) {
    console.error('Track view error:', error.message);
    res.status(500).json({ success: false, message: 'Tracking failed.' });
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const projects = await Project.find({ owner: userId });

    const totalProjects       = projects.length;
    const activeProjects      = projects.filter((p) => p.status === 'active').length;
    const downProjects        = projects.filter((p) => p.status === 'down').length;
    const totalViews          = projects.reduce((sum, p) => sum + (p.totalViews || 0), 0);
    const totalUniqueVisitors = projects.reduce((sum, p) => sum + (p.uniqueVisitors || 0), 0);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const viewsToday = await View.countDocuments({
      projectOwner: userId,
      viewedAt: { $gte: todayStart },
    });

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const viewsThisWeek = await View.countDocuments({
      projectOwner: userId,
      viewedAt: { $gte: weekStart },
    });

    const recruiterVisits = await View.countDocuments({
      projectOwner: userId,
      isRecruiter: true,
    });

    const unreadNotifications = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });

    const topProjects = [...projects]
      .sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0))
      .slice(0, 5)
      .map((p, idx) => ({
        rank: idx + 1,
        _id: p._id,
        name: p.name,
        platform: p.platform,
        status: p.status,
        totalViews: p.totalViews || 0,
        liveUrl: p.liveUrl,
      }));

    const dailyViews = await View.aggregate([
      { $match: { projectOwner: userId, viewedAt: { $gte: weekStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$viewedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const deviceStats = await View.aggregate([
      { $match: { projectOwner: userId } },
      { $group: { _id: '$device', count: { $sum: 1 } } },
    ]);

    const countryStats = await View.aggregate([
      { $match: { projectOwner: userId } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalProjects,
        activeProjects,
        downProjects,
        totalViews,
        totalUniqueVisitors,
        viewsToday,
        viewsThisWeek,
        recruiterVisits,
        unreadNotifications,
      },
      topProjects,
      dailyViews,
      deviceStats,
      countryStats,
    });
  } catch (error) {
    next(error);
  }
};

const getAllViews = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const total = await View.countDocuments({ projectOwner: req.user._id });
    const views = await View.find({ projectOwner: req.user._id })
      .populate('project', 'name platform liveUrl')
      .sort({ viewedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      views,
    });
  } catch (error) {
    next(error);
  }
};

const getProjectRankings = async (req, res, next) => {
  try {
    const projects = await Project.find({ owner: req.user._id }).sort({ totalViews: -1 });
    const rankings = projects.map((p, idx) => ({
      rank: idx + 1,
      _id: p._id,
      name: p.name,
      platform: p.platform,
      status: p.status,
      totalViews: p.totalViews || 0,
      liveUrl: p.liveUrl,
      lastChecked: p.lastChecked,
    }));
    res.status(200).json({ success: true, rankings });
  } catch (error) {
    next(error);
  }
};

module.exports = { trackView, getDashboardStats, getAllViews, getProjectRankings };