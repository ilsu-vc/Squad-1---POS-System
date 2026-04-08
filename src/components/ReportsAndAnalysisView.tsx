'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Clock,
  Coffee,
  CreditCard,
  Tag
} from 'lucide-react';

import HourlySalesReportView from './HourlySalesReportView';
import ProductPerformanceReportView from './ProductPerformanceReportView';
import PaymentMethodReportView from './PaymentMethodReportView';
import DiscountUsageReportView from './DiscountUsageReportView';
import DailySummaryDashboard from './DailySummaryDashboard';
import { Transaction } from '../utils/chartHelpers';
import { UserProfile } from '../types/auth';

interface ReportsAndAnalysisViewProps {
  transactions: Transaction[];
  profile: UserProfile | null;
}

const TABS = [
  { id: 'daily-summary', label: 'Summary', icon: LayoutDashboard },
  { id: 'hourly', label: 'Hourly', icon: Clock },
  { id: 'product', label: 'Products', icon: Coffee },
  { id: 'payment', label: 'Payments', icon: CreditCard },
  { id: 'discount', label: 'Discounts', icon: Tag },
];

const THEME = {
  navy: '#1b2a47',
  teal: '#01a2ad',
  ice: '#f9fbfc',
  white: '#ffffff',
  gray: '#e2e8f0',
};

const ReportsAndAnalysisView: React.FC<ReportsAndAnalysisViewProps> = ({ transactions, profile }) => {
  const [activeReport, setActiveReport] = useState<string>('daily-summary');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedReport = localStorage.getItem('pos_active_report_tab');
    if (savedReport) setActiveReport(savedReport);
  }, []);

  const handleSwitchReport = (reportValue: string) => {
    setActiveReport(reportValue);
    localStorage.setItem('pos_active_report_tab', reportValue);
  };

  if (!isMounted) return null;

  return (
    <>
      <style jsx global>{`
        .reports-analysis-scroll-panel {
          scroll-behavior: smooth;
        }

        .reports-analysis-scroll-panel::-webkit-scrollbar {
          width: 6px;
        }

        .reports-analysis-scroll-panel::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          backgroundColor: THEME.ice,
          height: '90vh',
          padding: '32px 20px',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '1000px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          <header style={{ marginBottom: '24px', flexShrink: 0 }}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                color: THEME.teal,
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '1.5px',
                marginBottom: '6px'
              }}
            >
              SYSTEM TERMINAL
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: '900',
                color: THEME.navy,
                letterSpacing: '-1px'
              }}
            >
              Reports & Analysis
            </motion.h1>
          </header>

          <nav
            style={{
              display: 'flex',
              backgroundColor: '#eaeff5',
              padding: '8px',
              borderRadius: '20px',
              gap: '8px',
              marginBottom: '20px',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)',
              border: `1px solid ${THEME.gray}`,
              flexShrink: 0,
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeReport === tab.id;
              const Icon = tab.icon;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => handleSwitchReport(tab.id)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    position: 'relative',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '14px',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isActive ? THEME.white : THEME.navy,
                    fontWeight: '700',
                    fontSize: '14px',
                    outline: 'none',
                    zIndex: 1,
                  }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="posIndicator"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: THEME.teal,
                        borderRadius: '14px',
                        boxShadow: '0 8px 20px -6px rgba(1, 162, 173, 0.4)',
                        zIndex: -1
                      }}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}

                  <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                  <span style={{ transition: 'opacity 0.2s' }}>{tab.label}</span>
                </motion.button>
              );
            })}
          </nav>

          <main
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              overflow: 'hidden',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeReport}
                className="reports-analysis-scroll-panel"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  backgroundColor: THEME.white,
                  padding: '40px',
                  borderRadius: '28px',
                  border: `1px solid ${THEME.gray}`,
                  boxShadow: '0 25px 50px -12px rgba(27, 42, 71, 0.06)',
                  width: '100%',
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  boxSizing: 'border-box',
                }}
              >
                {activeReport === 'daily-summary' && (
                  <DailySummaryDashboard transactions={transactions} />
                )}

                {activeReport === 'hourly' && (
                  <HourlySalesReportView onSwitchReport={handleSwitchReport} profile={profile} />
                )}

                {activeReport === 'product' && ProductPerformanceReportView && (
                  <ProductPerformanceReportView
                    transactions={transactions}
                    onSwitchReport={handleSwitchReport}
                  />
                )}

                {activeReport === 'payment' && (
                  <PaymentMethodReportView onSwitchReport={handleSwitchReport} />
                )}

                {activeReport === 'discount' && (
                  <DiscountUsageReportView onSwitchReport={handleSwitchReport} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </motion.div>
    </>
  );
};

export default ReportsAndAnalysisView;