import React, { useEffect, useState } from 'react';
import KpiCard from '../components/KpiCard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function CustomerIntelligence() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCustomers = () => {
    setLoading(true);
    setError(null);
    fetch('/api/customers')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (json && json.repeat_summary) {
          setData(json);
        } else {
          throw new Error('Invalid customer intelligence schema');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching customer data:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const formatNum = (val) => (val || 0).toLocaleString('en-US');
  const formatBRL = (val) => `R$ ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="page-container">
        <div className="state-loading">Loading Customer Intelligence...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <div className="state-loading" style={{ flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '16px' }}>Failed to load Customer Intelligence</div>
          <p style={{ color: '#64748b', fontSize: '13px' }}>{error || 'Connection error'}</p>
          <button onClick={fetchCustomers} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  const repeat_summary = data.repeat_summary || {};
  const clv_summary = data.clv_summary || {};
  const segment_distribution = Array.isArray(data.segment_distribution) ? data.segment_distribution : [];
  const cluster_distribution = Array.isArray(data.cluster_distribution) ? data.cluster_distribution : [];
  const top_states = Array.isArray(data.top_states) ? data.top_states : [];
  const sample_customers = Array.isArray(data.sample_customers) ? data.sample_customers : [];

  const getSegmentBadge = (seg) => {
    if (!seg) return null;
    if (seg === 'Champions') return <span className="badge-segment badge-champions">Champions</span>;
    if (seg.includes('High-Spenders')) return <span className="badge-segment badge-high-spenders">Recent High-Spend</span>;
    if (seg.includes('At Risk')) return <span className="badge-segment badge-at-risk">At Risk High-Value</span>;
    if (seg.includes('Loyal')) return <span className="badge-segment badge-loyal">Loyal Repeat</span>;
    return <span className="badge-segment badge-lost">{seg}</span>;
  };

  return (
    <div className="page-container">
      {/* Customer KPIs */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Unique Customers"
          value={formatNum(repeat_summary.total_unique_customers)}
          subtext="Delivered buyers"
          deltaType="neutral"
        />
        <KpiCard
          label="Repeat Purchase Rate"
          value={`${repeat_summary.repeat_purchase_rate_pct || 0}%`}
          subtext={`${formatNum(repeat_summary.repeat_customers)} repeat buyers (>1 order)`}
          deltaType="positive"
        />
        <KpiCard
          label="Projected 1-Yr CLV (Avg)"
          value={formatBRL(clv_summary.avg_projected_1yr_clv)}
          subtext="Net margin contribution"
          deltaType="positive"
        />
        <KpiCard
          label="Top 10% Spend Threshold"
          value={formatBRL(clv_summary.top_10pct_spend_threshold)}
          subtext="90th percentile spend"
          deltaType="neutral"
        />
      </div>

      {/* Segment Distribution Charts */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Customer Distribution vs Revenue Contribution</h3>
              <p className="chart-subtitle">% of Customer Base vs % of Gross Spend by RFM Segment</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segment_distribution} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="segment" stroke="#0f172a" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(val, name) => [`${val}%`, name]}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="pct_customers" name="% of Customers" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pct_revenue" name="% of Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">K-Means Behavioral Clusters</h3>
              <p className="chart-subtitle">Standardized Log-RFM Unsupervised Clustering (k=4)</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cluster_distribution} layout="vertical" margin={{ top: 10, right: 30, left: 100, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="cluster_name" stroke="#0f172a" fontSize={10} tickLine={false} width={150} />
                <Tooltip
                  formatter={(val, name) => [formatNum(val), 'Customers']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="customer_count" fill="#0f172a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RFM Segments Summary Table */}
      <div className="table-card">
        <div className="table-header">
          <h3 className="table-title">RFM Business Segment Profiles</h3>
        </div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Segment Name</th>
                <th className="num-cell">Customer Count</th>
                <th className="num-cell">% of Base</th>
                <th className="num-cell">Avg Recency (Days)</th>
                <th className="num-cell">Avg Frequency</th>
                <th className="num-cell">Avg Spend (BRL)</th>
                <th className="num-cell">Total Spend (BRL)</th>
                <th className="num-cell">% of Revenue</th>
              </tr>
            </thead>
            <tbody>
              {segment_distribution.map((s) => (
                <tr key={s.segment}>
                  <td><strong>{getSegmentBadge(s.segment)}</strong></td>
                  <td className="num-cell">{formatNum(s.customer_count)}</td>
                  <td className="num-cell">{s.pct_customers}%</td>
                  <td className="num-cell">{s.avg_recency}d</td>
                  <td className="num-cell">{s.avg_frequency}</td>
                  <td className="num-cell">{formatBRL(s.avg_monetary)}</td>
                  <td className="num-cell">{formatBRL(s.total_revenue)}</td>
                  <td className="num-cell"><strong>{s.pct_revenue}%</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top States & Sample Profiles Grid */}
      <div className="charts-grid-2">
        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">Top States: Customer Density & Repeat Rate</h3>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>State</th>
                  <th className="num-cell">Customers</th>
                  <th className="num-cell">% National</th>
                  <th className="num-cell">Repeat Buyers</th>
                  <th className="num-cell">Repeat Rate %</th>
                </tr>
              </thead>
              <tbody>
                {top_states.map((st) => (
                  <tr key={st.state}>
                    <td><strong>{st.state}</strong></td>
                    <td className="num-cell">{formatNum(st.customer_count)}</td>
                    <td className="num-cell">{st.pct_national_customers}%</td>
                    <td className="num-cell">{formatNum(st.repeat_customers)}</td>
                    <td className="num-cell">{st.repeat_rate_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">Sample Customer Intelligence Profiles</h3>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Segment</th>
                  <th className="num-cell">Recency</th>
                  <th className="num-cell">Freq</th>
                  <th className="num-cell">Total Spend</th>
                </tr>
              </thead>
              <tbody>
                {sample_customers.slice(0, 7).map((c) => (
                  <tr key={c.customer_unique_id}>
                    <td><code>{c.customer_unique_id.substring(0, 10)}...</code></td>
                    <td>{getSegmentBadge(c.segment)}</td>
                    <td className="num-cell">{c.recency_days}d</td>
                    <td className="num-cell">{c.frequency}</td>
                    <td className="num-cell">{formatBRL(c.monetary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
