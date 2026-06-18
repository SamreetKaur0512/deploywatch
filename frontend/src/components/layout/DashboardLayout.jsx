import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSocket } from '../../context/SocketContext';
import { useEffect, useState } from 'react';
import api from '../../api/axios';
import toast, { Toaster } from 'react-hot-toast';

const DashboardLayout = () => {
  const { liveNotifications } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial unread count
  useEffect(() => {
    api.get('/notifications?limit=1')
      .then(({ data }) => setUnreadCount(data.unreadCount || 0))
      .catch(() => {});
  }, []);

  // Show toast for new live notifications + update count
  useEffect(() => {
    if (liveNotifications.length === 0) return;
    const latest = liveNotifications[0];
    setUnreadCount((c) => c + 1);

    const isRecruiter = latest.type === 'recruiter_visit';
    toast(latest.message || latest.title, {
      icon: isRecruiter ? '👔' : latest.type === 'project_down' ? '🔴' : '👁️',
      style: {
        background: isRecruiter ? 'var(--purple-dim)' : 'var(--bg-elevated)',
        color: 'var(--text-primary)',
        border: `1px solid ${isRecruiter ? 'var(--purple)' : 'var(--border)'}`,
        fontSize: '0.85rem',
      },
      duration: 5000,
    });
  }, [liveNotifications]);

  return (
    <div className="page-wrapper">
      <Sidebar unreadCount={unreadCount} />
      <main className="main-content fade-in">
        <Outlet context={{ setUnreadCount }} />
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
};

export default DashboardLayout;
