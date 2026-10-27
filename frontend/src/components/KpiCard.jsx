import React from 'react';

export default function KpiCard({ label, value, subtext, deltaType = 'neutral' }) {
  let deltaClass = 'kpi-delta-neutral';
  if (deltaType === 'positive') deltaClass = 'kpi-delta-positive';

  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {subtext && <div className={`kpi-subtext ${deltaClass}`}>{subtext}</div>}
    </div>
  );
}
