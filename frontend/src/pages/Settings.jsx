import { useState } from 'react';
import { User, Lock, Code, Save } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Settings.css';


// ── Email Notifications Component ─────────────────────────

const EmailNotifications = ({ user, updateUser }) => {
  const [prefs, setPrefs] = useState({
    onEveryView:     user?.emailNotifications?.onEveryView     ?? false,
    onRecruiterOnly: user?.emailNotifications?.onRecruiterOnly ?? true,
    onProjectDown:   user?.emailNotifications?.onProjectDown   ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleToggle = (key) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/auth/email-notifications', prefs);
      updateUser({ ...user, emailNotifications: data.emailNotifications });
      toast.success('Email preferences saved!');
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="card settings-card">
      <div className="settings-card-header">
        <span style={{ fontSize: 16 }}>📧</span>
        <h3>Email Notifications</h3>
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
        Get email alerts on <strong>{user?.email}</strong> when someone views your project.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1rem' }}>
        {[
          { key: 'onEveryView',     label: 'Email on every view',       desc: 'Get an email every time anyone views your project' },
          { key: 'onRecruiterOnly', label: 'Email on recruiter visits',  desc: 'Only when someone visits via ?ref=linkedin or similar' },
          { key: 'onProjectDown',   label: 'Email when project goes down', desc: 'Alert when your project stops responding' },
        ].map(({ key, label, desc }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid transparent', transition: 'border-color 0.15s' }}>
            <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
              <input
                type="checkbox"
                id={key}
                checked={prefs[key]}
                onChange={() => handleToggle(key)}
                style={{ accentColor: 'var(--accent)', width: 16, height: 16, cursor: 'pointer' }}
              />
            </div>
            <label htmlFor={key} style={{ cursor: 'pointer', flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</div>
            </label>
            {prefs[key] && <span style={{ fontSize: '0.7rem', background: 'var(--accent-dim)', color: 'var(--accent)', padding: '0.15rem 0.5rem', borderRadius: 20, flexShrink: 0, alignSelf: 'center' }}>ON</span>}
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--yellow-dim)', border: '1px solid var(--yellow)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        ⚙️ <strong>Setup required:</strong> Add <code style={{ color: 'var(--yellow)' }}>EMAIL_USER</code> and <code style={{ color: 'var(--yellow)' }}>EMAIL_PASS</code> to your backend <code>.env</code> file.
        Use a <a href="https://support.google.com/accounts/answer/185833" target="_blank" style={{ color: 'var(--yellow)' }}>Gmail App Password</a>, not your real Gmail password.
      </div>

      <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
        {saving ? <span className="spinner" /> : '💾'} Save Preferences
      </button>
    </div>
  );
};

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', avatar: user?.avatar || '' });
  const [passForm, setPassForm]       = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass]       = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.name) return toast.error('Name is required.');
    setSavingProfile(true);
    try {
      const { data } = await api.put('/auth/update-profile', profileForm);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    } finally { setSavingProfile(false); }
  };

  const handlePassSave = async (e) => {
    e.preventDefault();
    if (!passForm.currentPassword || !passForm.newPassword) return toast.error('Fill all fields.');
    if (passForm.newPassword.length < 6) return toast.error('New password must be 6+ characters.');
    if (passForm.newPassword !== passForm.confirm) return toast.error('Passwords do not match.');
    setSavingPass(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success('Password changed!');
      setPassForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed.');
    } finally { setSavingPass(false); }
  };

  const backendUrl = import.meta?.env?.VITE_SOCKET_URL || 'http://localhost:5000';

  const trackingSnippet = `<!-- DeployWatch Tracking Script -->
<!-- Paste this just before </body> in your project's main HTML file -->
<!-- Replace YOUR_TRACKING_ID with the Tracking ID from your project card -->
<script src="${backendUrl}/tracking.js"
        data-tracking-id="YOUR_TRACKING_ID_HERE"
        async>
</script>

<!-- Optional: Track logged-in users (call after login success) -->
<!-- <script>
  window.deployWatchTrackView({
    visitorName:  currentUser.name,
    visitorEmail: currentUser.email
  });
</script> -->`;

  const [copied, setCopied] = useState(false);
  const copySnippet = () => {
    navigator.clipboard.writeText(trackingSnippet);
    setCopied(true);
    toast.success('Snippet copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fade-in settings-page">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage your account and integration</p>

      <div className="settings-grid">
        {/* Profile */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <User size={16} style={{ color: 'var(--accent)' }} />
            <h3>Profile</h3>
          </div>
          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label className="label">Full Name</label>
              <input className="input" value={profileForm.name}
                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Avatar URL</label>
              <input className="input" placeholder="https://..." value={profileForm.avatar}
                onChange={e => setProfileForm(f => ({ ...f, avatar: e.target.value }))} />
              {profileForm.avatar && (
                <img src={profileForm.avatar} alt="avatar preview"
                  style={{ width: 48, height: 48, borderRadius: '50%', marginTop: 8, objectFit: 'cover', border: '2px solid var(--accent)' }} />
              )}
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input className="input" value={user?.email || ''} disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingProfile}>
              {savingProfile ? <span className="spinner" /> : <Save size={13} />} Save Profile
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="card settings-card">
          <div className="settings-card-header">
            <Lock size={16} style={{ color: 'var(--yellow)' }} />
            <h3>Change Password</h3>
          </div>
          <form onSubmit={handlePassSave}>
            <div className="form-group">
              <label className="label">Current Password</label>
              <input type="password" className="input" value={passForm.currentPassword}
                onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">New Password</label>
              <input type="password" className="input" placeholder="Min 6 characters" value={passForm.newPassword}
                onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" value={passForm.confirm}
                onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={savingPass}>
              {savingPass ? <span className="spinner" /> : <Lock size={13} />} Change Password
            </button>
          </form>
        </div>

        {/* Email Notifications */}
        <EmailNotifications user={user} updateUser={updateUser} />

        {/* Setup Guide pointer */}
        <div className="card settings-card settings-card--full">
          <div className="settings-card-header">
            <span style={{ fontSize: 16 }}>📖</span>
            <h3>How to Add Tracking to Your Projects</h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            The tracking script and setup instructions are available directly on each project card.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              ['1', '📁 Go to', 'Projects page from the sidebar'],
              ['2', '🔍 Find', 'your project card'],
              ['3', '📖 Click', '"Setup" button on the project card'],
              ['4', '📋 Follow', 'the step-by-step guide with ready-to-copy code'],
            ].map(([num, action, desc]) => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.85rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-dim)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{num}</span>
                <span><strong style={{ color: 'var(--accent)' }}>{action}</strong> <span style={{ color: 'var(--text-secondary)' }}>{desc}</span></span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.85rem' }}>
            💡 The Setup Guide includes the tracking script, login tracking code, SPA instructions, and database connection guide — all with your project's Tracking ID already filled in.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Settings;