import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Trophy, Globe, Monitor, RefreshCw, UserCheck } from 'lucide-react';
import api from '../api/axios';
import './Analytics.css';

const PIE_COLORS = ['#00d4ff', '#3fb950', '#bc8cff', '#d29922', '#f85149'];

const Analytics = () => {
  const [rankings, setRankings] = useState([]);
  const [views, setViews]       = useState([]);
  const [dash, setDash]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAll = async (pg = 1) => {
    setLoading(true);
    try {
      const [rRes, vRes, dRes] = await Promise.all([
        api.get('/analytics/rankings'),
        api.get(`/analytics/views?page=${pg}&limit=15`),
        api.get('/analytics/dashboard'),
      ]);
      setRankings(rRes.data.rankings);
      setViews(vRes.data.views);
      setTotalPages(vRes.data.pages);
      setDash(dRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(page); }, [page]);

  const chartData = (() => {
    const map = {};
    (dash?.dailyViews || []).forEach(d => { map[d._id] = d.count; });
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
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Detailed view tracking and project rankings</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => fetchAll(page)}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="analytics-charts">
            <div className="card">
              <h3 className="chart-title-a">Daily Views — Last 7 Days</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-secondary)' }} itemStyle={{ color: 'var(--accent)' }} />
                  <Line type="monotone" dataKey="views" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="chart-title-a">Device Breakdown</h3>
              {dash?.deviceStats?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={dash.deviceStats} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                      {dash.deviceStats.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="analytics-empty-chart">No data yet</div>}
            </div>

            <div className="card">
              <h3 className="chart-title-a">Top Countries</h3>
              {dash?.countryStats?.length > 0 ? (
                <div className="country-bars">
                  {dash.countryStats.map((c, i) => {
                    const max = dash.countryStats[0].count;
                    return (
                      <div key={c._id} className="cbar-row">
                        <span className="cbar-name">{c._id || 'Unknown'}</span>
                        <div className="cbar-track">
                          <div className="cbar-fill" style={{ width: `${(c.count / max) * 100}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        </div>
                        <span className="cbar-count">{c.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="analytics-empty-chart">No data yet</div>}
            </div>
          </div>

          {/* Rankings */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 className="chart-title-a" style={{ marginBottom: '0.9rem' }}>
              <Trophy size={15} style={{ color: 'var(--yellow)' }} /> Project Rankings
            </h3>
            {rankings.length > 0 ? (
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Rank</th><th>Project</th><th>Platform</th>
                    <th>Status</th><th>Views</th><th>Last Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map(p => (
                    <tr key={p._id}>
                      <td><span className="rank-badge">#{p.rank}</span></td>
                      <td>
                        <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="at-link">{p.name}</a>
                      </td>
                      <td><span className="badge badge-cyan">{p.platform}</span></td>
                      <td>
                        <span className={`badge ${p.status === 'active' ? 'badge-green' : p.status === 'down' ? 'badge-red' : 'badge-yellow'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td><strong style={{ color: 'var(--accent)' }}>{p.totalViews}</strong></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {p.lastChecked ? new Date(p.lastChecked).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No projects yet.</p>
            )}
          </div>

          {/* Recent Views */}
          <div className="card">
            <h3 className="chart-title-a" style={{ marginBottom: '0.9rem' }}>Recent Views</h3>
            {views.length > 0 ? (
              <>
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Project</th><th>Visitor</th><th>Unique</th><th>Country</th><th>City</th>
                      <th>Device</th><th>Source</th><th>Recruiter</th><th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {views.map(v => (
                      <tr key={v._id}>
                        <td style={{ fontWeight: 500 }}>{v.project?.name || '—'}</td>
                        <td>
                          {v.isUniqueVisitor
                            ? <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>New</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Repeat</span>}
                        </td>
                        <td>
                          {v.visitorName
                            ? <div>
                                <div style={{ fontWeight: 500, fontSize: '0.82rem' }}>{v.visitorName}</div>
                                {v.visitorEmail && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v.visitorEmail}</div>}
                              </div>
                            : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Anonymous</span>}
                        </td>
                        <td>{v.country}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{v.city}</td>
                        <td>
                          <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>{v.device}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {v.utmSource || v.referrer?.slice(0, 20) || 'direct'}
                        </td>
                        <td>
                          {v.isRecruiter
                            ? <span className="badge badge-purple"><UserCheck size={10} /> Yes</span>
                            : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No</span>}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          {new Date(v.viewedAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                      Page {page} of {totalPages}
                    </span>
                    <button className="btn btn-secondary btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                No views yet. Add the tracking script to your projects to start collecting data.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
