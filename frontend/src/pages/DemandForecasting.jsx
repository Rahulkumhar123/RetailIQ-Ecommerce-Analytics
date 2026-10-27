import React, { useEffect, useState } from 'react';
import KpiCard from '../components/KpiCard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

export default function DemandForecasting() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchForecasting = () => {
    setLoading(true);
    setError(null);
    fetch('/api/forecasting')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (json && json.metrics) {
          setData(json);
        } else {
          throw new Error('Invalid forecasting data schema');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching forecasting data:', err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchForecasting();
  }, []);

  const formatNum = (val) => (val || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });

  if (loading) {
    return (
      <div className="page-container">
        <div className="state-loading">Loading Demand Forecasting Engine...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="page-container">
        <div className="state-loading" style={{ flexDirection: 'column', gap: '12px' }}>
          <div style={{ color: '#dc2626', fontWeight: 600, fontSize: '16px' }}>Failed to load Forecasting Engine</div>
          <p style={{ color: '#64748b', fontSize: '13px' }}>{error || 'Connection error'}</p>
          <button onClick={fetchForecasting} style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  const champion_model = data.champion_model || 'XGBoost Regressor';
  const test_period = data.test_period || 'Holdout Period';
  const metrics = data.metrics || {};
  const benchmark_comparison = Array.isArray(data.benchmark_comparison) ? data.benchmark_comparison : [];
  const recent_actual_vs_predicted = Array.isArray(data.recent_actual_vs_predicted) ? data.recent_actual_vs_predicted : [];
  const future_forecast = Array.isArray(data.future_forecast) ? data.future_forecast : [];
  const category_demand = Array.isArray(data.category_demand) ? data.category_demand : [];
  const limitations = Array.isArray(data.limitations) ? data.limitations : [];

  return (
    <div className="page-container">
      {/* Model Benchmark KPIs */}
      <div className="kpi-grid">
        <KpiCard
          label="Champion ML Model"
          value={champion_model}
          subtext="Gradient Boosted Decision Trees"
          deltaType="positive"
        />
        <KpiCard
          label="Holdout WAPE %"
          value={`${metrics.WAPE_pct || 0}%`}
          subtext="Weighted Absolute Percentage Error"
          deltaType="positive"
        />
        <KpiCard
          label="Holdout Test RMSE"
          value={formatNum(metrics.RMSE)}
          subtext="Root Mean Squared Error (Orders)"
          deltaType="neutral"
        />
        <KpiCard
          label="Holdout Test MAE"
          value={formatNum(metrics.MAE)}
          subtext="Mean Absolute Error (Orders)"
          deltaType="neutral"
        />
      </div>

      {/* Actual vs Predicted on Holdout Set & 12-Week Future Horizon */}
      <div className="charts-grid-2">
        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Holdout Test Set: Actual vs Predicted Demand</h3>
              <p className="chart-subtitle">Chronological validation ({test_period}) — Zero data leakage</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recent_actual_vs_predicted} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week_start" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 200', 'dataMax + 200']} />
                <Tooltip
                  formatter={(val, name) => [formatNum(val), name]}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Line type="monotone" dataKey="actual_orders" name="Actual Orders" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="predicted_orders" name="ML Predicted Orders" stroke="#2563eb" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">12-Week Out-of-Sample Demand Projection</h3>
              <p className="chart-subtitle">ML forecast with 80% confidence interval bounds</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={future_forecast} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week_start" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  formatter={(val, name) => [formatNum(val), name]}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Area type="monotone" dataKey="upper_bound_orders" name="Upper 80% Bound" stroke="#cbd5e1" fill="#f1f5f9" fillOpacity={0.6} />
                <Area type="monotone" dataKey="lower_bound_orders" name="Lower 80% Bound" stroke="#cbd5e1" fill="#ffffff" fillOpacity={1} />
                <Line type="monotone" dataKey="predicted_orders" name="Projected Orders" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Benchmark Leaderboard Table */}
      <div className="table-card">
        <div className="table-header">
          <h3 className="table-title">Forecasting Model Benchmark Leaderboard (Holdout Test Evaluation)</h3>
        </div>
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Model Architecture</th>
                <th>Model Family</th>
                <th className="num-cell">MAE (Orders)</th>
                <th className="num-cell">RMSE (Orders)</th>
                <th className="num-cell">MAPE %</th>
                <th className="num-cell">WAPE %</th>
                <th className="num-cell">R² Score</th>
              </tr>
            </thead>
            <tbody>
              {benchmark_comparison.map((m) => (
                <tr key={m.Model} style={{ backgroundColor: m.Model.includes('Champion') ? '#f0fdf4' : 'inherit' }}>
                  <td>
                    <strong>{m.Model}</strong>
                    {m.Model.includes('Champion') && <span style={{ marginLeft: '8px', color: '#059669', fontSize: '11px', fontWeight: 'bold' }}>[CHAMPION]</span>}
                  </td>
                  <td>{m.Type}</td>
                  <td className="num-cell">{m.MAE}</td>
                  <td className="num-cell">{m.RMSE}</td>
                  <td className="num-cell">{m.MAPE_pct}%</td>
                  <td className="num-cell"><strong>{m.WAPE_pct}%</strong></td>
                  <td className="num-cell">{m.R2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Projections & Limitations */}
      <div className="charts-grid-2">
        <div className="table-card">
          <div className="table-header">
            <h3 className="table-title">Top Category Weekly Demand Projections</h3>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="num-cell">Historical Wkly Units</th>
                  <th className="num-cell">Projected Demand</th>
                  <th className="num-cell">Expected Growth</th>
                </tr>
              </thead>
              <tbody>
                {category_demand.map((c) => (
                  <tr key={c.category}>
                    <td><strong>{c.category}</strong></td>
                    <td className="num-cell">{c.historical_weekly_units}</td>
                    <td className="num-cell">{c.projected_weekly_demand}</td>
                    <td className="num-cell" style={{ color: '#059669', fontWeight: 600 }}>+{c.growth_trend_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div>
              <h3 className="chart-title">Model Scope, Assumptions & Limitations</h3>
              <p className="chart-subtitle">Production considerations for e-commerce demand forecasting</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#475569' }}>
            {limitations.map((lim, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>•</span>
                <p>{lim}</p>
              </div>
            ))}
            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <strong>Interview Note:</strong> Time-series splits are strictly chronological. Never use k-fold cross-validation or random train-test splits on temporal retail data because future data leaking into the past produces artificially high R² scores that fail in production.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
