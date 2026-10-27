import React from 'react';

export default function Header({ pageTitle, pageDesc }) {
  return (
    <header className="top-header">
      <div className="header-left">
        <h2 className="header-page-title">{pageTitle}</h2>
        <p className="header-page-desc">{pageDesc}</p>
      </div>

      <div className="header-right">
        <div className="badge-status">
          <span className="status-dot"></span>
          <span>Live Analytical Pipeline</span>
        </div>
      </div>
    </header>
  );
}
