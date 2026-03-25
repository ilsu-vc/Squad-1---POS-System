'use client';

import React, { useEffect, useState, useMemo } from 'react';
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

  const colors: Record<string, string> = {
    Cash: '#10b981',
    Mobile: '#3b82f6',
    Card: '#1b2a47',
    Split: '#8b5cf6',
    Other: '#cbd5e1'
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
          color: colors[method] || colors.Other
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
        percentage: totalCurrentRevenue > 0 ? (stat.totalAmount / totalCurrentRevenue) * 100 : 0
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return finalStats.filter((stat) => stat.totalAmount > 0);
  }, [transactions, dateRange]);

  const renderTrend = (current: number, previous: number) => {
    if (previous === 0 && current > 0) {
      return (
        <span style={{ color: '#059669', fontSize: '12px', marginLeft: '8px' }}>
          ↑ New
        </span>
      );
    }

    if (previous === 0 && current === 0) return null;

    const percentChange = ((current - previous) / previous) * 100;

    if (percentChange > 0) {
      return (
        <span style={{ color: '#059669', fontSize: '12px', marginLeft: '8px' }}>
          ↑{percentChange.toFixed(1)}% vs prior
        </span>
      );
    }

    if (percentChange < 0) {
      return (
        <span style={{ color: '#ef4444', fontSize: '12px', marginLeft: '8px' }}>
          ↓{Math.abs(percentChange).toFixed(1)}% vs prior
        </span>
      );
    }

    return (
      <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>
        0%
      </span>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="recharts-tooltip">
          <p className="recharts-tooltip-item" style={{ margin: 0 }}>
            {data.method}: {formatCurrency(data.totalAmount)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        padding: '30px',
        maxWidth: '1000px',
        margin: '0 auto',
        fontFamily: 'Inter, system-ui, sans-serif',
        backgroundColor: 'transparent'
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '30px'
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1e293b',
              margin: '0 0 8px 0'
            }}
          >
            Payment Method Analysis
          </h1>
          <p style={{ color: '#64748b', margin: '0', fontSize: '13px' }}>
            Customer checkout preferences & trends
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: '#64748b' }}>Date Range:</span>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '180px',
              outline: 'none',
              color: '#0f172a'
            }}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="inline-loading-container">
          <div className="inline-spinner"></div>
          <div className="inline-loading-text">Loading payment data...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          <div
            style={{
              flex: '1',
              minWidth: '300px',
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: '#334155',
                marginBottom: '18px',
                fontWeight: '600',
                alignSelf: 'flex-start'
              }}
            >
              Revenue Distribution
            </div>

            <div style={{ width: '100%', height: '260px', marginTop: '10px' }}>
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

            <div
              style={{
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                marginTop: '10px'
              }}
            >
              {aggregatedData.map((stat) => (
                <div
                  key={stat.method}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#475569'
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '3px',
                      backgroundColor: stat.color
                    }}
                  />
                  <span>
                    {stat.method} ({stat.percentage.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              flex: '2',
              minWidth: '400px',
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0'
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: '#334155',
                marginBottom: '18px',
                fontWeight: '600'
              }}
            >
              Payment Method Breakdown
            </div>

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
                textAlign: 'left'
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                  <th style={{ padding: '12px 8px' }}>Method</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Transaction Count</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Amount</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>% of Rev</th>
                </tr>
              </thead>
              <tbody>
                {aggregatedData.map((stat) => (
                  <tr key={stat.method} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td
                      style={{
                        padding: '16px 8px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        color: '#0f172a'
                      }}
                    >
                      <div
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: stat.color
                        }}
                      />
                      {stat.method}
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'right', color: '#475569' }}>
                      {stat.count}
                    </td>
                    <td
                      style={{
                        padding: '16px 8px',
                        textAlign: 'right',
                        color: '#0f172a',
                        fontWeight: '500'
                      }}
                    >
                      {formatCurrency(stat.totalAmount)}
                      <div style={{ marginTop: '4px' }}>{renderTrend(stat.totalAmount, stat.prevAmount)}</div>
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'right', color: '#64748b' }}>
                      {stat.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}

                {!loading && aggregatedData.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                      No payment data found for this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodReportView;