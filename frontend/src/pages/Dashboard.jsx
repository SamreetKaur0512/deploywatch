import './Dashboard.css';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  FolderGit2, Eye, TrendingUp, AlertCircle,
  CheckCircle2, Users, Trophy, RefreshCw
} from 'lucide-react';
import api from '../api/axios';
import './Dashboard.css';

const STATUS_COLORS = {
  active:  'var(--green)',
  down:    'var(--red)',
  unknown: 'var(--text-muted)',
  checking:'var(--yellow)',
};

const PIE_COLORS = ['#00d4ff', '#3fb950', '#bc8cff', '#d29922', '#f85149'];

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: `${color}18`, color }}>
      <Icon size={18} />
    </div>
    <div className="stat-body">
      <span className="stat-value">{value ?? '—'}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  </div>
);

const StatusDot = ({ status }) => (
  <span className="status-dot" style={{ background: STATUS_COLORS[status] || 'var(--text-muted)' }} />
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/dashboard');
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="dash-loading">
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  const { stats, topProjects, dailyViews, deviceStats, countryStats } = data || {};

  // Fill missing days in chart
  const chartData = (() => {
    const map = {};
    (dailyViews || []).forEach(d => { map[d._id] = d.count; });
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      result.push({ day: d.toLocaleDateString('en', { weekday: 'short' }), views: map[key] || 0 });
    }
    return result;
  })();

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Live overview of your deployments</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchData}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard icon={FolderGit2}   label="Total Projects"    value={stats?.totalProjects}       color="var(--accent)"  />
        <StatCard icon={CheckCircle2} label="Active"            value={stats?.activeProjects}      color="var(--green)"   sub={stats?.downProjects > 0 ? `${stats.downProjects} down` : undefined} />
        <StatCard icon={Eye}          label="Total Views"       value={stats?.totalViews}           color="var(--purple)"  sub="All visits including repeats" />
        <StatCard icon={Users}        label="Unique Visitors"   value={stats?.totalUniqueVisitors}  color="var(--accent)"  sub="Each person counted once" />
        <StatCard icon={TrendingUp}   label="Views Today"       value={stats?.viewsToday}           color="var(--cyan)"    sub={`${stats?.viewsThisWeek || 0} this week`} />
        <StatCard icon={Users}        label="Recruiter Visits"  value={stats?.recruiterVisits}      color="var(--yellow)"  />
        <StatCard icon={AlertCircle}  label="Unread Alerts"     value={stats?.unreadNotifications}  color="var(--red)"     />
      </div>

      {/* Charts row */}
      <div className="dash-charts">
        {/* Daily views bar chart */}
        <div className="card dash-chart-card">
          <h3 className="chart-title">Views — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-secondary)' }}
                itemStyle={{ color: 'var(--accent)' }}
                cursor={{ fill: 'rgba(0,212,255,0.06)' }}
              />
              <Bar dataKey="views" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Device pie chart */}
        <div className="card dash-chart-card">
          <h3 className="chart-title">Device Breakdown</h3>
          {deviceStats?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={deviceStats} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={65} paddingAngle={3}>
                  {deviceStats.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No view data yet</div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="dash-bottom">
        {/* Top projects ranking */}
        <div className="card">
          <h3 className="chart-title" style={{ marginBottom: '0.9rem' }}>
            <Trophy size={15} style={{ color: 'var(--yellow)' }} /> Top Projects by Views
          </h3>
          {topProjects?.length > 0 ? (
            <table className="rank-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Project</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Views</th>
                </tr>
              </thead>
              <tbody>
                {topProjects.map((p) => (
                  <tr key={p._id}>
                    <td><span className="rank-num">#{p.rank}</span></td>
                    <td>
                      <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="project-link">
                        {p.name}
                      </a>
                    </td>
                    <td><span className="badge badge-cyan">{p.platform}</span></td>
                    <td>
                      <span className="status-pill" style={{ color: STATUS_COLORS[p.status] }}>
                        <StatusDot status={p.status} /> {p.status}
                      </span>
                    </td>
                    <td><strong>{p.totalViews}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
              No projects yet. <a href="/projects">Add your first project →</a>
            </p>
          )}
        </div>

        {/* Top countries */}
        <div className="card">
          <h3 className="chart-title" style={{ marginBottom: '0.9rem' }}>Top Countries</h3>
          {countryStats?.length > 0 ? (
            <div className="country-list">
              {countryStats.map((c, i) => {
                const max = countryStats[0].count;
                return (
                  <div key={c._id} className="country-row">
                    <span className="country-name">{c._id || 'Unknown'}</span>
                    <div className="country-bar-wrap">
                      <div className="country-bar" style={{ width: `${(c.count / max) * 100}%` }} />
                    </div>
                    <span className="country-count">{c.count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No location data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// CSS import at top (add manually if needed)
// import './Dashboard.css';
