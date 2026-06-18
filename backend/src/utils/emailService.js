const nodemailer = require('nodemailer');

// Create transporter (Gmail)
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
    },
  });
};

// Send project view notification email
const sendViewNotificationEmail = async ({ toEmail, ownerName, projectName, liveUrl, country, city, device, visitorName, visitorEmail, isRecruiter, utmSource }) => {
  try {
    const transporter = createTransporter();
    if (!transporter) return; // Email not configured, skip silently

    const recruiterBadge = isRecruiter
      ? `<span style="background:#bc8cff22;color:#bc8cff;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">👔 RECRUITER VISIT</span>`
      : `<span style="background:#00d4ff18;color:#00d4ff;padding:3px 10px;border-radius:20px;font-size:12px;">👁️ New View</span>`;

    const visitorInfo = visitorName
      ? `<tr><td style="color:#8b949e;padding:6px 0;font-size:13px;">Visitor</td><td style="color:#e6edf3;font-weight:600;font-size:13px;">${visitorName}${visitorEmail ? ` (${visitorEmail})` : ''}</td></tr>`
      : `<tr><td style="color:#8b949e;padding:6px 0;font-size:13px;">Visitor</td><td style="color:#8b949e;font-size:13px;">Anonymous</td></tr>`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">
  <div style="max-width:500px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-flex;align-items:center;gap:8px;color:#00d4ff;font-size:18px;font-weight:700;">
        ⚡ DeployWatch
      </div>
    </div>

    <!-- Card -->
    <div style="background:#161b22;border:1px solid #30363d;border-radius:14px;overflow:hidden;">

      <!-- Top accent -->
      <div style="height:3px;background:linear-gradient(90deg,#00d4ff,#bc8cff);"></div>

      <div style="padding:24px;">
        <!-- Badge -->
        <div style="margin-bottom:16px;">${recruiterBadge}</div>

        <!-- Title -->
        <h2 style="color:#e6edf3;font-size:18px;font-weight:700;margin:0 0 6px;">
          ${isRecruiter ? '🎉 A recruiter just viewed your project!' : `Someone viewed ${projectName}`}
        </h2>
        <p style="color:#8b949e;font-size:13px;margin:0 0 20px;">
          Hi ${ownerName}, here are the details:
        </p>

        <!-- Details table -->
        <div style="background:#1c2128;border-radius:10px;padding:16px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#8b949e;padding:6px 0;font-size:13px;width:120px;">Project</td>
              <td style="color:#00d4ff;font-weight:600;font-size:13px;"><a href="${liveUrl}" style="color:#00d4ff;text-decoration:none;">${projectName}</a></td></tr>
            ${visitorInfo}
            <tr><td style="color:#8b949e;padding:6px 0;font-size:13px;">Location</td>
              <td style="color:#e6edf3;font-size:13px;">${city !== 'Unknown' ? city + ', ' : ''}${country}</td></tr>
            <tr><td style="color:#8b949e;padding:6px 0;font-size:13px;">Device</td>
              <td style="color:#e6edf3;font-size:13px;">${device}</td></tr>
            ${utmSource ? `<tr><td style="color:#8b949e;padding:6px 0;font-size:13px;">Source</td>
              <td style="color:#e6edf3;font-size:13px;">${utmSource}</td></tr>` : ''}
            <tr><td style="color:#8b949e;padding:6px 0;font-size:13px;">Time</td>
              <td style="color:#e6edf3;font-size:13px;">${new Date().toLocaleString()}</td></tr>
          </table>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-top:20px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/analytics"
            style="display:inline-block;background:#00d4ff;color:#0d1117;padding:10px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">
            View Full Analytics →
          </a>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#484f58;font-size:12px;margin-top:20px;">
      You're receiving this because you enabled email notifications on DeployWatch.<br>
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/settings" style="color:#484f58;">Manage notification settings</a>
    </p>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `DeployWatch <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: isRecruiter
        ? `👔 Recruiter viewing ${projectName} — DeployWatch`
        : `👁️ New view on ${projectName} — DeployWatch`,
      html,
    });

    console.log(`📧 Email sent to ${toEmail} for view on ${projectName}`);
  } catch (err) {
    // Never crash the app if email fails
    console.error('📧 Email send failed:', err.message);
  }
};

module.exports = { sendViewNotificationEmail };
