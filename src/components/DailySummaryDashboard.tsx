'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  DollarSign,
  ShoppingCart,
  Receipt,
  Users,
  Wallet
} from 'lucide-react';
import './DailySummaryDashboard.css';

import { Transaction } from '../utils/chartHelpers';

interface Props {
  onSwitchReport?: (reportValue: string) => void;
  transactions: Transaction[];
}

// --- CORRECTED Date Helper Functions ---
const getManilaDateString = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const d = parts.find((p) => p.type === 'day')?.value;

  return `${y}-${m}-${d}`;
};

const getManilaDayRangeInUTC = (manilaDateStr: string) => {
  const manilaStartOfDay = `${manilaDateStr}T00:00:00.000+08:00`;
  const manilaEndOfDay = `${manilaDateStr}T23:59:59.999+08:00`;

  return {
    start: new Date(manilaStartOfDay).toISOString(),
    end: new Date(manilaEndOfDay).toISOString()
  };
};

// Helper to calculate percentage trend
const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) return { text: current > 0 ? '↗ 100% vs last week' : '0% vs last week', color: '#64748b' };
  
  const percentChange = ((current - previous) / previous) * 100;
  const formattedChange = Math.abs(percentChange).toFixed(1);
  
  if (percentChange > 0) return { text: `↗ ${formattedChange}% vs last week`, color: '#10b981' }; // Green
  if (percentChange < 0) return { text: `↘ ${formattedChange}% vs last week`, color: '#ef4444' }; // Red
  return { text: `→ 0% vs last week`, color: '#64748b' }; // Gray
};

