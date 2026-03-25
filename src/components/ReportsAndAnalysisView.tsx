'use client';

import React, { useState, useEffect } from 'react';
import HourlySalesReportView from './HourlySalesReportView';
import ProductPerformanceReportView from './ProductPerformanceReportView';
import PaymentMethodReportView from './PaymentMethodReportView';
import DiscountUsageReportView from './DiscountUsageReportView';
import DailySummaryDashboard from './DailySummaryDashboard';
import { Transaction } from '../utils/chartHelpers';

interface ReportsAndAnalysisViewProps {
  transactions: Transaction[];
}

const ReportsAndAnalysis = ({ transactions }: ReportsAndAnalysisViewProps) => {
  const [activeReport, setActiveReport] = useState<string>('hourly');
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const NAVBAR_HEIGHT = 106;
  const HAMBURGER_RIGHT_OFFSET = 32;
  const HAMBURGER_TOP_OFFSET = 10;

  useEffect(() => {
    setIsMounted(true);
    const savedReport = localStorage.getItem('pos_active_report_tab');
    if (savedReport) {
      setActiveReport(savedReport);
    }
  }, []);

  const handleSwitchReport = (reportValue: string) => {
    setActiveReport(reportValue);
    localStorage.setItem('pos_active_report_tab', reportValue);
    setIsSidebarOpen(false);
  };

  if (!isMounted) return null;

  const getMenuItemStyle = (reportName: string): React.CSSProperties => ({
    padding: '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    color: activeReport === reportName ? '#2563eb' : '#0f172a',
    fontWeight: '500',
    backgroundColor: activeReport === reportName ? '#eff6ff' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px'
  });

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: 'fixed',
            top: `${NAVBAR_HEIGHT + HAMBURGER_TOP_OFFSET}px`,
            right: `${HAMBURGER_RIGHT_OFFSET}px`,
            zIndex: 1001,
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '4px'
          }}
          aria-label="Open Reports Menu"
        >
          <div style={{ width: '26px', height: '3px', backgroundColor: '#1e293b', borderRadius: '2px' }} />
          <div style={{ width: '26px', height: '3px', backgroundColor: '#1e293b', borderRadius: '2px' }} />
          <div style={{ width: '26px', height: '3px', backgroundColor: '#1e293b', borderRadius: '2px' }} />
        </button>
      )}

      {activeReport === 'hourly' && (
        <HourlySalesReportView onSwitchReport={handleSwitchReport} />
      )}

      {activeReport === 'product' && (
        <ProductPerformanceReportView onSwitchReport={handleSwitchReport} transactions={transactions} />
      )}

      {activeReport === 'payment' && (
        <PaymentMethodReportView onSwitchReport={handleSwitchReport} />
      )}

      {activeReport === 'discount' && (
        <DiscountUsageReportView onSwitchReport={handleSwitchReport} />
      )}

      {activeReport === 'daily-summary' && (
        <DailySummaryDashboard onSwitchReport={handleSwitchReport} transactions={transactions} />
      )}

      {isSidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: `${NAVBAR_HEIGHT}px`,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 999
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        style={{
          position: 'fixed',
          top: `${NAVBAR_HEIGHT}px`,
          right: 0,
          width: '340px',
          height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          boxSizing: 'border-box',
          backgroundColor: 'white',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.05)',
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          zIndex: 1000,
          padding: '24px',
          pointerEvents: isSidebarOpen ? 'auto' : 'none',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px'
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              margin: 0,
              color: '#1e293b',
              fontWeight: 'bold'
            }}
          >
            Reports Menu
          </h2>

          <button
            onClick={() => setIsSidebarOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '32px',
              cursor: 'pointer',
              color: '#64748b',
              lineHeight: 1
            }}
            aria-label="Close Reports Menu"
          >
            &times;
          </button>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li onClick={() => handleSwitchReport('daily-summary')} style={getMenuItemStyle('daily-summary')}>
            📊 Daily Summary Dashboard
          </li>
          <li onClick={() => handleSwitchReport('hourly')} style={getMenuItemStyle('hourly')}>
            🕒 Hourly Sales Report
          </li>
          <li onClick={() => handleSwitchReport('product')} style={getMenuItemStyle('product')}>
            ☕ Product Performance
          </li>
          <li onClick={() => handleSwitchReport('payment')} style={getMenuItemStyle('payment')}>
            💳 Payment Methods
          </li>
          <li onClick={() => handleSwitchReport('discount')} style={getMenuItemStyle('discount')}>
            🏷️ Discount Usage
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ReportsAndAnalysis;