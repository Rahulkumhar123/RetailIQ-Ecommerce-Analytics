import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';

export default function SalesAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSales = () => {
    setLoading(true);
    setError(null);
    fetch('/api/sales')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (json && json.categories) {
          setData(json);
        } else {
          throw new Error('Invalid sales data schema');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching sales data:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const formatBRL = (val) => `R$ ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNum = (val) => (val || 0).toLocaleString('en-US');

  if (loading) {
    return (
      <div className="page-container">
        <div className="state-loading">Loading Sales Analytics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <div className="state-loading" style={{ flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '16px' }}>Failed to load Sales Analytics</div>
          <p style={{ color: '#64748b', fontSize: '13px' }}>{error || 'Connection error'}</p>
          <button onClick={fetchSales} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  const categories = Array.isArray(data.categories) ? data.categories : [];
  const geographic_states = Array.isArray(data.geographic_states) ? data.geographic_states : [];
  const payment_methods = Array.isArray(data.payment_methods) ? data.payment_methods : [];
  const aov_trend = Array.isArray(data.aov_trend) ? data.aov_trend : [];

  return (
    <div className="page-container">
      {/* Category Sales & Geographic Sales */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Revenue by Top Product Category</h3>
              <p className="chart-subtitle">Top 10 categories ranked by item revenue</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categories.slice(0, 10)}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" stroke="#0f172a" fontSize={11} tickLine={false} width={130} />
                <Tooltip
                  formatter={(val) => [formatBRL(val), 'Revenue']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="item_revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Geographic Sales Distribution</h3>
              <p className="chart-subtitle">Top 10 Brazilian states by revenue</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geographic_states} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="state" stroke="#0f172a" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val, name) => [
                    name === 'Revenue (BRL)' ? formatBRL(val) : formatNum(val),
                    name
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" name="Revenue (BRL)" fill="#0f172a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AOV Trend & Payment Methods */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Average Order Value (AOV) Trend</h3>
              <p className="chart-subtitle">Monthly stability and ticket size evolution</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aov_trend} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 20', 'dataMax + 20']} tickFormatter={(v) => `R$ ${v}`} />
                <Tooltip
                  formatter={(val) => [formatBRL(val), 'AOV']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="aov" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Payment Methods & Installment Usage</h3>
              <p className="chart-subtitle">Transactional split by payment instrument</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payment_methods} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="payment_type" stroke="#0f172a" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val, name) => [
                    name === 'Total Value' ? formatBRL(val) : formatNum(val),
                    name
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="total_value" name="Total Value" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Performance Details Table */}
      <div className="table-card">
        <div className="table-header">
          <h3 className="table-title">Top 15 Categories Revenue Contribution</h3>
        </div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="num-cell">Units Sold</th>
                <th className="num-cell">Total Revenue (BRL)</th>
                <th className="num-cell">Avg Item Price</th>
                <th className="num-cell">Revenue Share %</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.category}>
                  <td><strong>{cat.category}</strong></td>
                  <td className="num-cell">{formatNum(cat.units_sold)}</td>
                  <td className="num-cell">{formatBRL(cat.item_revenue)}</td>
                  <td className="num-cell">{formatBRL(cat.avg_item_price)}</td>
                  <td className="num-cell">{cat.revenue_share_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
