'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/numberformatters';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './PaymentMethodReportView.css';

interface Transaction {
  id: string;
  payment_method: string;
  total_amount: number;
  created_at: string;
}

interface PaymentStats {
  method: string;
  count: number;
  totalAmount: number;
  prevAmount: number;
  percentage: number;
  color: string;
}

interface Props {
  onSwitchReport?: (report: string) => void;
}

const PaymentMethodReportView: React.FC<Props> = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<number>(30);
  const [chartKey, setChartKey] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const colors: Record<string, string> = {
    Cash: '#1b2a47',
    Mobile: '#314566',
    Card: '#4a6288',
    Split: '#6b83ab',
    Other: '#90a7cb',
  };

  const fetchPaymentData = async () => {
    try {
      setLoading(true);

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - dateRange * 2);
      const startDate = targetDate.toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select('id, payment_method, total_amount, created_at')
        .gte('created_at', startDate);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching payment stats:', err);
    } finally {
      setLoading(false);
      setChartKey((prev) => prev + 1);
    }
  };

  useEffect(() => {
    fetchPaymentData();
  }, [dateRange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const aggregatedData = useMemo(() => {
    const statsMap = new Map<string, PaymentStats>();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateRange);

    let totalCurrentRevenue = 0;

    transactions.forEach((t) => {
      const method = t.payment_method
        ? t.payment_method.charAt(0).toUpperCase() + t.payment_method.slice(1).toLowerCase()
        : 'Other';

      if (!statsMap.has(method)) {
        statsMap.set(method, {
          method,
          count: 0,
          totalAmount: 0,
          prevAmount: 0,
          percentage: 0,
          color: colors[method] || colors.Other,
        });
      }

      const stat = statsMap.get(method)!;
      const tDate = new Date(t.created_at);

      if (tDate >= cutoffDate) {
        stat.count += 1;
        stat.totalAmount += Number(t.total_amount);
        totalCurrentRevenue += Number(t.total_amount);
      } else {
        stat.prevAmount += Number(t.total_amount);
      }
    });

    const finalStats = Array.from(statsMap.values())
      .map((stat) => ({
        ...stat,
        percentage: totalCurrentRevenue > 0 ? (stat.totalAmount / totalCurrentRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return finalStats.filter((stat) => stat.totalAmount > 0);
  }, [transactions, dateRange]);

  const renderTrend = (current: number, previous: number) => {
    if (previous === 0 && current > 0) {
      return <span className="pmrv-trend up">↑ New</span>;
    }

    if (previous === 0 && current === 0) return null;

    const percentChange = ((current - previous) / previous) * 100;

    if (percentChange > 0) {
      return <span className="pmrv-trend up">↑{percentChange.toFixed(1)}% vs prior</span>;
    }

    if (percentChange < 0) {
      return <span className="pmrv-trend down">↓{Math.abs(percentChange).toFixed(1)}% vs prior</span>;
    }

    return <span className="pmrv-trend neutral">0%</span>;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="pmrv-tooltip">
          <p className="pmrv-tooltip-text" style={{ margin: 0 }}>
            {data.method}: {formatCurrency(data.totalAmount)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pmrv-view pmrv-rise-up">
      <div className="pmrv-shell">
        <div className="pmrv-header">
          <div>
            <p className="pmrv-eyebrow">REPORTING</p>
            <h1 className="pmrv-title">Payment Method Analysis</h1>
            <p className="pmrv-subtitle">Customer checkout preferences & trends</p>
          </div>

          <div className="pmrv-filter-wrap">
            <span className="pmrv-filter-label">Date Range</span>

            <div className="custom-dropdown-container pmrv-dropdown-container" ref={dropdownRef}>
              <button
                type="button"
                className={`custom-dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
              >
                {dateRange === 1 ? 'Daily' : dateRange === 7 ? 'Last 7 Days' : dateRange === 30 ? 'Last 30 Days' : 'Last 90 Days'}
                <svg
                  className="dropdown-chevron"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="custom-dropdown-menu">
                  <div
                    className={`dropdown-item ${dateRange === 1 ? 'selected' : ''}`}
                    onClick={() => {
                      setDateRange(1);
                      setIsDropdownOpen(false);
                    }}
                  >
                    Daily
                  </div>
                  <div
                    className={`dropdown-item ${dateRange === 7 ? 'selected' : ''}`}
                    onClick={() => {
                      setDateRange(7);
                      setIsDropdownOpen(false);
                    }}
                  >
                    Last 7 Days
                  </div>
                  <div
                    className={`dropdown-item ${dateRange === 30 ? 'selected' : ''}`}
                    onClick={() => {
                      setDateRange(30);
                      setIsDropdownOpen(false);
                    }}
                  >
                    Last 30 Days
                  </div>
                  <div
                    className={`dropdown-item ${dateRange === 90 ? 'selected' : ''}`}
                    onClick={() => {
                      setDateRange(90);
                      setIsDropdownOpen(false);
                    }}
                  >
                    Last 90 Days
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="inline-loading-container">
            <div className="inline-spinner"></div>
            <div className="inline-loading-text">Loading payment data...</div>
          </div>
        ) : (
          <div className="pmrv-main-grid">
            <div className="pmrv-chart-card pmrv-surface pmrv-surface-hover">
              <div className="pmrv-card-head">
                <h3 className="pmrv-card-title">Revenue Distribution</h3>
              </div>

              <div className="pmrv-chart-area">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart key={chartKey}>
                    <Pie
                      data={aggregatedData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="totalAmount"
                      nameKey="method"
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive={true}
                    >
                      {aggregatedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="recharts-pie-sector" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="pmrv-legend">
                {aggregatedData.map((stat) => (
                  <div key={stat.method} className="pmrv-legend-item">
                    <div
                      className="pmrv-legend-dot"
                      style={{ backgroundColor: stat.color }}
                    />
                    <span>
                      {stat.method} ({stat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pmrv-table-card pmrv-surface pmrv-surface-hover">
              <div className="pmrv-card-head">
                <h3 className="pmrv-card-title">Payment Method Breakdown</h3>
              </div>

              <div className="pmrv-table-wrap">
                <table className="pmrv-table">
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th className="align-right">Transaction Count</th>
                      <th className="align-right">Total Amount</th>
                      <th className="align-right">% of Rev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedData.map((stat) => (
                      <tr key={stat.method}>
                        <td className="pmrv-method-cell">
                          <div
                            className="pmrv-method-dot"
                            style={{ backgroundColor: stat.color }}
                          />
                          {stat.method}
                        </td>
                        <td className="align-right">{stat.count}</td>
                        <td className="align-right strong">
                          {formatCurrency(stat.totalAmount)}
                          <div className="pmrv-trend-wrap">{renderTrend(stat.totalAmount, stat.prevAmount)}</div>
                        </td>
                        <td className="align-right muted">
                          {stat.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}

                    {!loading && aggregatedData.length === 0 && (
                      <tr>
                        <td colSpan={4} className="pmrv-empty-cell">
                          No payment data found for this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodReportView;