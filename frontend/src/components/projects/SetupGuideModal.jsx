import { useState } from 'react';
import { X, Copy, Check, BookOpen, Code, Database, Zap, Users } from 'lucide-react';
import './SetupGuideModal.css';

const BACKEND_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const STEPS = ['Track Views', 'Ping Status', 'Track Logins', 'Manage Users'];

const SetupGuideModal = ({ project, onClose }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState(null);

  const tid = project?.trackingId || 'dw_YOUR_TRACKING_ID';
  const lang = project?.language || 'html';
  const dbType = project?.dbType || 'none';
  const liveUrl = project?.liveUrl || 'https://your-project.com';

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const trackingScript = `<!-- DeployWatch Tracking Script -->
<!-- Paste this just before </body> in your project's main HTML file -->
<script
  src="${BACKEND_URL}/tracking.js"
  data-tracking-id="${tid}"
  async>
</script>`;

  const loginScript = `// Call this after login/register success in your project:
window.deployWatchTrackView({
  visitorName:  user.name,   // logged-in user's name
  visitorEmail: user.email   // logged-in user's email
});`;

  const spaScript = `// For React/Vue/Angular (SPA) — call after route change:
// React Router example:
useEffect(() => {
  window.deployWatchTrackView?.();
}, [location.pathname]);

// Vue Router example:
router.afterEach(() => {
  window.deployWatchTrackView?.();
});`;

  const recruiterScript = `<!-- Add ?ref=linkedin to your resume project links -->
<!-- Example: ${liveUrl}?ref=linkedin -->
<!-- You'll get a special "Recruiter Visit" notification! -->`;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sgm-box">
        {/* Header */}
        <div className="sgm-header">
          <div className="sgm-title-row">
            <BookOpen size={18} style={{ color: 'var(--accent)' }} />
            <div>
              <h2 className="sgm-title">Setup Guide</h2>
              <p className="sgm-subtitle">{project?.name} · {project?.platform}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Step tabs */}
        <div className="sgm-tabs">
          {STEPS.map((s, i) => (
            <button key={i} className={`sgm-tab ${activeStep === i ? 'sgm-tab--active' : ''}`}
              onClick={() => setActiveStep(i)}>
              <span className="sgm-tab-num">{i + 1}</span>
              <span className="sgm-tab-label">{s}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="sgm-body">

          {/* ── Step 1: Track Views ── */}
          {activeStep === 0 && (
            <div className="sgm-step-content">
              <div className="sgm-step-icon"><Zap size={20} /></div>
              <h3 className="sgm-step-title">Add Tracking Script</h3>
              <p className="sgm-step-desc">
                Paste this single line in your project's main HTML file just before <code>&lt;/body&gt;</code>.
                Works with <strong>any language or framework</strong> — HTML, React, Vue, Angular, PHP, Python, Node.js, and more.
              </p>

              <div className="sgm-code-block">
                <div className="sgm-code-label">
                  <Code size={12} /> Copy and paste into your <code>index.html</code>
                </div>
                <pre className="sgm-code mono">{trackingScript}</pre>
                <button className="sgm-copy-btn" onClick={() => copyText(trackingScript, 'main')}>
                  {copied === 'main' ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy Script</>}
                </button>
              </div>

              <div className="sgm-info-box">
                <div className="sgm-info-title">📍 Where exactly to paste:</div>
                <div className="sgm-info-grid">
                  {[
                    ['HTML / PHP',       'index.html or index.php → before </body>'],
                    ['React',            'public/index.html → before </body>'],
                    ['Next.js',          'pages/_document.js → in <body> section'],
                    ['Vue / Nuxt',       'index.html or app.html → before </body>'],
                    ['Angular',          'src/index.html → before </body>'],
                    ['Django / Flask',   'base.html template → before </body>'],
                    ['Laravel',          'resources/views/layouts/app.blade.php → before </body>'],
                    ['Any other',        'Main HTML template file → before </body>'],
                  ].map(([lang, where]) => (
                    <div key={lang} className="sgm-info-row">
                      <span className="sgm-info-lang">{lang}</span>
                      <span className="sgm-info-where">{where}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sgm-tip">
                💡 <strong>Recruiter tip:</strong> Share your project link as
                <code style={{ color: 'var(--yellow)', margin: '0 4px' }}>{liveUrl}?ref=linkedin</code>
                on your resume — you'll get a "Recruiter Visit" notification when someone clicks it!
              </div>

              <div className="sgm-note">
                ⚠️ <strong>Note for SPA apps</strong> (React Router, Vue Router etc.): The script tracks the initial page load automatically.
                See Step 3 to also track internal navigation.
              </div>
            </div>
          )}

          {/* ── Step 2: Ping Status ── */}
          {activeStep === 1 && (
            <div className="sgm-step-content">
              <div className="sgm-step-icon" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}>
                <Zap size={20} />
              </div>
              <h3 className="sgm-step-title">Check Project Status</h3>
              <p className="sgm-step-desc">
                DeployWatch automatically checks if your project is live or down every <strong>10 minutes</strong>.
                You can also manually ping anytime.
              </p>

              <div className="sgm-steps-list">
                <div className="sgm-list-item">
                  <span className="sgm-list-num">1</span>
                  <div>
                    <strong>Go to Projects page</strong>
                    <p>Find your project card</p>
                  </div>
                </div>
                <div className="sgm-list-item">
                  <span className="sgm-list-num">2</span>
                  <div>
                    <strong>Click "Ping" button</strong>
                    <p>Instantly checks if <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{liveUrl}</a> is responding</p>
                  </div>
                </div>
                <div className="sgm-list-item">
                  <span className="sgm-list-num">3</span>
                  <div>
                    <strong>See the result</strong>
                    <p>Status updates to <span style={{ color: 'var(--green)' }}>● Active</span> or <span style={{ color: 'var(--red)' }}>● Down</span> with response time in ms</p>
                  </div>
                </div>
              </div>

              <div className="sgm-info-box">
                <div className="sgm-info-title">🔔 Automatic Notifications:</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem', lineHeight: 1.6 }}>
                  If your project goes <strong style={{ color: 'var(--red)' }}>down</strong>, you'll automatically get a notification in DeployWatch dashboard.
                  Enable email alerts in <strong>Settings → Email Notifications</strong> to also get an email when your project goes down.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Track Logins ── */}
          {activeStep === 2 && (
            <div className="sgm-step-content">
              <div className="sgm-step-icon" style={{ background: 'var(--purple-dim)', color: 'var(--purple)' }}>
                <Users size={20} />
              </div>
              <h3 className="sgm-step-title">Visitor & Login Tracking</h3>
              <p className="sgm-step-desc">
                <strong>No extra code needed!</strong> The tracking script automatically detects logged-in users from your project.
              </p>

              <div className="sgm-info-box">
                <div className="sgm-info-title">🤖 What the script auto-detects:</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {[
                    ['localStorage / sessionStorage', 'Checks common keys: user, currentUser, userData, authUser, profile, me'],
                    ['JWT Token', 'Decodes your auth token and extracts name & email automatically'],
                    ['Global variables', 'Checks window.user, window.currentUser, window.authUser'],
                    ['Route changes (SPA)', 'Auto-tracks React Router, Vue Router page navigations'],
                  ].map(([title, desc]) => (
                    <div key={title} style={{ display: 'flex', gap: '0.6rem', padding: '0.5rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--green)', flexShrink: 0 }}>✅</span>
                      <div><strong style={{ color: 'var(--text-primary)' }}>{title}</strong><br /><span style={{ color: 'var(--text-muted)' }}>{desc}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sgm-tip">
                💡 <strong>No login system?</strong> No problem! Script will still track anonymous views with country, device, browser and time.
              </div>

              <div className="sgm-note">
                ℹ️ <strong>Optional manual call</strong> — if auto-detect misses something, you can manually call:<br />
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent)' }}>
                  window.deployWatchTrackView({'{'} visitorName: 'John', visitorEmail: 'john@email.com' {'}'})
                </code>
                <div style={{ marginTop: 10, fontSize: '0.80rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  If your app uses different field names, map them like this:
                  <pre className="sgm-code mono" style={{ marginTop: 6 }}>
{`const user = {
  username: 'john_doe',
  emailid: 'john@example.com'
};

window.deployWatchTrackView({
  visitorName: user.username,
  visitorEmail: user.emailid
});`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Manage Users ── */}
          {activeStep === 3 && (
            <div className="sgm-step-content">
              <div className="sgm-step-icon" style={{ background: 'var(--yellow-dim)', color: 'var(--yellow)' }}>
                <Database size={20} />
              </div>
              <h3 className="sgm-step-title">Manage Your Project's Users</h3>
              <p className="sgm-step-desc">
                Connect your project's database to view, edit, block, or delete your users — directly from DeployWatch.
              </p>

              <div className="sgm-steps-list">
                <div className="sgm-list-item">
                  <span className="sgm-list-num">1</span>
                  <div>
                    <strong>Click "🔒 Creds" on your project card</strong>
                    <p>A modal will open to add your database credentials</p>
                  </div>
                </div>
                <div className="sgm-list-item">
                  <span className="sgm-list-num">2</span>
                  <div>
                    <strong>Select your database type</strong>
                    <p>MongoDB · MySQL · PostgreSQL · Firebase · Supabase · SQLite</p>
                  </div>
                </div>
                <div className="sgm-list-item">
                  <span className="sgm-list-num">3</span>
                  <div>
                    <strong>Enter connection details</strong>
                    <p>Your credentials are <strong style={{ color: 'var(--green)' }}>encrypted in your browser</strong> — DeployWatch servers never see them</p>
                  </div>
                </div>
                <div className="sgm-list-item">
                  <span className="sgm-list-num">4</span>
                  <div>
                    <strong>Click "Users" button</strong>
                    <p>See all your project users — view, edit, block, or delete</p>
                  </div>
                </div>
              </div>

              <div className="sgm-privacy-box">
                <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                  🔒 Privacy Guarantee
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--green)' }}>✅ DeployWatch can see:</strong> project names, view counts, status<br />
                  <strong style={{ color: 'var(--red)' }}>❌ DeployWatch cannot see:</strong> your DB credentials, API tokens, your users' passwords
                </div>
              </div>

              {dbType !== 'none' && (
                <div className="sgm-tip">
                  ✅ Your project is configured with <strong>{dbType}</strong> database.
                  Click the <strong>🔒 Creds</strong> button on the project card to update credentials.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer navigation */}
        <div className="sgm-footer">
          <button className="btn btn-secondary btn-sm" disabled={activeStep === 0}
            onClick={() => setActiveStep(s => s - 1)}>← Previous</button>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Step {activeStep + 1} of {STEPS.length}
          </span>
          {activeStep < STEPS.length - 1
            ? <button className="btn btn-primary btn-sm" onClick={() => setActiveStep(s => s + 1)}>Next →</button>
            : <button className="btn btn-primary btn-sm" onClick={onClose}>Done ✓</button>
          }
        </div>
      </div>
    </div>
  );
};

export default SetupGuideModal;