const DailySummaryDashboard: React.FC<Props> = ({ transactions: localTransactions }) => {
  // Today's State
  const [totalSales, setTotalSales] = useState(0);
  const [transactions, setTransactions] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  
  // Last Week's State
  const [lastWeekSales, setLastWeekSales] = useState(0);
  const [lastWeekTransactions, setLastWeekTransactions] = useState(0);
  const [lastWeekAvgOrder, setLastWeekAvgOrder] = useState(0);

  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [activeStaffCount, setActiveStaffCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Define the fetch function so it can be called on mount AND on real-time updates
    const fetchDashboardData = async () => {
      try {
        setError(null);

        // DATES: Today and Last Week
        const now = new Date();
        const todayDateStr = getManilaDateString(now);
        const todayUtcRange = getManilaDayRangeInUTC(todayDateStr);

        const lastWeekDate = new Date();
        lastWeekDate.setDate(now.getDate() - 7);
        const lastWeekDateStr = getManilaDateString(lastWeekDate);
        const lastWeekUtcRange = getManilaDayRangeInUTC(lastWeekDateStr);

        // FETCH TODAY'S DATA
        const { data: salesData, error: salesError, count: txCount } = await supabase
          .from('transactions')
          .select('id, total_amount', { count: 'exact' })
          .gte('created_at', todayUtcRange.start)
          .lte('created_at', todayUtcRange.end)
          .eq('status', 'completed');

        if (salesError) throw salesError;

        const currentSales = salesData?.reduce((sum, tx) => sum + Number(tx.total_amount || 0), 0) || 0;
        const currentCount = txCount || 0;

        setTotalSales(currentSales);
        setTransactions(currentCount);
        setAvgOrderValue(currentCount > 0 ? currentSales / currentCount : 0);

        // FETCH LAST WEEK'S DATA
        const { data: lwSalesData, error: lwSalesError, count: lwTxCount } = await supabase
          .from('transactions')
          .select('id, total_amount', { count: 'exact' })
          .gte('created_at', lastWeekUtcRange.start)
          .lte('created_at', lastWeekUtcRange.end)
          .eq('status', 'completed');

        if (lwSalesError) throw lwSalesError;

        const lwSales = lwSalesData?.reduce((sum, tx) => sum + Number(tx.total_amount || 0), 0) || 0;
        const lwCount = lwTxCount || 0;

        setLastWeekSales(lwSales);
        setLastWeekTransactions(lwCount);
        setLastWeekAvgOrder(lwCount > 0 ? lwSales / lwCount : 0);

        // FETCH TOP PRODUCTS (Today)
        if (salesData && salesData.length > 0) {
          const transactionIds = salesData.map((tx) => tx.id);
          const { data: itemsData, error: itemsError } = await supabase
            .from('transaction_items')
            .select('name, quantity, line_total')
            .in('transaction_id', transactionIds);

          if (itemsError) throw itemsError;

          const groupedProducts = (itemsData || []).reduce((acc: any, item: any) => {
            const name = item.name;
            if (!acc[name]) acc[name] = { name, qty: 0, revenue: 0 };
            acc[name].qty += Number(item.quantity);
            acc[name].revenue += Number(item.line_total);
            return acc;
          }, {});

          const sortedProducts = Object.values(groupedProducts)
            .sort((a: any, b: any) => b.revenue - a.revenue)
            .slice(0, 5);

          setTopProducts(sortedProducts);
        } else {
          setTopProducts([]);
        }

        // FETCH STAFF
        const { count: staffCount, error: staffError } = await supabase
          .from('shift_records')
          .select('*', { count: 'exact', head: true })
          .is('clock_out_at', null);

        if (staffError) throw staffError;
        setActiveStaffCount(staffCount || 0);

      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        setError(`Failed to load dashboard data. ${err.message || 'Please try again.'}`);
      } finally {
        setIsLoading(false);
      }
    };

    // 2. Initial Fetch on Mount
    fetchDashboardData();

    // 3. Set up Supabase Realtime Subscriptions
    const transactionSubscription = supabase
      .channel('dashboard-transactions-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          console.log('Realtime Update: Transactions', payload);
          fetchDashboardData(); // Refetch to update numbers instantly
        }
      )
      .subscribe();

    const staffSubscription = supabase
      .channel('dashboard-staff-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_records' },
        (payload) => {
          console.log('Realtime Update: Staff', payload);
          fetchDashboardData(); // Refetch to update clocked-in count instantly
        }
      )
      .subscribe();

    // 4. Cleanup Subscriptions on Unmount
    return () => {
      supabase.removeChannel(transactionSubscription);
      supabase.removeChannel(staffSubscription);
    };
  }, []); // Empty dependency array ensures this runs once

  // --- LIVE MERGE LOGIC ---
  // Merge live session transactions (from App.tsx) with the DB data
  const liveTotals = useMemo(() => {
    const today = getManilaDateString(new Date());
    
    // Filter local txns for Today that aren't expected to be in the DB yet
    // (In this specific app, App.tsx only uses localStorage, so all are local)
    const todayLocal = localTransactions.filter(t => {
      const tDate = new Date(`${t.date} ${t.time}`);
      return getManilaDateString(tDate) === today;
    });

    const localSales = todayLocal.reduce((sum, t) => sum + t.rawAmount, 0);
    const localCount = todayLocal.length;

    // Group local items for top products
    const localProductMap: Record<string, { qty: number; revenue: number }> = {};
    todayLocal.forEach(t => {
      const isRefund = t.type === 'refund';
      const multiplier = isRefund ? -1 : 1;
      
      t.items.forEach(item => {
        if (!localProductMap[item.name]) localProductMap[item.name] = { qty: 0, revenue: 0 };
        localProductMap[item.name].qty += item.qty * multiplier;
        localProductMap[item.name].revenue += (item.qty * item.price) * multiplier;
      });
    });

    return { localSales, localCount, localProductMap };
  }, [localTransactions]);

  // Adjust display values
  const displayTotalSales = totalSales + liveTotals.localSales;
  const displayTransactionCount = transactions + liveTotals.localCount;
  const displayAvgOrder = displayTransactionCount > 0 ? displayTotalSales / displayTransactionCount : 0;

  // Merge top products
  const displayTopProducts = useMemo(() => {
    type ProductMetric = { name: string; qty: number; revenue: number };
    const combined: ProductMetric[] = [...topProducts];
    
    Object.entries(liveTotals.localProductMap).forEach(([name, data]) => {
      const existing = combined.find(p => p.name === name);
      if (existing) {
        existing.qty += data.qty;
        existing.revenue += data.revenue;
      } else {
        combined.push({ name, ...data });
      }
    });
    return combined.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [topProducts, liveTotals.localProductMap]);

  return (
    <div className="daily-dashboard-container">
      <div className="dashboard-header-wrapper">
        <div className="dashboard-header">
          <h2>Daily Summary Dashboard</h2>
          <p>Real-time performance overview for today</p>
        </div>
      </div>

      {isLoading ? (
        <div className="inline-loading-container">
          <div className="inline-spinner"></div>
          <div className="inline-loading-text">Loading today's performance data...</div>
        </div>
      ) : error ? (
        <div
          style={{
            textAlign: 'center',
            padding: '50px',
            color: '#ef4444',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}
        >
          {error}
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            {/* Sales Card */}
            <div className="kpi-card">
              <div className="kpi-icon-wrapper blue">
                <DollarSign size={24} />
              </div>
              <div className="kpi-details">
                <h3>Total Sales</h3>
                <p className="kpi-value">
                  ₱{displayTotalSales.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <p className="kpi-trend" style={{ color: calculateTrend(displayTotalSales, lastWeekSales).color, margin: '4px 0 0 0', fontSize: '13px', fontWeight: 500 }}>
                  {calculateTrend(displayTotalSales, lastWeekSales).text}
                </p>
              </div>
            </div>

            {/* Transactions Card */}
            <div className="kpi-card">
              <div className="kpi-icon-wrapper green">
                <Receipt size={24} />
              </div>
              <div className="kpi-details">
                <h3>Transactions</h3>
                <p className="kpi-value">{displayTransactionCount}</p>
                <p className="kpi-trend" style={{ color: calculateTrend(displayTransactionCount, lastWeekTransactions).color, margin: '4px 0 0 0', fontSize: '13px', fontWeight: 500 }}>
                  {calculateTrend(displayTransactionCount, lastWeekTransactions).text}
                </p>
              </div>
            </div>

            {/* Avg Transaction Card */}
            <div className="kpi-card">
              <div className="kpi-icon-wrapper purple">
                <ShoppingCart size={24} />
              </div>
              <div className="kpi-details">
                <h3>Avg Transaction</h3>
                <p className="kpi-value">
                  ₱{displayAvgOrder.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
                <p className="kpi-trend" style={{ color: calculateTrend(displayAvgOrder, lastWeekAvgOrder).color, margin: '4px 0 0 0', fontSize: '13px', fontWeight: 500 }}>
                  {calculateTrend(displayAvgOrder, lastWeekAvgOrder).text}
                </p>
              </div>
            </div>
          </div>

          <div className="secondary-metrics-grid">
            <div className="metric-card">
              <Wallet size={20} className="metric-icon" />
              <div className="metric-info">
                <h4>Drawer Cash</h4>
                <p>
                  ₱4,500.00{' '}
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>(Placeholder)</span>
                </p>
              </div>
            </div>

            <div className="metric-card">
              <Users size={20} className="metric-icon" />
              <div className="metric-info">
                <h4>Active Staff</h4>
                <p>{activeStaffCount} Clocked In</p>
              </div>
            </div>
          </div>

          <div className="dashboard-lower-section">
            <div className="data-panel">
              <h3>Top Selling Products Today</h3>
              {displayTopProducts.length > 0 ? (
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th style={{ textAlign: 'right' }}>Qty Sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTopProducts.map((product, index) => (
                      <tr key={index}>
                        <td>{product.name}</td>
                        <td style={{ textAlign: 'right' }}>{product.qty}</td>
                        <td style={{ textAlign: 'right' }}>
                          ₱{product.revenue.toLocaleString(undefined, {
                            minimumFractionDigits: 2
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
                  No products sold today yet.
                </p>
              )}
            </div>

            <div className="data-panel insights-panel">
              <h3>Quick Insights</h3>
              <ul className="insights-list">
                <li>
                  <strong style={{ color: '#0f172a' }}>Peak Hour Approaching:</strong>
                  <br />
                  Based on last week's data, expect a 30% increase in foot traffic between 12 PM - 2 PM.
                </li>
                <li>
                  <strong style={{ color: '#0f172a' }}>Low Inventory Alert:</strong>
                  <br />
                  Espresso beans are running low (Est. &lt; 2 days remaining).
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DailySummaryDashboard;