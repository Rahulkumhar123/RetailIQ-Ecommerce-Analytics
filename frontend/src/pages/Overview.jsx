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
  Legend,
  Line,
  ComposedChart
} from 'recharts';

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = () => {
    setLoading(true);
    setError(null);
    fetch('/api/overview')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (json && json.kpis) {
          setData(json);
        } else {
          throw new Error('Invalid data schema received');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching overview data:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const formatBRL = (val) => `R$ ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNum = (val) => (val || 0).toLocaleString('en-US');

  if (loading) {
    return (
      <div className="page-container">
        <div className="state-loading">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
              Loading Executive Overview...
            </div>
            <p style={{ color: '#64748b', fontSize: '13px' }}>Connecting to analytical database pipeline</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <div className="state-loading" style={{ flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '16px' }}>
            Failed to connect to RetailIQ Backend API
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', maxWidth: '450px', textAlign: 'center' }}>
            {error || 'Unable to load dataset. Please ensure the backend is running at http://127.0.0.1:8000.'}
          </p>
          <button
            onClick={fetchOverview}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const kpis = data.kpis || {};
  const monthly_trend = Array.isArray(data.monthly_trend) ? data.monthly_trend : [];
  const top_categories = Array.isArray(data.top_categories) ? data.top_categories : [];

  return (
    <div className="page-container">
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Revenue"
          value={formatBRL(kpis.total_revenue)}
          subtext="Verified delivered sales"
          deltaType="positive"
        />
        <KpiCard
          label="Total Orders"
          value={formatNum(kpis.total_orders)}
          subtext="Delivered transactions"
          deltaType="neutral"
        />
        <KpiCard
          label="Average Order Value"
          value={formatBRL(kpis.average_order_value)}
          subtext="Per delivered order"
          deltaType="neutral"
        />
        <KpiCard
          label="Total Customers"
          value={formatNum(kpis.total_customers)}
          subtext="Unique buyer IDs"
          deltaType="neutral"
        />
        <KpiCard
          label="Customer Satisfaction"
          value={`${kpis.avg_review_score || 0} / 5.0`}
          subtext="Verified reviews"
          deltaType="positive"
        />
        <KpiCard
          label="On-Time Delivery Rate"
          value={`${kpis.on_time_delivery_pct || 0}%`}
          subtext="Delivered by estimated date"
          deltaType="positive"
        />
      </div>

      {/* Main Charts */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Monthly Revenue & Orders Velocity</h3>
              <p className="chart-subtitle">Historical growth across the Brazilian market</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthly_trend} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={11} />
                <Tooltip
                  formatter={(val, name) => [
                    name === 'Revenue (BRL)' ? formatBRL(val) : formatNum(val),
                    name
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar yAxisId="left" dataKey="revenue" name="Revenue (BRL)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="orders" name="Order Volume" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Top 5 Product Categories</h3>
              <p className="chart-subtitle">Gross merchandise value contribution</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top_categories} layout="vertical" margin={{ top: 10, right: 30, left: 70, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category" stroke="#0f172a" fontSize={11} tickLine={false} width={120} />
                <Tooltip
                  formatter={(val) => [formatBRL(val), 'Revenue']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#0f172a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Monthly Performance Table */}
      <div className="table-card">
        <div className="table-header">
          <h3 className="table-title">Monthly Performance & Month-over-Month (MoM) Growth</h3>
        </div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th className="num-cell">Order Volume</th>
                <th className="num-cell">Revenue (BRL)</th>
                <th className="num-cell">MoM Revenue Growth</th>
                <th className="num-cell">Implied Monthly AOV</th>
              </tr>
            </thead>
            <tbody>
              {monthly_trend.map((row) => (
                <tr key={row.month}>
                  <td><strong>{row.month}</strong></td>
                  <td className="num-cell">{formatNum(row.orders)}</td>
                  <td className="num-cell">{formatBRL(row.revenue)}</td>
                  <td className="num-cell">
                    <span style={{ color: (row.revenue_mom_growth || 0) >= 0 ? '#059669' : '#dc2626', fontWeight: 600 }}>
                      {(row.revenue_mom_growth || 0) > 0 ? `+${row.revenue_mom_growth}%` : `${row.revenue_mom_growth || 0}%`}
                    </span>
                  </td>
                  <td className="num-cell">{formatBRL(row.revenue / (row.orders || 1))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
