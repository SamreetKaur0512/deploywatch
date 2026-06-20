const { sendViewNotificationEmail } = require("../utils/emailService");
const View = require('../models/View');
const Project = require('../models/Project');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

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

// Helper: fetch user from developer's external DB using visitorId
const fetchVisitorFromDB = async (project, visitorId) => {
  try {
    if (!project.hasMongoUri && !project.hasDbCredentials) return null;
    if (!visitorId) return null;

    const { decrypt } = require('../utils/cryptoHelper');
    const ProjectModel = require('../models/Project');

    const fullProject = await ProjectModel.findById(project._id)
      .select('+encryptedMongoUri +encryptedDbUri');

    let uri = '';
    if (fullProject.encryptedMongoUri) uri = await decrypt(fullProject.encryptedMongoUri);
    else if (fullProject.encryptedDbUri) uri = await decrypt(fullProject.encryptedDbUri);
    if (!uri) return null;

    const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 });
    const schema = new mongoose.Schema({}, { strict: false });
    const collectionName = project.userCollection || 'users';

    let UserModel;
    try { UserModel = conn.model(collectionName); }
    catch { UserModel = conn.model(collectionName, schema, collectionName); }

    const user = await UserModel.findById(visitorId)
      .select('-password -passwordHash -passwd -pwd -hash -salt')
      .lean();

    await conn.close();
    if (!user) return null;

    return {
      name:  user.name || user.username || user.displayName || '',
      email: user.email || user.emailAddress || '',
    };
  } catch (e) {
    return null;
  }
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

    // Get real visitor IP
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.headers['cf-connecting-ip'] ||
      req.socket?.remoteAddress ||
      'unknown';

    // Geo lookup
    let country = 'Unknown';
    let city    = 'Unknown';
    try {
      const geoip = require('geoip-lite');
      const geo   = geoip.lookup(ip);
      if (geo) {
        country = geo.country || 'Unknown';
        city    = geo.city    || 'Unknown';
      }
    } catch (e) {}

    const ua      = req.headers['user-agent'] || '';
    const device  = parseDevice(ua);
    const browser = parseBrowser(ua);

    const recruiterSources = ['linkedin', 'naukri', 'indeed', 'resume', 'cv', 'recruiter'];
    const isRecruiter =
      recruiterSources.some((s) => (utmSource || '').toLowerCase().includes(s)) ||
      recruiterSources.some((s) => (referrer  || '').toLowerCase().includes(s));

    // Deduplicate — same IP within 5 seconds
    const recentDuplicate = await View.findOne({
      project: project._id,
      ipAddress: ip,
      viewedAt: { $gte: new Date(Date.now() - 5000) },
    });
    if (recentDuplicate) {
      return res.status(200).json({ success: true, message: 'View already tracked recently.' });
    }

    // Unique visitor check
    const previousVisit  = await View.findOne({ project: project._id, ipAddress: ip });
    const isUniqueVisitor = !previousVisit;

    // Try to get visitor name/email
    // 1. Use what script sent directly
    let finalName  = visitorName  || '';
    let finalEmail = visitorEmail || '';

    // 2. If only userId came (JWT had no name/email), fetch from developer's DB
    if ((!finalName || !finalEmail) && visitorId && project.hasMongoUri) {
      const fetched = await fetchVisitorFromDB(project, visitorId);
      if (fetched) {
        finalName  = finalName  || fetched.name;
        finalEmail = finalEmail || fetched.email;
      }
    }

    // Create view
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

    // Update counters
    await Project.findByIdAndUpdate(project._id, {
      $inc: {
        totalViews: 1,
        ...(isUniqueVisitor && { uniqueVisitors: 1 }),
      },
    });

    // Real-time notification
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