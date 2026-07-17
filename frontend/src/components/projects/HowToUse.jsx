import { useState } from 'react';
import { getBackendUrl } from '../../utils/backendUrl';
import './HowToUse.css';

const BACKEND_URL = getBackendUrl();

const getScript = (language, trackingId, backendUrl) => {
  const tid = trackingId || 'dw_YOUR_TRACKING_ID';
  const trackScriptUrl = `${backendUrl}/tracking.js`;
  const url = `${backendUrl}/api/analytics/track`;

  const scripts = {
    react: {
      title: 'React / Next.js',
      where: 'If your project uses Vite (has a vite.config.js): paste into the index.html in your PROJECT ROOT — NOT public/index.html, Vite does not use that as a template. If it uses Create React App: paste into public/index.html. For Next.js: pages/_document.js. The tracker auto-detects client-side routing for React Router and Next.js.',
      code:
`<!-- DeployWatch Tracking -->
<script src="${trackScriptUrl}" data-tracking-id="${tid}" async></script>`,
    },
    vue: {
      title: 'Vue / Nuxt',
      where: 'If your project uses Vite (has a vite.config.js) or Nuxt: paste into the index.html in your PROJECT ROOT — NOT public/index.html, Vite does not use that as a template. If it uses Vue CLI: paste into public/index.html. The tracker auto-detects client-side routing for Vue Router and Nuxt.',
      code:
`<!-- DeployWatch Tracking -->
<script src="${trackScriptUrl}" data-tracking-id="${tid}" async></script>`,
    },
    angular: {
      title: 'Angular',
      where: 'Add this script tag to your app shell HTML (index.html). The tracker now auto-detects client-side routing for Angular apps.',
      code:
`<!-- DeployWatch Tracking -->
<script src="${trackScriptUrl}" data-tracking-id="${tid}" async></script>`,
    },
    html: {
      title: 'HTML / Vanilla JS',
      where: 'Paste this in your index.html just before </body>:',
      code:
`<!-- DeployWatch Tracking -->
<script src="${trackScriptUrl}" data-tracking-id="${tid}" async></script>`,
    },
    php: {
      title: 'PHP',
      where: 'Add this script tag to your HTML template or header file served by PHP:',
      code:
`<!-- DeployWatch Tracking -->
<script src="${trackScriptUrl}" data-tracking-id="${tid}" async></script>`,
    },
    python: {
      title: 'Python / Django / Flask',
      where: 'Add this script tag to your base HTML template (base.html or layout):',
      code:
`<!-- DeployWatch Tracking -->
<script src="${trackScriptUrl}" data-tracking-id="${tid}" async></script>`,
    },
    nodejs: {
      title: 'Node.js / Express',
      where: 'Add this script tag to your server-rendered HTML template or static index file:',
      code:
`<!-- DeployWatch Tracking -->
<script src="${trackScriptUrl}" data-tracking-id="${tid}" async></script>`,
    },
    other: {
      title: 'Other',
      where: 'Add this script tag to any HTML page or template:',
      code:
`<!-- DeployWatch Tracking -->
<script src="${trackScriptUrl}" data-tracking-id="${tid}" async></script>`,
    },
  };

  return scripts[language] || scripts.html;
};

