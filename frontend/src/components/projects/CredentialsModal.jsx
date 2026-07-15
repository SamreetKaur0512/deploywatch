import { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff, Trash2, ShieldCheck } from 'lucide-react';
import { encrypt, decrypt } from '../../utils/crypto';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const DB_TYPES = [
  { value: 'none',       label: 'None / Not applicable' },
  { value: 'mongodb',    label: 'MongoDB' },
  { value: 'mysql',      label: 'MySQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'firebase',   label: 'Firebase' },
  { value: 'supabase',   label: 'Supabase' },
  { value: 'sqlite',     label: 'SQLite' },
];

const DB_PLACEHOLDERS = {
  mongodb:    'mongodb+srv://user:pass@cluster.mongodb.net/dbname',
  mysql:      'mysql://user:pass@host:3306/dbname',
  postgresql: 'postgresql://user:pass@host:5432/dbname',
  firebase:   '{"type":"service_account","project_id":"...","private_key":"..."}',
  supabase:   'https://xxxx.supabase.co',
  sqlite:     '/absolute/path/to/your/database.db  (e.g. /app/db/myapp.db)',
};

const CredentialsModal = ({ project, onClose, onSaved }) => {
  const [dbType,          setDbType]          = useState(project.dbType || 'none');
  const [dbUri,           setDbUri]           = useState('');
  const [supabaseKey,     setSupabaseKey]     = useState('');
  const [userCollection,  setUserCollection]  = useState(project.userCollection || 'users');
  const [githubToken,     setGithubToken]     = useState('');
  const [vercelToken,     setVercelToken]     = useState('');
  const [showDb,          setShowDb]          = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [fetching,        setFetching]        = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/projects/${project._id}/credentials`);
        const c = data.credentials;
        setDbType(c.dbType || 'none');
        setUserCollection(c.userCollection || 'users');
        if (c.encryptedMongoUri)      setDbUri(await decrypt(c.encryptedMongoUri));
        else if (c.encryptedDbUri)    setDbUri(await decrypt(c.encryptedDbUri));
        else if (c.encryptedFirebaseCreds) setDbUri(await decrypt(c.encryptedFirebaseCreds));
        else if (c.encryptedSQLitePath) { setDbUri(await decrypt(c.encryptedSQLitePath)); }
        else if (c.encryptedSupabaseUrl) {
          setDbUri(await decrypt(c.encryptedSupabaseUrl));
          setSupabaseKey(await decrypt(c.encryptedSupabaseKey));
        }
        if (c.encryptedGithubToken) setGithubToken(await decrypt(c.encryptedGithubToken));
        if (c.encryptedVercelToken) setVercelToken(await decrypt(c.encryptedVercelToken));
      } catch { }
      finally { setFetching(false); }
    };
    load();
  }, [project._id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        dbType,
        userCollection,
        encryptedGithubToken: githubToken ? await encrypt(githubToken) : '',
        encryptedVercelToken:  vercelToken ? await encrypt(vercelToken)  : '',
      };

      if (dbType === 'mongodb')    payload.encryptedMongoUri      = dbUri ? await encrypt(dbUri) : '';
      if (dbType === 'mysql' || dbType === 'postgresql') payload.encryptedDbUri = dbUri ? await encrypt(dbUri) : '';
      if (dbType === 'firebase')   payload.encryptedFirebaseCreds  = dbUri ? await encrypt(dbUri) : '';
      if (dbType === 'sqlite')     payload.encryptedSQLitePath     = dbUri ? await encrypt(dbUri) : '';
      if (dbType === 'supabase') {
        payload.encryptedSupabaseUrl = dbUri       ? await encrypt(dbUri)       : '';
        payload.encryptedSupabaseKey = supabaseKey ? await encrypt(supabaseKey) : '';
      }

      await api.put(`/projects/${project._id}/credentials`, payload);
      toast.success('Credentials saved securely!');
      onSaved?.();
      onClose();
    } catch { toast.error('Failed to save credentials.'); }
    finally { setLoading(false); }
  };

  const handleRemove = async (type) => {
    if (!window.confirm(`Remove ${type} credential?`)) return;
    try {
      await api.delete(`/projects/${project._id}/credentials`, { data: { type } });
      if (type === 'db' || type === 'all') { setDbUri(''); setSupabaseKey(''); setDbType('none'); }
      if (type === 'github' || type === 'all') setGithubToken('');
      if (type === 'vercel'  || type === 'all') setVercelToken('');
      toast.success('Credential removed.');
      onSaved?.();
    } catch { toast.error('Failed.'); }
  };

  const isFirebase = dbType === 'firebase';
  const isSupabase = dbType === 'supabase';
  const isSQLite   = dbType === 'sqlite';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2 className="modal-title"><Lock size={16} style={{ color: 'var(--accent)' }} /> Project Credentials</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Privacy notice */}
        <div className="cred-privacy-box">
          <ShieldCheck size={16} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: 'var(--green)', fontSize: '0.82rem' }}>Your privacy is protected</strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.5 }}>
              All credentials are <strong>encrypted in your browser</strong> before being sent.
              DeployWatch servers <strong>can never read your actual passwords, URIs, or tokens.</strong>
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              ✅ We see: project names, view counts, status &nbsp;|&nbsp;
              ❌ We never see: your DB credentials, API tokens, user passwords
            </p>
          </div>
        </div>

        {fetching ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Database Type */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="label">Database Type</label>
              <select className="input" value={dbType} onChange={e => { setDbType(e.target.value); setDbUri(''); setSupabaseKey(''); }}>
                {DB_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            {/* DB Credentials */}
            {dbType !== 'none' && (
              <>
                <div className="form-group">
                  <label className="label">
                    {isFirebase ? 'Firebase Service Account JSON' : isSupabase ? 'Supabase Project URL' : dbType === 'sqlite' ? 'SQLite File Path' : 'Connection String'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showDb ? 'text' : 'password'}
                      className="input"
                      placeholder={DB_PLACEHOLDERS[dbType] || ''}
                      value={dbUri}
                      onChange={e => setDbUri(e.target.value)}
                      style={{ paddingRight: '5rem' }}
                    />
                    <div style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '0.25rem' }}>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.2rem' }} onClick={() => setShowDb(!showDb)}>
                        {showDb ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      {project.hasDbCredentials && (
                        <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0.2rem', color: 'var(--red)' }} onClick={() => handleRemove('db')}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  {project.hasDbCredentials && !dbUri && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--green)', marginTop: '0.25rem' }}>✅ Credential saved (encrypted)</p>
                  )}
                </div>

                {/* Supabase Service Key */}
                {isSupabase && (
                  <div className="form-group">
                    <label className="label">Supabase Service Role Key</label>
                    <input type="password" className="input" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} />
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Use the <strong>service_role</strong> key (not anon key) for user management
                    </p>
                  </div>
                )}

                {/* Collection/Table name */}
                <div className="form-group">
                  <label className="label">{dbType === 'mongodb' ? 'Collection Name' : 'Table Name'}</label>
                  <input className="input" placeholder="users" value={userCollection} onChange={e => setUserCollection(e.target.value)} />
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Name of your {dbType === 'mongodb' ? 'collection' : 'table'} that stores users (usually "users")
                  </p>
                </div>
              </>
            )}

            {/* GitHub Token */}
            <div className="form-group">
              <label className="label"><Lock size={11} /> GitHub Token <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginLeft: 4 }}>(optional)</span></label>
              <input type="password" className="input" placeholder="ghp_xxxxxxxxxxxx"
                value={githubToken} onChange={e => setGithubToken(e.target.value)} />
              {project.hasGithubToken && !githubToken && (
                <p style={{ fontSize: '0.72rem', color: 'var(--green)', marginTop: '0.25rem' }}>✅ Saved (encrypted)</p>
              )}
            </div>

            {/* Vercel Token */}
            <div className="form-group">
              <label className="label"><Lock size={11} /> Vercel Token <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', marginLeft: 4 }}>(optional)</span></label>
              <input type="password" className="input" placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                value={vercelToken} onChange={e => setVercelToken(e.target.value)} />
              {project.hasVercelToken && !vercelToken && (
                <p style={{ fontSize: '0.72rem', color: 'var(--green)', marginTop: '0.25rem' }}>✅ Saved (encrypted)</p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? <span className="spinner" /> : <Lock size={13} />} Save Encrypted
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CredentialsModal;
