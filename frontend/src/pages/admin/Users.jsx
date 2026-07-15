import './Users.css';
import { useEffect, useState } from 'react';
import { Search, Trash2, Edit2, Eye, UserCheck, UserX, RefreshCw } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import './Users.css';

const AdminUsers = () => {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]     = useState(0);
  const [viewUser, setViewUser] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchUsers = async (pg = 1, q = search) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users?page=${pg}&limit=15&search=${q}`);
      setUsers(data.users);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch { toast.error('Failed to load users.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(page); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, search);
  };

  const toggleStatus = async (id, current) => {
    try {
      await api.put(`/admin/users/${id}`, { isActive: !current });
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: !current } : u));
      toast.success(`User ${!current ? 'activated' : 'deactivated'}.`);
    } catch { toast.error('Failed.'); }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}" and all their data?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u._id !== id));
      setTotal(t => t - 1);
      toast.success('User deleted.');
    } catch { toast.error('Delete failed.'); }
  };

  const viewDetails = async (id) => {
    setViewLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${id}`);
      setViewUser(data);
    } catch { toast.error('Failed to load user details.'); }
    finally { setViewLoading(false); }
  };

  return (
    <div className="fade-in">
      <div className="admin-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{total} total users on the platform</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => fetchUsers(page)}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="admin-search">
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input" style={{ paddingLeft: '2.25rem' }}
            placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
      </form>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th><th>Email</th><th>Role</th>
                <th>Projects</th><th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div className="user-av">
                        {u.avatar ? <img src={u.avatar} alt={u.name} /> : u.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-cyan'}`}>{u.role}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{u.projectCount || 0}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                      {u.isActive ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button className="icon-btn" title="View details" onClick={() => viewDetails(u._id)}>
                        <Eye size={13} />
                      </button>
                      <button className="icon-btn" title={u.isActive ? 'Block' : 'Activate'}
                        onClick={() => toggleStatus(u._id, u.isActive)}
                        style={{ color: u.isActive ? 'var(--yellow)' : 'var(--green)' }}>
                        {u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                      </button>
                      <button className="icon-btn icon-btn--danger" title="Delete" onClick={() => deleteUser(u._id, u.name)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* User Detail Modal */}
      {viewUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewUser(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">User Details</h2>
              <button className="modal-close" onClick={() => setViewUser(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div className="user-av" style={{ width: 48, height: 48, fontSize: '1.2rem' }}>
                {viewUser.user.avatar
                  ? <img src={viewUser.user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : viewUser.user.name?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{viewUser.user.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{viewUser.user.email}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem', fontSize: '0.83rem' }}>
              {[
                ['Role', viewUser.user.role],
                ['Status', viewUser.user.isActive ? 'Active' : 'Blocked'],
                ['Projects', viewUser.projects?.length || 0],
                ['Total Views', viewUser.totalViews || 0],
                ['Joined', new Date(viewUser.user.createdAt).toLocaleDateString()],
                ['Last Login', viewUser.user.lastLogin ? new Date(viewUser.user.lastLogin).toLocaleDateString() : 'Never'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-elevated)', borderRadius: 6, padding: '0.5rem 0.75rem' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, marginTop: 2 }}>{String(v)}</div>
                </div>
              ))}
            </div>
            {viewUser.projects?.length > 0 && (
              <>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projects</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 200, overflowY: 'auto' }}>
                  {viewUser.projects.map(p => (
                    <div key={p._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', borderRadius: 6, padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}>
                      <span>{p.name}</span>
                      <span className={`badge ${p.status === 'active' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.65rem' }}>{p.status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
