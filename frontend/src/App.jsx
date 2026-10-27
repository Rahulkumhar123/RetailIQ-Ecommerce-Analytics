import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './pages/Overview';
import SalesAnalytics from './pages/SalesAnalytics';
import DemandForecasting from './pages/DemandForecasting';
import CustomerIntelligence from './pages/CustomerIntelligence';
import ProductPerformance from './pages/ProductPerformance';

export default function App() {
  const [activePage, setActivePage] = useState('overview');

  const pageMeta = {
    overview: {
      title: 'Executive Overview',
      desc: 'High-level business KPIs, monthly sales velocity, and gross merchandise revenue'
    },
    sales: {
      title: 'Sales & Revenue Analytics',
      desc: 'Category performance, regional Brazilian state distribution, and ticket size evolution'
    },
    forecasting: {
      title: 'ML Demand Forecasting',
      desc: 'Machine learning order demand forecasting, baseline comparisons, and future horizon projections'
    },
    customers: {
      title: 'Customer Intelligence & RFM',
      desc: 'Recency-Frequency-Monetary segmentation, K-Means clustering, and Customer Lifetime Value'
    },
    products: {
      title: 'Product Performance & Logistics',
      desc: 'Category economics, delivery delay risk analysis, satisfaction ratings, and strategic initiatives'
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <Overview />;
      case 'sales':
        return <SalesAnalytics />;
      case 'forecasting':
        return <DemandForecasting />;
      case 'customers':
        return <CustomerIntelligence />;
      case 'products':
        return <ProductPerformance />;
      default:
        return <Overview />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="main-wrapper">
        <Header
          pageTitle={pageMeta[activePage].title}
          pageDesc={pageMeta[activePage].desc}
        />
        <main>{renderPage()}</main>
      </div>
    </div>
  );
}
