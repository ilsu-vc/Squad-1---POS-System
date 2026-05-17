'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

import {
  getRevenueByHour,
  getCategoryData,
  getPaymentMethodStats,
  Transaction,
} from '../utils/chartHelpers';
import { getMethodPillClass } from '../utils/paymentHelpers';

// Import Dashboard Stat Icons
import total_revenue_icon from '../assets/images/total_revenue_icon.png';
import transaction_icon from '../assets/images/transaction_icon.png';
import avg_transaction from '../assets/images/avg_transaction.png';
import items_sold_icon from '../assets/images/items_sold_icon.png';

// Number format utility
import { formatCurrency } from '../utils/numberformatters';
import './DashboardView.css';

interface DashboardViewProps {
  transactions: Transaction[];
}

const DashboardView: React.FC<DashboardViewProps> = ({ transactions }) => {
  const isTxnsArray = Array.isArray(transactions);
  const totalRevenue = isTxnsArray ? transactions.reduce((acc, curr) => acc + (curr?.rawAmount || 0), 0) : 0;
  const totalItemsSold = isTxnsArray ? transactions.reduce((acc, curr) => acc + (curr?.itemsCount || 0), 0) : 0;
  const avgTransactionVal = (isTxnsArray && transactions.length > 0) ? totalRevenue / transactions.length : 0;

  const revenueByHour = getRevenueByHour(transactions);
  const categoryData = getCategoryData(transactions);
  const paymentMethodStats = getPaymentMethodStats(transactions);

  const chartSeriesColors = ['#1b2a47', '#314566', '#4a6288', '#6b83ab', '#90a7cb'];
  const intradayTrendData = revenueByHour.reduce<Array<{ time: string; amount: number; cumulative: number }>>(
    (series, entry) => {
      const previousTotal = series[series.length - 1]?.cumulative || 0;
      const amount = Math.max(0, entry.amount || 0);
      series.push({
        time: entry.time,
        amount,
        cumulative: previousTotal + amount,
      });
      return series;
    },
    []
  );
  const topCategoryData = [...categoryData].sort((a, b) => b.value - a.value);

  const getPaymentMethodLabel = (method: string): string => {
    const normalized = (method || '').trim().toLowerCase();
    if (normalized === 'cash') return 'Cash Payment';
    if (normalized === 'card' || normalized === 'credit/debit card' || normalized === 'credit card') return 'Card Payment';
    if (normalized === 'mobile' || normalized === 'gcash' || normalized === 'gcash / mobile') return 'Mobile Payment';
    if (normalized === 'split') return 'Split Payment';
    return method;
  };

  return (
    <div className="dashboard-view dashboard-rise-up">
      <div className="dashboard-shell">
        <div className="dashboard-topbar">
          <div>
            <p className="dashboard-eyebrow">POS ANALYTICS</p>
            <h2 className="dashboard-header-title">Dashboard Overview</h2>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="stats-grid">
          <div className="stat-card dashboard-surface interactive-surface">
            <div className="stat-info">
              <h3>Total Revenue</h3>
              <p className="stat-value">{formatCurrency(totalRevenue)}</p>
              <p className="stat-subtext positive">↗ Today</p>
            </div>
            <div className="stat-icon-bg">
              <img
                src={
                  typeof total_revenue_icon === 'string'
                    ? total_revenue_icon
                    : (total_revenue_icon as any).src
                }
                alt=""
                className="stat-img-icon"
              />
            </div>
          </div>

          <div className="stat-card dashboard-surface interactive-surface">
            <div className="stat-info">
              <h3>Transactions</h3>
              <p className="stat-value">{transactions.length}</p>
              <p className="stat-subtext">Total orders</p>
            </div>
            <div className="stat-icon-bg">
              <img
                src={
                  typeof transaction_icon === 'string'
                    ? transaction_icon
                    : (transaction_icon as any).src
                }
                alt=""
                className="stat-img-icon"
              />
            </div>
          </div>

          <div className="stat-card dashboard-surface interactive-surface">
            <div className="stat-info">
              <h3>Avg. Transaction</h3>
              <p className="stat-value">{formatCurrency(avgTransactionVal)}</p>
              <p className="stat-subtext">Per order</p>
            </div>
            <div className="stat-icon-bg">
              <img
                src={
                  typeof avg_transaction === 'string'
                    ? avg_transaction
                    : (avg_transaction as any).src
                }
                alt=""
                className="stat-img-icon"
              />
            </div>
          </div>

          <div className="stat-card dashboard-surface interactive-surface">
            <div className="stat-info">
              <h3>Items Sold</h3>
              <p className="stat-value">{totalItemsSold}</p>
              <p className="stat-subtext">Total units</p>
            </div>
            <div className="stat-icon-bg">
              <img
                src={
                  typeof items_sold_icon === 'string'
                    ? items_sold_icon
                    : (items_sold_icon as any).src
                }
                alt=""
                className="stat-img-icon"
              />
            </div>
          </div>
        </div>

        {/* ── Charts & Cards Grid ── */}
        <div className="dashboard-main-grid">
          {/* Intraday Revenue Trends */}
          <div className="content-card dashboard-surface interactive-surface chart-card">
            <div className="card-head">
              <h3 className="card-title">Intraday Revenue Trends</h3>
            </div>

            <div className="dashboard-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={intradayTrendData} margin={{ top: 12, right: 14, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="intradayRevenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#01a2ad" stopOpacity={0.34} />
                      <stop offset="95%" stopColor="#01a2ad" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbe4ef" />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#5b6b82' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#5b6b82' }}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatCurrency(Number(value)),
                      name === 'cumulative' ? 'Cumulative revenue' : 'Hourly revenue',
                    ]}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #dbe4ef',
                      boxShadow: '0 12px 30px rgba(27, 42, 71, 0.08)',
                      background: '#ffffff',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#01a2ad"
                    strokeWidth={3}
                    fill="url(#intradayRevenueFill)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Product Categories */}
          <div className="content-card dashboard-surface interactive-surface chart-card">
            <div className="card-head">
              <h3 className="card-title">Top Product Categories</h3>
            </div>

            <div className="dashboard-chart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={topCategoryData}
                  layout="vertical"
                  margin={{ top: 8, right: 22, left: 18, bottom: 8 }}
                  barCategoryGap={14}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#dbe4ef" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#5b6b82' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    width={132}
                    tick={{ fontSize: 12, fontWeight: 700, fill: '#1b2a47' }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} sold`, 'Volume']}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #dbe4ef',
                      boxShadow: '0 12px 30px rgba(27, 42, 71, 0.08)',
                      background: '#ffffff',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                    {topCategoryData.map((_entry, index) => (
                      <Cell
                        key={`category-cell-${index}`}
                        fill={chartSeriesColors[index % chartSeriesColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="content-card dashboard-surface interactive-surface">
            <div className="card-head">
              <h3 className="card-title">Payment Methods</h3>
            </div>

            <div className="payment-methods-scroll">
              {paymentMethodStats.map((stat) => (
                <div className="payment-item" key={stat.name}>
                  <div className="payment-info-row">
                    <span className="payment-label">{stat.name}</span>
                    <span className="payment-stats">
                      {stat.count} ({stat.percentage}%)
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${stat.percentage}%`, backgroundColor: stat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="content-card dashboard-surface interactive-surface">
            <div className="card-head">
              <h3 className="card-title">Recent Transactions</h3>
            </div>

            <div className="recent-transactions-list">
              {transactions.slice(0, 5).map((txn) => (
                <div key={txn.id} className="transaction-card">
                  <div className="transaction-left">
                    <p className="txn-id">{txn.id}</p>
                    <p className="txn-date">{txn.time}</p>
                  </div>

                  <div className="txn-info-right">
                    <p className="txn-amount">{txn.amount}</p>
                    <p className={`txn-method ${getMethodPillClass(txn.method)}`}>
                      {getPaymentMethodLabel(txn.method)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
