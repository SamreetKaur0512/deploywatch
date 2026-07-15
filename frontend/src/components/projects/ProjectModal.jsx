import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const TECH_SUGGESTIONS = ['React', 'Node.js', 'MongoDB', 'Express', 'Next.js', 'Vue', 'Angular', 'Python', 'Django', 'PostgreSQL', 'MySQL', 'Redis', 'TypeScript', 'Tailwind'];

const ProjectModal = ({ project, platforms, onClose }) => {
  const isEdit = !!project;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', platform: 'Vercel',
    liveUrl: '', githubUrl: '', techStack: [], trackingEnabled: true,
    language: 'react', dbType: 'none',
  });
  const [techInput, setTechInput] = useState('');

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        description: project.description || '',
        platform: project.platform || 'Vercel',
        liveUrl: project.liveUrl || '',
        githubUrl: project.githubUrl || '',
        techStack: project.techStack || [],
        trackingEnabled: project.trackingEnabled !== false,
        language: project.language || 'react',
        dbType: project.dbType || 'none',
      });
    }
  }, [project]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const addTech = (tech) => {
    const t = tech.trim();
    if (t && !form.techStack.includes(t)) {
      setForm(f => ({ ...f, techStack: [...f.techStack, t] }));
    }
    setTechInput('');
  };

  const removeTech = (t) => setForm(f => ({ ...f, techStack: f.techStack.filter(x => x !== t) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.liveUrl) return toast.error('Name and Live URL are required.');
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/projects/${project._id}`, form);
        toast.success('Project updated!');
      } else {
        await api.post('/projects', form);
        toast.success('Project added!');
      }
      onClose(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="modal-box">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Project' : 'Add New Project'}</h2>
          <button className="modal-close" onClick={() => onClose(false)}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Project Name *</label>
            <input className="input" name="name" placeholder="My Awesome App" value={form.name} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" name="description" placeholder="Brief description..." value={form.description} onChange={handleChange}
              rows={2} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="label">Platform *</label>
              <select className="input" name="platform" value={form.platform} onChange={handleChange}>
                {platforms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="label">Project Language *</label>
              <select className="input" name="language" value={form.language} onChange={handleChange}>
                {[['react','React / Next.js'],['vue','Vue / Nuxt'],['angular','Angular'],['html','HTML / Vanilla JS'],['php','PHP'],['python','Python / Django / Flask'],['nodejs','Node.js / Express'],['other','Other']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Database Type</label>
              <select className="input" name="dbType" value={form.dbType} onChange={handleChange}>
                {[['none','None'],['mongodb','MongoDB'],['mysql','MySQL'],['postgresql','PostgreSQL'],['firebase','Firebase'],['supabase','Supabase'],['sqlite','SQLite']].map(([v,l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Live URL *</label>
            <input className="input" name="liveUrl" placeholder="https://my-app.vercel.app" value={form.liveUrl} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label className="label">GitHub URL</label>
            <input className="input" name="githubUrl" placeholder="https://github.com/username/repo" value={form.githubUrl} onChange={handleChange} />
          </div>

          {/* Tech Stack */}
          <div className="form-group">
            <label className="label">Tech Stack</label>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <input
                className="input"
                placeholder="Add technology..."
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(techInput); } }}
              />
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => addTech(techInput)} style={{ flexShrink: 0 }}>
                <Plus size={13} />
              </button>
            </div>
            {/* Suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
              {TECH_SUGGESTIONS.filter(s => !form.techStack.includes(s)).slice(0, 8).map(s => (
                <button key={s} type="button" onClick={() => addTech(s)}
                  style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  + {s}
                </button>
              ))}
            </div>
            {/* Selected tags */}
            {form.techStack.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {form.techStack.map(t => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: '4px', padding: '0.15rem 0.5rem' }}>
                    {t}
                    <button type="button" onClick={() => removeTech(t)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', lineHeight: 1, padding: 0 }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Tracking toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <input type="checkbox" id="trackingEnabled" name="trackingEnabled"
              checked={form.trackingEnabled} onChange={handleChange}
              style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
            <label htmlFor="trackingEnabled" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Enable view tracking for this project
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => onClose(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : (isEdit ? 'Save Changes' : 'Add Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;
