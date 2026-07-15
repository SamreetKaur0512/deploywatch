import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Search, UserX, UserCheck, Trash2,
  Eye, ArrowLeft, ShieldAlert, RefreshCw, Lock
} from 'lucide-react';
import api from '../api/axios';
import { decrypt, isValidMongoUri } from '../utils/crypto';
import toast from 'react-hot-toast';
import './ProjectUsers.css';

const ProjectUsers = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject]       = useState(null);
  const [users, setUsers]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(false);
  const [decryptedUri, setDecryptedUri] = useState('');
  const [uriReady, setUriReady]     = useState(false);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]         = useState('');
  const [viewUser, setViewUser]     = useState(null);
  const [editUser, setEditUser]     = useState(null);
  const [editForm, setEditForm]     = useState({});

  // Load project info
  useEffect(() => {
    api.get(`/projects/${id}`).then(({ data }) => setProject(data.project)).catch(() => navigate('/projects'));
  }, [id]);

  // Decrypt DB credentials based on dbType
  useEffect(() => {
    if (!project?.hasDbCredentials && !project?.hasMongoUri) return;
    const load = async () => {
      try {
        const { data } = await api.get(`/projects/${id}/credentials`);
        const c = data.credentials;
        const dbType = c.dbType || 'mongodb';
        let creds = { type: dbType };

        if (dbType === 'mongodb') {
          creds.uri = await decrypt(c.encryptedMongoUri);
        } else if (dbType === 'mysql' || dbType === 'postgresql') {
          creds.uri = await decrypt(c.encryptedDbUri);
        } else if (dbType === 'firebase') {
          creds.serviceAccount = await decrypt(c.encryptedFirebaseCreds);
        } else if (dbType === 'sqlite') {
          creds.type = 'sqlite';
        } else if (dbType === 'supabase') {
          creds.url        = await decrypt(c.encryptedSupabaseUrl);
          creds.serviceKey = await decrypt(c.encryptedSupabaseKey);
        }

        setDecryptedUri(creds);
        setUriReady(true);
      } catch { toast.error('Failed to load credentials.'); }
    };
    load();
  }, [project]);

  const fetchUsers = async (pg = 1, q = search) => {
    if (!decryptedUri) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/projects/${id}/users/fetch`, {
        credentials: decryptedUri,
        page: pg, limit: 15, search: q,
      });
      setUsers(data.users);
      setTotal(data.total);
      setTotalPages(data.pages);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch users.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (uriReady) fetchUsers(page); }, [uriReady, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  };

  const handleBlock = async (user, block) => {
    try {
      await api.post(`/projects/${id}/users/${user._id}/block`, {
        credentials: decryptedUri, block,
      });
      toast.success(`User ${block ? 'blocked' : 'unblocked'}.`);
      fetchUsers(page);
    } catch { toast.error('Action failed.'); }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.name || user.email}"? This cannot be undone.`)) return;
    try {
      await api.post(`/projects/${id}/users/${user._id}/delete`, { credentials: decryptedUri });
      toast.success('User deleted.');
      fetchUsers(page);
    } catch { toast.error('Delete failed.'); }
  };

  const handleEditSave = async () => {
    try {
      const safe = { ...editForm };
      delete safe.password; delete safe.passwordHash; delete safe.email;
      await api.post(`/projects/${id}/users/${editUser._id}/update`, {
        credentials: decryptedUri,
        updates: safe,
      });
      toast.success('User updated.');
      setEditUser(null);
      fetchUsers(page);
    } catch { toast.error('Update failed.'); }
  };

  const isBlocked = (u) => u.isBlocked || u.blocked || u.isActive === false || u.status === 'blocked';

  if (!project) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  // No MongoDB URI configured
  if (!project.hasMongoUri && !project.hasDbCredentials) return (
    <div className="fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: '1.5rem' }}>
        <ArrowLeft size={14} /> Back to Projects
      </button>
      <div className="pu-no-uri card">
        <Lock size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
        <h2>MongoDB URI Not Set</h2>
        <p>To manage users of <strong>{project.name}</strong>, you need to add your MongoDB URI first.</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Go to Projects page → Click 🔒 Credentials on this project → Add your MongoDB URI
        </p>
        <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => navigate('/projects')}>
          Go to Projects
        </button>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={14} /> Back to Projects
      </button>
      <div className="pu-header">
        <div>
          <h1 className="page-title"><Users size={20} /> {project.name} — Users</h1>
          <p className="page-subtitle">{total} total users in your project database</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => fetchUsers(page)}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Privacy reminder */}
      <div className="pu-privacy-bar">
        <ShieldAlert size={14} style={{ color: 'var(--yellow)', flexShrink: 0 }} />
        <span>
          You are viewing users from <strong>{project.name}</strong>'s database.
          Passwords are never shown. DeployWatch cannot see your MongoDB URI.
        </span>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="pu-search">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.25rem' }}
            placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
      </form>

      {/* Users table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : users.length === 0 ? (
        <div className="pu-empty card">
          <Users size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
          <h3>No users found</h3>
          <p>Try a different search or check your collection name in credentials.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="pu-table">
            <thead>
              <tr>
                <th>User</th><th>Email</th><th>Role</th>
                <th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const blocked = isBlocked(u);
                return (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div className="pu-avatar">
                          {u.avatar || u.profilePicture
                            ? <img src={u.avatar || u.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (u.name || u.username || '?')[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.name || u.username || '—'}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{u.email || '—'}</td>
                    <td>
                      {u.role && <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>{u.role}</span>}
                    </td>
                    <td>
                      <span className={`badge ${blocked ? 'badge-red' : 'badge-green'}`}>
                        {blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button className="pu-icon-btn" title="View details" onClick={() => setViewUser(u)}>
                          <Eye size={13} />
                        </button>
                        <button className="pu-icon-btn" title="Edit" onClick={() => { setEditUser(u); setEditForm({ name: u.name || '', role: u.role || '' }); }}>
                          ✏️
                        </button>
                        <button className="pu-icon-btn" title={blocked ? 'Unblock' : 'Block'}
                          style={{ color: blocked ? 'var(--green)' : 'var(--yellow)' }}
                          onClick={() => handleBlock(u, !blocked)}>
                          {blocked ? <UserCheck size={13} /> : <UserX size={13} />}
                        </button>
                        <button className="pu-icon-btn pu-del-btn" title="Delete" onClick={() => handleDelete(u)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* View User Modal */}
      {viewUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewUser(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">User Details</h2>
              <button className="modal-close" onClick={() => setViewUser(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="pu-avatar" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                {viewUser.avatar || viewUser.profilePicture
                  ? <img src={viewUser.avatar || viewUser.profilePicture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (viewUser.name || '?')[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{viewUser.name || viewUser.username}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{viewUser.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {Object.entries(viewUser)
                .filter(([k]) => !['password','passwordHash','passwd','pwd','hash','salt','tokens','__v','_id'].includes(k))
                .map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-elevated)', borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 100, textTransform: 'capitalize' }}>{k}:</span>
                    <span style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
            </div>
            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--red-dim)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              🔒 Password fields are never shown
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditUser(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Edit User</h2>
              <button className="modal-close" onClick={() => setEditUser(null)}>✕</button>
            </div>
            <div style={{ background: 'var(--yellow-dim)', border: '1px solid var(--yellow)', borderRadius: 8, padding: '0.65rem 0.85rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--yellow)' }}>
              ⚠️ You can update name and role only. Passwords cannot be changed through DeployWatch.
            </div>
            <div className="form-group">
              <label className="label">Name</label>
              <input className="input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Role</label>
              <input className="input" placeholder="user / admin / moderator" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectUsers;
