import { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Trash, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useOutletContext } from 'react-router-dom';
import './Notifications.css';

const TYPE_ICON = {
  project_view:    { icon: '👁️', cls: 'badge-cyan'   },
  recruiter_visit: { icon: '👔', cls: 'badge-purple' },
  project_down:    { icon: '🔴', cls: 'badge-red'    },
  project_up:      { icon: '🟢', cls: 'badge-green'  },
  system:          { icon: '⚙️', cls: 'badge-yellow' },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const ctx = useOutletContext();

  const fetchNotifs = async (pg = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/notifications?page=${pg}&limit=20`);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setTotalPages(data.pages);
      if (ctx?.setUnreadCount) ctx.setUnreadCount(data.unreadCount);
    } catch { toast.error('Failed to load notifications.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifs(page); }, [page]);

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
      if (ctx?.setUnreadCount) ctx.setUnreadCount(c => Math.max(0, c - 1));
    } catch { toast.error('Failed to mark as read.'); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (ctx?.setUnreadCount) ctx.setUnreadCount(0);
      toast.success('All marked as read.');
    } catch { toast.error('Failed.'); }
  };

  const deleteOne = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch { toast.error('Delete failed.'); }
  };

  const deleteAll = async () => {
    if (!window.confirm('Clear all notifications?')) return;
    try {
      await api.delete('/notifications/delete-all');
      setNotifications([]);
      setUnreadCount(0);
      if (ctx?.setUnreadCount) ctx.setUnreadCount(0);
      toast.success('All notifications cleared.');
    } catch { toast.error('Failed.'); }
  };

  return (
    <div className="fade-in">
      <div className="notif-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchNotifs(page)}>
            <RefreshCw size={13} /> Refresh
          </button>
          {unreadCount > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
              <CheckCheck size={13} /> Mark All Read
            </button>
          )}
          {notifications.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={deleteAll}>
              <Trash size={13} /> Clear All
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="notif-empty">
          <Bell size={40} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3>No notifications yet</h3>
          <p>When someone views your project, you'll get notified here in real-time.</p>
        </div>
      ) : (
        <div className="notif-list card">
          {notifications.map((n, i) => {
            const meta = TYPE_ICON[n.type] || TYPE_ICON.system;
            return (
              <div key={n._id} className={`notif-item ${!n.isRead ? 'notif-item--unread' : ''}`}>
                <span className="notif-icon">{meta.icon}</span>
                <div className="notif-body">
                  <div className="notif-title-row">
                    <span className="notif-title">{n.title}</span>
                    {!n.isRead && <span className="unread-dot" />}
                  </div>
                  <p className="notif-msg">{n.message}</p>
                  <div className="notif-footer-row">
                    {n.project && (
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                        {n.project.name}
                      </span>
                    )}
                    <span className="notif-time">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="notif-actions">
                  {!n.isRead && (
                    <button className="notif-action-btn" onClick={() => markRead(n._id)} title="Mark as read">
                      <Check size={13} />
                    </button>
                  )}
                  <button className="notif-action-btn notif-del-btn" onClick={() => deleteOne(n._id)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
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
    </div>
  );
};

export default Notifications;