const HowToUse = ({ project }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(null);

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const lang = project?.language || 'react';
  const script = getScript(lang, project?.trackingId, BACKEND_URL);

  const loginSnippet = lang === 'react'
    ? `// Call this after login/register success:
const trackLogin = (user) => {
  fetch('${BACKEND_URL}/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      trackingId:   '${project?.trackingId || 'dw_YOUR_ID'}',
      utmSource:    'login',
      visitorName:  user.name  || '',
      visitorEmail: user.email || '',
    })
  }).catch(() => {});
};`
    : `// After login, send:
fetch('${BACKEND_URL}/api/analytics/track', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    trackingId: '${project?.trackingId || 'dw_YOUR_ID'}',
    utmSource: 'login',
    visitorName: user.name,
    visitorEmail: user.email
  })
});`;

  return (
    <div className="htu-wrapper">
      <button className="htu-toggle" onClick={() => setOpen(o => !o)}>
        <span>📖 How to use DeployWatch with this project ({script.title})</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="htu-body">

          {/* Step 1 — Tracking */}
          <div className="htu-step">
            <span className="htu-num">Step 1 — Track Views</span>
            <h4 className="htu-title">{script.where}</h4>
            <div className="htu-code-wrap">
              <pre className="htu-code mono">{script.code}</pre>
              <button className="btn btn-secondary btn-sm htu-copy-btn" onClick={() => copyText(script.code, 'script')}>
                {copied === 'script' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p className="htu-tip">
              💡 <strong>Recruiter tip:</strong> On your resume use &nbsp;
              <code style={{ color: 'var(--yellow)', fontSize: '0.72rem' }}>
                {project?.liveUrl}?ref=linkedin
              </code>
              &nbsp;— you'll get a special "Recruiter Visit" notification!
            </p>
          </div>

          {/* Step 2 — Ping */}
          <div className="htu-step">
            <span className="htu-num">Step 2 — Check Status</span>
            <h4 className="htu-title">Ping your project</h4>
            <p className="htu-desc">
              Click the <strong>Ping</strong> button on this project card to instantly check if your deployment is live or down.
              DeployWatch also auto-checks every 10 minutes and sends you a notification if it goes down.
            </p>
          </div>

          {/* Step 3 — Login tracking */}
          <div className="htu-step">
            <span className="htu-num">Step 3 (Optional) — Track Logged-in Users</span>
            <h4 className="htu-title">See visitor name & email in Analytics</h4>
            <p className="htu-desc">
              If your project has login, call this after a user logs in — their name and email will appear in your Analytics table.
            </p>
            <div className="htu-code-wrap">
              <pre className="htu-code mono">{loginSnippet}</pre>
              <button className="btn btn-secondary btn-sm htu-copy-btn" onClick={() => copyText(loginSnippet, 'login')}>
                {copied === 'login' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Step 4 — Database */}
          <div className="htu-step">
            <span className="htu-num">Step 4 (Optional) — Manage Your Project's Users</span>
            <h4 className="htu-title">Connect your database</h4>
            <p className="htu-desc">
              Click <strong>🔒 Creds</strong> on this project card → select your database type → add connection details → click <strong>Users</strong> to view, edit, block, or delete your users.
            </p>
            <div className="htu-privacy-box">
              <div><span className="htu-green">✅ We see:</span> project names, view counts, status</div>
              <div><span className="htu-red">❌ We never see:</span> DB credentials, API tokens, user passwords</div>
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ✅ Supported databases: <strong>MongoDB, MySQL, PostgreSQL, Firebase, Supabase, SQLite</strong>
              </div>
            </div>

            {/* Developer Note */}
            <div style={{ marginTop: '0.75rem', background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)', padding: '0.75rem 0.9rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.4rem' }}>
                📝 Developer Note
              </div>
              <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>Supported Databases for User Management:</strong><br />
                MongoDB · MySQL · PostgreSQL · Firebase · Supabase · SQLite<br /><br />
                <strong>Tracking Script works with ANY language or framework:</strong><br />
                React · Vue · Angular · Next.js · Nuxt · HTML · PHP · Python · Django · Flask · Node.js · Express · Laravel · Ruby on Rails · ASP.NET · Go · and more.<br /><br />
                The tracking script is just a simple <strong>HTTP POST request</strong> — any language that can make HTTP requests can use it.
                If your language is not listed in the dropdown, select <strong>"Other"</strong> and you'll get the raw API format to implement yourself.<br /><br />
                <strong>Views behavior:</strong><br />
                • Every call to `/api/analytics/track` adds one total view.<br />
                • If this IP has never visited this project before, it also adds one unique view.<br />
                • <strong>Duplicate protection:</strong> views are deduplicated by IP/session for 30 minutes — not by logged-in account.
                If different users log in from the same device/network within 30 minutes, only the first visit counts. This is the same
                for every project, frontend-only or full-stack.<br /><br />
                <strong>React / SPA note:</strong> for React you must import <code>useEffect</code> from React before using it. If your app uses client-side routing, call the tracking function on initial load and again on route changes to capture views without a full page refresh.
              </div>
            </div> 
          </div>

        </div>
      )}
    </div>
  );
};

export default HowToUse;