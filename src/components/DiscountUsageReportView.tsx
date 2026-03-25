'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/numberformatters';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Transaction {
  id: string;
  total_amount: number;
  discount_amount: number;
  discount_type: string;
  created_at: string;
  cashier_name: string;
}

interface Props {
  onSwitchReport?: (report: string) => void;
}

const DiscountUsageReportView: React.FC<Props> = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<number>(30);
  const [chartKey, setChartKey] = useState(0);

  const PIE_COLORS = ['#1b2a47', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const fetchDiscountData = async () => {
    try {
      setLoading(true);

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - dateRange);
      const startDate = targetDate.toISOString();

      const { data, error } = await supabase
        .from('transactions')
        .select('id, total_amount, discount_amount, discount_type, created_at, cashier_name')
        .gte('created_at', startDate)
        .gt('discount_amount', 0);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching discount data:', err);
    } finally {
      setLoading(false);
      setChartKey((prev) => prev + 1);
    }
  };

  useEffect(() => {
    fetchDiscountData();
  }, [dateRange]);

  const { kpis, typeData, staffData } = useMemo(() => {
    let totalDiscount = 0;
    const typeMap = new Map<string, { count: number; value: number }>();
    const staffMap = new Map<string, { count: number; value: number }>();

    transactions.forEach((t) => {
      const discount = Number(t.discount_amount);
      totalDiscount += discount;

      const type = t.discount_type || 'Unspecified';
      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, value: 0 });
      }
      const typeStat = typeMap.get(type)!;
      typeStat.count += 1;
      typeStat.value += discount;

      const cashier = t.cashier_name || 'Unknown Staff';
      if (!staffMap.has(cashier)) {
        staffMap.set(cashier, { count: 0, value: 0 });
      }
      const staffStat = staffMap.get(cashier)!;
      staffStat.count += 1;
      staffStat.value += discount;
    });

    const typeChartData = Array.from(typeMap.entries())
      .map(([name, stats], index) => ({
        name,
        value: stats.value,
        count: stats.count,
        color: PIE_COLORS[index % PIE_COLORS.length],
        percentage: totalDiscount > 0 ? (stats.value / totalDiscount) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    const staffChartData = Array.from(staffMap.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        value: stats.value
      }))
      .sort((a, b) => b.value - a.value);

    return {
      kpis: {
        totalDiscount,
        totalCount: transactions.length,
        avgPerTransaction: transactions.length ? totalDiscount / transactions.length : 0
      },
      typeData: typeChartData,
      staffData: staffChartData
    };
  }, [transactions]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="recharts-tooltip"
          style={{
            backgroundColor: 'white',
            padding: '10px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
          }}
        >
          <p
            className="recharts-tooltip-item"
            style={{
              margin: 0,
              color: '#1e293b',
              fontWeight: '500',
              fontSize: '13px'
            }}
          >
            {data.name}: {formatCurrency(data.value)}
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
            Discount Usage Report
          </h1>
          <p style={{ color: '#64748b', margin: '0', fontSize: '13px' }}>
            Monitor discount impact and metrics
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
          <div className="inline-loading-text">Loading discount data...</div>
        </div>
      ) : (
        <div style={{ opacity: 1, transition: 'opacity 0.3s ease' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0'
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: '500'
                }}
              >
                Total Discounts Given
              </p>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#ef4444' }}>
                {formatCurrency(kpis.totalDiscount)}
              </h3>
            </div>

            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0'
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: '500'
                }}
              >
                Discounted Transactions
              </p>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>
                {kpis.totalCount}
              </h3>
            </div>

            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0'
              }}
            >
              <p
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '13px',
                  color: '#64748b',
                  fontWeight: '500'
                }}
              >
                Avg Discount Amount
              </p>
              <h3 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>
                {formatCurrency(kpis.avgPerTransaction)}
              </h3>
            </div>
          </div>

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
                Discount Distribution
              </div>

              <div style={{ width: '100%', height: '260px', marginTop: '10px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart key={chartKey}>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      startAngle={90}
                      endAngle={-270}
                      isAnimationActive={true}
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
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
                {typeData.map((stat) => (
                  <div
                    key={stat.name}
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
                      {stat.name} ({stat.percentage.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                flex: '2',
                minWidth: '400px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              <div
                style={{
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
                  Discount Type Breakdown
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
                      <th style={{ padding: '12px 8px' }}>Type</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Transactions</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Value</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeData.map((stat) => (
                      <tr key={stat.name} style={{ borderBottom: '1px solid #f8fafc' }}>
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
                          {stat.name}
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
                          {formatCurrency(stat.value)}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right', color: '#64748b' }}>
                          {stat.percentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}

                    {typeData.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}
                        >
                          No discounts applied in this date range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '18px'
                  }}
                >
                  <div
                    style={{
                      fontSize: '16px',
                      color: '#334155',
                      fontWeight: '600'
                    }}
                  >
                    Staff Audit (Discount Frequency)
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      backgroundColor: '#fee2e2',
                      color: '#ef4444',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}
                  >
                    Abuse Tracking
                  </span>
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
                      <th style={{ padding: '12px 8px' }}>Cashier Name</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Discount Uses</th>
                      <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Discount Given</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffData.map((staff) => (
                      <tr key={staff.name} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td
                          style={{
                            padding: '16px 8px',
                            fontWeight: '500',
                            color: '#0f172a'
                          }}
                        >
                          {staff.name}
                        </td>
                        <td style={{ padding: '16px 8px', textAlign: 'right', color: '#475569' }}>
                          {staff.count}
                        </td>
                        <td
                          style={{
                            padding: '16px 8px',
                            textAlign: 'right',
                            color: '#ef4444',
                            fontWeight: '500'
                          }}
                        >
                          {formatCurrency(staff.value)}
                        </td>
                      </tr>
                    ))}

                    {staffData.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}
                        >
                          No staff data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountUsageReportView;