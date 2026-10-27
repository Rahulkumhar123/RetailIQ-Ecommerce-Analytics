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

export default function ProductPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = () => {
    setLoading(true);
    setError(null);
    fetch('/api/products')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (json && json.top_categories) {
          setData(json);
        } else {
          throw new Error('Invalid product performance schema');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching product data:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const formatNum = (val) => (val || 0).toLocaleString('en-US');
  const formatBRL = (val) => `R$ ${(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="page-container">
        <div className="state-loading">Loading Product Performance...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <div className="state-loading" style={{ flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '16px' }}>Failed to load Product Performance</div>
          <p style={{ color: '#64748b', fontSize: '13px' }}>{error || 'Connection error'}</p>
          <button onClick={fetchProducts} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  const total_categories = data.total_categories || 0;
  const total_product_revenue = data.total_product_revenue || 0;
  const top_5_revenue_pct = data.top_5_revenue_pct || 0;
  const top_10_revenue_pct = data.top_10_revenue_pct || 0;
  const top_categories = Array.isArray(data.top_categories) ? data.top_categories : [];
  const business_recommendations = Array.isArray(data.business_recommendations) ? data.business_recommendations : [];

  return (
    <div className="page-container">
      {/* Product KPIs */}
      <div className="kpi-grid">
        <KpiCard
          label="Total Product Categories"
          value={total_categories}
          subtext="Catalog categories"
          deltaType="neutral"
        />
        <KpiCard
          label="Gross Product Revenue"
          value={formatBRL(total_product_revenue)}
          subtext="Item merchandise sales"
          deltaType="positive"
        />
        <KpiCard
          label="Top 5 Concentration"
          value={`${top_5_revenue_pct}%`}
          subtext="Share of total merchandise"
          deltaType="neutral"
        />
        <KpiCard
          label="Top 10 Concentration"
          value={`${top_10_revenue_pct}%`}
          subtext="Pareto principle verified"
          deltaType="neutral"
        />
      </div>

      {/* Review Ratings vs Late Delivery Rates */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Customer Satisfaction by Category</h3>
              <p className="chart-subtitle">Average review rating (out of 5.0) for top 10 categories</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top_categories} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[3.5, 4.5]} stroke="#64748b" fontSize={11} />
                <YAxis type="category" dataKey="product_category_name_english" stroke="#0f172a" fontSize={10} tickLine={false} width={130} />
                <Tooltip
                  formatter={(val) => [`${val} / 5.0`, 'Avg Rating']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="avg_review_score" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Late Delivery Rate by Category</h3>
              <p className="chart-subtitle">% of delivered orders arriving after estimated date</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top_categories} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="product_category_name_english" stroke="#0f172a" fontSize={10} tickLine={false} width={130} />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Late Delivery Rate']}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Bar dataKey="late_delivery_rate" fill="#d97706" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Categories Detailed Table */}
      <div className="table-card">
        <div className="table-header">
          <h3 className="table-title">Top Product Categories Performance Matrix</h3>
        </div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Category</th>
                <th className="num-cell">Units Sold</th>
                <th className="num-cell">Total Revenue (BRL)</th>
                <th className="num-cell">Avg Price</th>
                <th className="num-cell">Avg Freight</th>
                <th className="num-cell">Freight Ratio %</th>
                <th className="num-cell">Satisfaction</th>
                <th className="num-cell">Late Rate %</th>
              </tr>
            </thead>
            <tbody>
              {top_categories.map((cat) => (
                <tr key={cat.product_category_name_english}>
                  <td><strong>#{cat.rank}</strong></td>
                  <td><strong>{cat.product_category_name_english}</strong></td>
                  <td className="num-cell">{formatNum(cat.units_sold)}</td>
                  <td className="num-cell">{formatBRL(cat.total_item_revenue)}</td>
                  <td className="num-cell">{formatBRL(cat.avg_item_price)}</td>
                  <td className="num-cell">{formatBRL(cat.avg_freight)}</td>
                  <td className="num-cell">{cat.freight_ratio_pct}%</td>
                  <td className="num-cell">{cat.avg_review_score} ★</td>
                  <td className="num-cell">
                    <span style={{ color: cat.late_delivery_rate > 8.0 ? '#dc2626' : '#059669', fontWeight: 600 }}>
                      {cat.late_delivery_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategic Business Recommendations */}
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
          Strategic Business Recommendations
        </h3>
        <div className="recom-grid">
          {business_recommendations.map((rec, i) => (
            <div key={i} className="recom-card">
              <span className="recom-tag">{rec.category} • {rec.type}</span>
              <h4 className="recom-title">{rec.observation}</h4>
              <div className="recom-action">
                <strong>Recommended Initiative:</strong> {rec.action}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
