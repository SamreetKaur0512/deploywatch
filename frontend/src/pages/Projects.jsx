import { useEffect, useState } from 'react';
import {
  Plus, ExternalLink, GitBranch, Trash2, Edit2,
  RefreshCw, Activity, BarChart2, Copy, Check, Lock, Users, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import ProjectModal from '../components/projects/ProjectModal';
import CredentialsModal from '../components/projects/CredentialsModal';
import HowToUse from '../components/projects/HowToUse';
import SetupGuideModal from '../components/projects/SetupGuideModal';
import './Projects.css';

const PLATFORMS = ['Vercel', 'Render', 'Netlify', 'Heroku', 'GitHub Pages', 'Railway', 'Cyclic', 'Other'];

const STATUS_MAP = {
  active:   { label: 'Active',   cls: 'badge-green'  },
  down:     { label: 'Down',     cls: 'badge-red'    },
  checking: { label: 'Checking', cls: 'badge-yellow' },
  unknown:  { label: 'Unknown',  cls: 'badge-cyan'   },
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [pinging, setPinging]   = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const navigate = useNavigate();
  const [copied, setCopied] = useState(null);
  const [credProject, setCredProject] = useState(null);
  const [setupProject, setSetupProject] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/projects');
      setProjects(data.projects);
    } catch { toast.error('Failed to load projects.'); }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This will remove all analytics data.`)) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(prev => prev.filter(p => p._id !== id));
      toast.success('Project deleted.');
    } catch { toast.error('Delete failed.'); }
  };

  const handlePing = async (id) => {
    setPinging(prev => ({ ...prev, [id]: true }));
    try {
      const { data } = await api.post(`/projects/${id}/ping`);
      setProjects(prev => prev.map(p =>
        p._id === id
          ? { ...p, status: data.status, responseTime: data.responseTime, lastChecked: data.lastChecked }
          : p
      ));
      toast.success(`Status: ${data.status} (${data.responseTime}ms)`);
    } catch { toast.error('Ping failed.'); }
    finally  { setPinging(prev => ({ ...prev, [id]: false })); }
  };

  const copyTrackingId = (trackingId) => {
    navigator.clipboard.writeText(trackingId);
    setCopied(trackingId);
    toast.success('Tracking ID copied!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleModalClose = (saved) => {
    setModalOpen(false);
    setEditProject(null);
    if (saved) fetchProjects();
  };

  const openEdit = (p) => { setEditProject(p); setModalOpen(true); };

  return (
    <div className="fade-in">
      <div className="proj-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-subtitle">Monitor and manage your deployed projects</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchProjects}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Add Project
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="proj-empty">
          <Activity size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No projects yet</h3>
          <p>Add your first deployed project to start monitoring it.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setModalOpen(true)}>
            <Plus size={15} /> Add Your First Project
          </button>
        </div>
      ) : (
        <div className="proj-grid">
          {projects.map((p) => {
            const st = STATUS_MAP[p.status] || STATUS_MAP.unknown;
            return (
              <div key={p._id} className="proj-card">
                <div className="proj-card-top">
                  <div className="proj-card-title-row">
                    <h3 className="proj-name">{p.name}</h3>
                    <span className={`badge ${st.cls}`}>{st.label}</span>
                  </div>
                  {p.description && <p className="proj-desc">{p.description}</p>}
                </div>

                <div className="proj-meta">
                  <span className="badge badge-cyan">{p.platform}</span>
                  {p.responseTime && <span className="proj-resp">{p.responseTime}ms</span>}
                  <span className="proj-views"><BarChart2 size={12} /> {p.totalViews || 0} views</span>
                </div>

                <div className="proj-links">
                  <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="proj-link-btn">
                    <ExternalLink size={12} /> Live
                  </a>
                  {p.githubUrl && (
                    <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="proj-link-btn">
                      <GitBranch size={12} /> Repo
                    </a>
                  )}
                </div>

                <div className="proj-tracking">
                  <span className="tracking-label">Tracking ID</span>
                  <div className="tracking-id-row">
                    <code className="tracking-id mono">{p.trackingId}</code>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '0.15rem 0.4rem' }}
                      onClick={() => copyTrackingId(p.trackingId)} title="Copy">
                      {copied === p.trackingId
                        ? <Check size={12} style={{ color: 'var(--green)' }} />
                        : <Copy size={12} />}
                    </button>
                  </div>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      To capture logged-in users' name & email, call <strong>window.deployWatchTrackView({'{ visitorName, visitorEmail }'})</strong> immediately after your app logs in a user.
                      If your app uses different field names (for example <code>username</code> or <code>emailId</code>), map those to <code>visitorName</code> and <code>visitorEmail</code>.
                      See How to use → Step 3 for examples for React, Vue, Angular, PHP, Python and more.
                    </div>
                </div>

                {p.techStack?.length > 0 && (
                  <div className="proj-stack">
                    {p.techStack.map((t) => <span key={t} className="stack-tag">{t}</span>)}
                  </div>
                )}

                {p.lastChecked && (
                  <p className="proj-last-checked">
                    Last checked: {new Date(p.lastChecked).toLocaleString()}
                  </p>
                )}

                <HowToUse project={p} />

                <hr className="divider" style={{ margin: '0.75rem 0' }} />

                <div className="proj-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => setSetupProject(p)} title="Setup Guide">
                    <BookOpen size={12} /> Setup
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handlePing(p._id)} disabled={pinging[p._id]}>
                    {pinging[p._id] ? <span className="spinner" /> : <RefreshCw size={12} />} Ping
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>
                    <Edit2 size={12} /> Edit
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/projects/${p._id}/users`)} title="Manage Users">
                    <Users size={12} /> Users
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCredProject(p)} title="Credentials">
                    <Lock size={12} style={{ color: p.hasMongoUri ? 'var(--green)' : 'var(--text-muted)' }} /> Creds
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id, p.name)}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {setupProject && (
        <SetupGuideModal
          project={setupProject}
          onClose={() => setSetupProject(null)}
        />
      )}

      {credProject && (
        <CredentialsModal
          project={credProject}
          onClose={() => setCredProject(null)}
          onSaved={fetchProjects}
        />
      )}

      {modalOpen && (
        <ProjectModal project={editProject} platforms={PLATFORMS} onClose={handleModalClose} />
      )}
    </div>
  );
};

export default Projects;
