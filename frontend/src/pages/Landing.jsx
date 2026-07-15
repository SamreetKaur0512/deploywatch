import { Link } from 'react-router-dom';
import { Zap, Activity, Bell, BarChart2, Shield, Globe, ArrowRight, CheckCircle } from 'lucide-react';
import './Landing.css';

const features = [
  { icon: Activity,  title: 'Live Status Monitoring',   desc: 'Auto-ping your deployments every 10 minutes. Get instant alerts when something goes down.' },
  { icon: BarChart2, title: 'Analytics & Rankings',     desc: 'Track who views your projects, from which country, device, and source. Rank projects by popularity.' },
  { icon: Bell,      title: 'Real-Time Notifications',  desc: 'Socket.io powered live alerts the moment someone opens your project. Never miss a recruiter visit.' },
  { icon: Globe,     title: 'Recruiter Tracker',        desc: 'Add ?ref=linkedin to your resume links. Know exactly when a recruiter is viewing your work.' },
  { icon: Shield,    title: 'Error Log Tracking',       desc: 'Automatic error logging when your deployments fail. Fix issues before anyone notices.' },
  { icon: Zap,       title: 'Multi-Platform Support',   desc: 'Works with Vercel, Render, Netlify, Heroku, GitHub Pages, Railway, and more.' },
];

const steps = [
  { n: '01', title: 'Create Account',      desc: 'Sign up for free. No credit card required.' },
  { n: '02', title: 'Add Your Projects',   desc: 'Paste your live deployment URL and platform.' },
  { n: '03', title: 'Add Tracking Script', desc: 'One script tag in your project to track views.' },
  { n: '04', title: 'Watch the Dashboard', desc: 'Real-time stats, alerts, and rankings — live.' },
];

const Landing = () => (
  <div className="landing">
    {/* Nav */}
    <nav className="landing-nav">
      <div className="landing-nav-inner">
        <div className="landing-logo">
          <Zap size={20} />
          <span>DeployWatch</span>
        </div>
        <div className="landing-nav-links">
          <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started Free</Link>
        </div>
      </div>
    </nav>

    {/* Hero */}
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-grid" />
        <div className="hero-glow" />
      </div>
      <div className="hero-content fade-in">
        <div className="hero-badge">
          <span className="badge badge-cyan">🚀 Free for all developers</span>
        </div>
        <h1 className="hero-title">
          Monitor Every<br />
          <span className="hero-accent">Deployment.</span><br />
          Track Every View.
        </h1>
        <p className="hero-subtitle">
          DeployWatch is the developer dashboard that monitors your live projects,
          tracks who views them, and alerts you in real-time — so you always know
          what's happening with your work.
        </p>
        <div className="hero-cta">
          <Link to="/register" className="btn btn-primary btn-lg">
            Start Monitoring Free <ArrowRight size={16} />
          </Link>
          <Link to="/login" className="btn btn-secondary btn-lg">
            Sign In
          </Link>
        </div>
        <div className="hero-trust">
          {['Free forever', 'No credit card', 'Real-time alerts', 'Multi-platform'].map(t => (
            <span key={t} className="trust-item">
              <CheckCircle size={13} style={{ color: 'var(--green)' }} /> {t}
            </span>
          ))}
        </div>
      </div>

      {/* Mock dashboard preview */}
      <div className="hero-preview fade-in">
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.72rem', background: 'var(--yellow-dim)', color: 'var(--yellow)', border: '1px solid var(--yellow)', borderRadius: '20px', padding: '0.2rem 0.75rem', fontWeight: 600 }}>
            📸 Example Preview — Your real data will look like this
          </span>
        </div>
        <div className="preview-card">
          <div className="preview-header">
            <div style={{ display: 'flex', gap: 5 }}>
              <span className="preview-dot" style={{ background: 'var(--red)' }} />
              <span className="preview-dot" style={{ background: 'var(--yellow)' }} />
              <span className="preview-dot" style={{ background: 'var(--green)' }} />
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>deploywatch.app/dashboard</span>
          </div>
          <div className="preview-body">
            <div className="preview-stats">
              {[['4', 'Projects'], ['1.2k', 'Total Views'], ['3', 'Active'], ['12', 'Alerts']].map(([v, l]) => (
                <div key={l} className="preview-stat">
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>{v}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{l}</span>
                </div>
              ))}
            </div>
            <div className="preview-projects">
              {[
                { name: 'AI-LMS', platform: 'Vercel', status: 'active', views: 342 },
                { name: 'NetBuzz',  platform: 'Render', status: 'active', views: 201 },
                { name: 'Portfolio',platform: 'Netlify',status: 'down',   views: 89  },
              ].map(p => (
                <div key={p.name} className="preview-project-row">
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>{p.name}</span>
                  <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>{p.platform}</span>
                  <span className={`badge ${p.status === 'active' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.6rem' }}>{p.status}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.views}</span>
                </div>
              ))}
            </div>
            <div className="preview-notif">
              <span style={{ fontSize: '0.65rem' }}>👔 Recruiter from India viewing AI-LMS!</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="features-section">
      <div className="section-inner">
        <h2 className="section-title">Everything you need to <span className="hero-accent">stay in control</span></h2>
        <p className="section-sub">Built by a developer, for developers. All the tools to monitor your portfolio projects.</p>
        <div className="features-grid">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="feature-card">
              <div className="feature-icon">
                <Icon size={18} />
              </div>
              <h3 className="feature-title">{title}</h3>
              <p className="feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="steps-section">
      <div className="section-inner">
        <h2 className="section-title">Up and running in <span className="hero-accent">minutes</span></h2>
        <div className="steps-grid">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="step-card">
              <span className="step-num mono">{n}</span>
              <h3 className="step-title">{title}</h3>
              <p className="step-desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* CTA Banner */}
    <section className="cta-section">
      <div className="cta-glow" />
      <div className="section-inner" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <h2 className="section-title">Ready to watch your deployments?</h2>
        <p className="section-sub">Free forever. No credit card. Start in 60 seconds.</p>
        <Link to="/register" className="btn btn-primary btn-lg" style={{ marginTop: '1.5rem' }}>
          Create Free Account <ArrowRight size={16} />
        </Link>
      </div>
    </section>

    {/* Footer */}
    <footer className="landing-footer">
      <div className="landing-logo" style={{ justifyContent: 'center' }}>
        <Zap size={16} />
        <span>DeployWatch</span>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
        Built with MERN stack · Open for all developers
      </p>
    </footer>
  </div>
);

export default Landing;
