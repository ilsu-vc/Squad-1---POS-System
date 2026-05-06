'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { salesApi } from '../services/salesApi';
import { formatCurrency } from '../utils/numberformatters';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import './DiscountUsageReportView.css';

interface Transaction {
  id: string;
  rawAmount: number;
  discountAmount: number;
  discountType: string;
  createdAt: string;
  cashierName?: string;
}

interface Props {
  onSwitchReport?: (report: string) => void;
}

const DiscountUsageReportView: React.FC<Props> = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<number>(30);
  const [chartKey, setChartKey] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const PIE_COLORS = ['#1b2a47', '#314566', '#4a6288', '#6b83ab', '#90a7cb'];

  const fetchDiscountData = async () => {
    try {
      setLoading(true);

      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - dateRange);
      const startDate = targetDate.toISOString();

      const result = await salesApi.fetchTransactions(startDate);
      // Filter only transactions with discounts locally to be safe, or assume backend handles it
      const discounted = (result.transactions || []).filter((t: any) => t.discountAmount > 0);
      setTransactions(discounted);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { kpis, typeData, staffData } = useMemo(() => {
    let totalDiscount = 0;
    const typeMap = new Map<string, { count: number; value: number }>();
    const staffMap = new Map<string, { count: number; value: number }>();

    transactions.forEach((t) => {
      const discount = Number(t.discountAmount);
      totalDiscount += discount;

      const type = t.discountType || 'Unspecified';
      if (!typeMap.has(type)) {
        typeMap.set(type, { count: 0, value: 0 });
      }
      const typeStat = typeMap.get(type)!;
      typeStat.count += 1;
      typeStat.value += discount;

      const cashier = t.cashierName || 'Unknown Staff';
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
        percentage: totalDiscount > 0 ? (stats.value / totalDiscount) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    const staffChartData = Array.from(staffMap.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        value: stats.value,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      kpis: {
        totalDiscount,
        totalCount: transactions.length,
        avgPerTransaction: transactions.length ? totalDiscount / transactions.length : 0,
      },
      typeData: typeChartData,
      staffData: staffChartData,
    };
  }, [transactions]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="durv-tooltip">
          <p className="durv-tooltip-text">
            {data.name}: {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="durv-view durv-rise-up">
      <div className="durv-shell">
        <div className="durv-header">
          <div>
            <p className="durv-eyebrow">REPORTING</p>
            <h1 className="durv-title">Discount Usage Report</h1>
            <p className="durv-subtitle">Monitor discount impact and discount behavior across transactions.</p>
          </div>

          <div className="durv-filter-wrap">
            <span className="durv-filter-label">Date Range</span>

            <div className="custom-dropdown-container durv-dropdown-container" ref={dropdownRef}>
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
            <div className="inline-loading-text">Loading discount data...</div>
          </div>
        ) : (
          <>
            <div className="durv-kpi-grid">
              <div className="durv-kpi-card durv-surface durv-surface-hover">
                <p className="durv-kpi-label">Total Discounts Given</p>
                <h3 className="durv-kpi-value durv-kpi-value-accent">
                  {formatCurrency(kpis.totalDiscount)}
                </h3>
              </div>

              <div className="durv-kpi-card durv-surface durv-surface-hover">
                <p className="durv-kpi-label">Discounted Transactions</p>
                <h3 className="durv-kpi-value">{kpis.totalCount}</h3>
              </div>

              <div className="durv-kpi-card durv-surface durv-surface-hover">
                <p className="durv-kpi-label">Avg Discount Amount</p>
                <h3 className="durv-kpi-value">{formatCurrency(kpis.avgPerTransaction)}</h3>
              </div>
            </div>

            <div className="durv-main-grid">
              <div className="durv-chart-card durv-surface durv-surface-hover">
                <div className="durv-card-head">
                  <h3 className="durv-card-title">Discount Distribution</h3>
                </div>

                <div className="durv-chart-area">
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
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            style={{ outline: 'none' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="durv-legend">
                  {typeData.map((stat) => (
                    <div key={stat.name} className="durv-legend-item">
                      <div
                        className="durv-legend-dot"
                        style={{ backgroundColor: stat.color }}
                      />
                      <span>
                        {stat.name} ({stat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="durv-side-grid">
                <div className="durv-table-card durv-surface durv-surface-hover">
                  <div className="durv-card-head">
                    <h3 className="durv-card-title">Discount Type Breakdown</h3>
                  </div>

                  <div className="durv-table-wrap">
                    <table className="durv-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th className="align-right">Transactions</th>
                          <th className="align-right">Total Value</th>
                          <th className="align-right">% of Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typeData.map((stat) => (
                          <tr key={stat.name}>
                            <td className="durv-type-cell">
                              <div
                                className="durv-type-dot"
                                style={{ backgroundColor: stat.color }}
                              />
                              {stat.name}
                            </td>
                            <td className="align-right">{stat.count}</td>
                            <td className="align-right strong">
                              {formatCurrency(stat.value)}
                            </td>
                            <td className="align-right muted">
                              {stat.percentage.toFixed(1)}%
                            </td>
                          </tr>
                        ))}

                        {typeData.length === 0 && (
                          <tr>
                            <td colSpan={4} className="durv-empty-cell">
                              No discounts applied in this date range.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="durv-table-card durv-surface durv-surface-hover">
                  <div className="durv-card-head durv-card-head-split">
                    <h3 className="durv-card-title">Staff Audit</h3>
                    <span className="durv-audit-badge">Discount Tracking</span>
                  </div>

                  <div className="durv-table-wrap">
                    <table className="durv-table">
                      <thead>
                        <tr>
                          <th>Cashier Name</th>
                          <th className="align-right">Discount Uses</th>
                          <th className="align-right">Total Discount Given</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffData.map((staff) => (
                          <tr key={staff.name}>
                            <td className="strong">{staff.name}</td>
                            <td className="align-right">{staff.count}</td>
                            <td className="align-right durv-danger-amount">
                              {formatCurrency(staff.value)}
                            </td>
                          </tr>
                        ))}

                        {staffData.length === 0 && (
                          <tr>
                            <td colSpan={3} className="durv-empty-cell">
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
          </>
        )}
      </div>
    </div>
  );
};

export default DiscountUsageReportView;