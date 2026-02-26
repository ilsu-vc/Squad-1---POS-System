import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import {
  getBarColor,
  getRevenueByHour,
  getCategoryData,
  getPaymentMethodStats,
} from '../utils/chartHelpers';
import { getMethodPillClass } from '../utils/paymentHelpers';

// Import Dashboard Stat Icons
import total_revenue_icon from '../assets/images/total_revenue_icon.png';
import transaction_icon   from '../assets/images/transaction_icon.png';
import avg_transaction    from '../assets/images/avg_transaction.png';
import items_sold_icon    from '../assets/images/items_sold_icon.png';

const DashboardView = ({ transactions }) => {
  const totalRevenue   = transactions.reduce((acc, curr) => acc + curr.rawAmount, 0);
  const totalItemsSold = transactions.reduce((acc, curr) => acc + curr.itemsCount, 0);
  const avgTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  const revenueByHour      = getRevenueByHour(transactions);
  const categoryData       = getCategoryData(transactions);
  const paymentMethodStats = getPaymentMethodStats(transactions);

  return (
    <div className="dashboard-view">
      <div className="view-inner-container">
        <h2 className="dashboard-header-title">Dashboard Overview</h2>

        {/* ── Stat Cards ── */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-info">
              <h3>Total Revenue</h3>
              <p className="stat-value">₱{totalRevenue.toFixed(2)}</p>
              <p className="stat-subtext">↗ Today</p>
            </div>
            <div className="stat-icon-bg">
              <img src={total_revenue_icon} alt="" className="stat-img-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <h3>Transactions</h3>
              <p className="stat-value">{transactions.length}</p>
              <p className="stat-subtext">Total orders</p>
            </div>
            <div className="stat-icon-bg">
              <img src={transaction_icon} alt="" className="stat-img-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <h3>Avg. Transaction</h3>
              <p className="stat-value">₱{avgTransaction.toFixed(2)}</p>
              <p className="stat-subtext">Per order</p>
            </div>
            <div className="stat-icon-bg">
              <img src={avg_transaction} alt="" className="stat-img-icon" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <h3>Items Sold</h3>
              <p className="stat-value">{totalItemsSold}</p>
              <p className="stat-subtext">Total units</p>
            </div>
            <div className="stat-icon-bg">
              <img src={items_sold_icon} alt="" className="stat-img-icon" />
            </div>
          </div>
        </div>

        {/* ── Charts & Cards Grid ── */}
        <div className="dashboard-main-grid">

          {/* Revenue by Hour Bar Chart */}
          <div className="content-card">
            <h3 className="card-title">Revenue by Hour</h3>
            <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
              <ResponsiveContainer>
                <BarChart data={revenueByHour}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500, fill: '#666' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500, fill: '#666' }} />
                  <Tooltip cursor={{ fill: '#f5f5f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={30}>
                    {revenueByHour.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sales by Category Pie Chart */}
          <div className="content-card">
            <h3 className="card-title">Sales by Category</h3>
            <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%" cy="50%" outerRadius={60} dataKey="value"
                    labelLine={true}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#1b2a47', '#3e4a7f', '#6373a6', '#8a9cd0', '#b2c6f2'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="content-card">
            <h3 className="card-title">Payment Methods</h3>
            <div className="payment-methods-scroll">
              {paymentMethodStats.map((stat) => (
                <div className="payment-item" key={stat.name}>
                  <div className="payment-info-row">
                    <span className="payment-label">{stat.name}</span>
                    <span className="payment-stats">{stat.count} ({stat.percentage}%)</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${stat.percentage}%`, backgroundColor: stat.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="content-card">
            <h3 className="card-title">Recent Transactions</h3>
            <div className="recent-transactions-list">
              {transactions.slice(0, 5).map((txn) => (
                <div key={txn.id} className="transaction-card">
                  <div>
                    <p className="txn-id">{txn.id}</p>
                    <p className="txn-date">{txn.time}</p>
                  </div>
                  <div className="txn-info-right">
                    <p className="txn-amount">{txn.amount}</p>
                    <p className={`txn-method ${getMethodPillClass(txn.method)}`}>{txn.method}</p>
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
