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

const getManilaDateString = (date: Date): string => {
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

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

const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) {
    return {
      text: current > 0 ? '↗ 100% vs last week' : '0% vs last week',
      color: '#64748b'
    };
  }

  const percentChange = ((current - previous) / previous) * 100;
  const formattedChange = Math.abs(percentChange).toFixed(1);

  if (percentChange > 0) {
    return { text: `↗ ${formattedChange}% vs last week`, color: '#01a2ad' };
  }
  if (percentChange < 0) {
    return { text: `↘ ${formattedChange}% vs last week`, color: '#64748b' };
  }
  return { text: `→ 0% vs last week`, color: '#64748b' };
};

const DailySummaryDashboard: React.FC<Props> = ({ transactions: localTransactions }) => {
  const [totalSales, setTotalSales] = useState(0);
  const [transactions, setTransactions] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);

  const [lastWeekSales, setLastWeekSales] = useState(0);
  const [lastWeekTransactions, setLastWeekTransactions] = useState(0);
  const [lastWeekAvgOrder, setLastWeekAvgOrder] = useState(0);

  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [activeStaffCount, setActiveStaffCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setError(null);

        const now = new Date();
        const todayDateStr = getManilaDateString(now);
        const todayUtcRange = getManilaDayRangeInUTC(todayDateStr);

        const lastWeekDate = new Date();
        lastWeekDate.setDate(now.getDate() - 7);
        const lastWeekDateStr = getManilaDateString(lastWeekDate);
        const lastWeekUtcRange = getManilaDayRangeInUTC(lastWeekDateStr);

        const { data: salesData, error: salesError, count: txCount } = await supabase
          .from('transactions')
          .select('id, total_amount', { count: 'exact' })
          .gte('created_at', todayUtcRange.start)
          .lte('created_at', todayUtcRange.end)
          .eq('status', 'paid');

        if (salesError) throw salesError;

        const currentSales =
          salesData?.reduce((sum, tx) => sum + Number(tx.total_amount || 0), 0) || 0;
        const currentCount = txCount || 0;

        setTotalSales(currentSales);
        setTransactions(currentCount);
        setAvgOrderValue(currentCount > 0 ? currentSales / currentCount : 0);

        const { data: lwSalesData, error: lwSalesError, count: lwTxCount } = await supabase
          .from('transactions')
          .select('id, total_amount', { count: 'exact' })
          .gte('created_at', lastWeekUtcRange.start)
          .lte('created_at', lastWeekUtcRange.end)
          .eq('status', 'paid');

        if (lwSalesError) throw lwSalesError;

        const lwSales =
          lwSalesData?.reduce((sum, tx) => sum + Number(tx.total_amount || 0), 0) || 0;
        const lwCount = lwTxCount || 0;

        setLastWeekSales(lwSales);
        setLastWeekTransactions(lwCount);
        setLastWeekAvgOrder(lwCount > 0 ? lwSales / lwCount : 0);

        if (salesData && salesData.length > 0) {
          const transactionIds = salesData.map((tx) => tx.id);
          
          let allItems: any[] = [];
          const CHUNK_SIZE = 100; // Small chunk to avoid URL length limits

          for (let i = 0; i < transactionIds.length; i += CHUNK_SIZE) {
            const chunk = transactionIds.slice(i, i + CHUNK_SIZE);
            const { data: itemsData, error: itemsError } = await supabase
              .from('transaction_items')
              .select('name, quantity, line_total')
              .in('transaction_id', chunk);

            if (itemsError) throw itemsError;
            if (itemsData) {
              allItems = [...allItems, ...itemsData];
            }
          }

          const groupedProducts = allItems.reduce((acc: any, item: any) => {
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

    fetchDashboardData();

    const transactionSubscription = supabase
      .channel('dashboard-transactions-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        (payload) => {
          console.log('Realtime Update: Transactions', payload);
          fetchDashboardData();
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
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionSubscription);
      supabase.removeChannel(staffSubscription);
    };
  }, []);

  const liveTotals = useMemo(() => {
    const today = getManilaDateString(new Date());

    const todayLocal = localTransactions.filter((t) => {
      const tDate = new Date(`${t.date} ${t.time}`);
      if (isNaN(tDate.getTime())) return false;
      return getManilaDateString(tDate) === today;
    });

    const localSales = todayLocal.reduce((sum, t) => sum + t.rawAmount, 0);
    const localCount = todayLocal.length;

    const localProductMap: Record<string, { qty: number; revenue: number }> = {};
    todayLocal.forEach((t) => {
      const isRefund = t.type === 'refund';
      const multiplier = isRefund ? -1 : 1;

      t.items.forEach((item) => {
        if (!localProductMap[item.name]) {
          localProductMap[item.name] = { qty: 0, revenue: 0 };
        }
        localProductMap[item.name].qty += item.qty * multiplier;
        localProductMap[item.name].revenue += item.qty * item.price * multiplier;
      });
    });

    return { localSales, localCount, localProductMap };
  }, [localTransactions]);

  const displayTotalSales = totalSales + liveTotals.localSales;
  const displayTransactionCount = transactions + liveTotals.localCount;
  const displayAvgOrder =
    displayTransactionCount > 0 ? displayTotalSales / displayTransactionCount : 0;

  const displayTopProducts = useMemo(() => {
    type ProductMetric = { name: string; qty: number; revenue: number };
    const combined: ProductMetric[] = [...topProducts];

    Object.entries(liveTotals.localProductMap).forEach(([name, data]) => {
      const existing = combined.find((p) => p.name === name);
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
    <div className="dsd-view dsd-rise-up">
      <div className="dsd-shell">
        <div className="dsd-header">
          <div>
            <p className="dsd-eyebrow">REPORTING</p>
            <h2 className="dsd-title">Daily Summary Dashboard</h2>
            <p className="dsd-subtitle">Real-time performance overview for today</p>
          </div>
        </div>

        {isLoading ? (
          <div className="inline-loading-container">
            <div className="inline-spinner"></div>
            <div className="inline-loading-text">Loading today's performance data...</div>
          </div>
        ) : error ? (
          <div className="dsd-alert-error">{error}</div>
        ) : (
          <>
            <div className="dsd-kpi-grid">
              <div className="dsd-kpi-card dsd-surface dsd-surface-hover">
                <div className="dsd-kpi-icon-wrap">
                  <DollarSign size={22} className="dsd-kpi-icon" />
                </div>
                <div className="dsd-kpi-details">
                  <h3>Total Sales</h3>
                  <p className="dsd-kpi-value">
                    ₱
                    {displayTotalSales.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p
                    className="dsd-kpi-trend"
                    style={{ color: calculateTrend(displayTotalSales, lastWeekSales).color }}
                  >
                    {calculateTrend(displayTotalSales, lastWeekSales).text}
                  </p>
                </div>
              </div>

              <div className="dsd-kpi-card dsd-surface dsd-surface-hover">
                <div className="dsd-kpi-icon-wrap">
                  <Receipt size={22} className="dsd-kpi-icon" />
                </div>
                <div className="dsd-kpi-details">
                  <h3>Transactions</h3>
                  <p className="dsd-kpi-value">{displayTransactionCount}</p>
                  <p
                    className="dsd-kpi-trend"
                    style={{
                      color: calculateTrend(displayTransactionCount, lastWeekTransactions).color
                    }}
                  >
                    {calculateTrend(displayTransactionCount, lastWeekTransactions).text}
                  </p>
                </div>
              </div>

              <div className="dsd-kpi-card dsd-surface dsd-surface-hover">
                <div className="dsd-kpi-icon-wrap">
                  <ShoppingCart size={22} className="dsd-kpi-icon" />
                </div>
                <div className="dsd-kpi-details">
                  <h3>Avg Transaction</h3>
                  <p className="dsd-kpi-value">
                    ₱
                    {displayAvgOrder.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p
                    className="dsd-kpi-trend"
                    style={{ color: calculateTrend(displayAvgOrder, lastWeekAvgOrder).color }}
                  >
                    {calculateTrend(displayAvgOrder, lastWeekAvgOrder).text}
                  </p>
                </div>
              </div>
            </div>

            <div className="dsd-secondary-grid">
              <div className="dsd-metric-card dsd-surface dsd-surface-hover">
                <div className="dsd-metric-icon-wrap">
                  <Wallet size={18} className="dsd-metric-icon" />
                </div>
                <div className="dsd-metric-info">
                  <h4>Drawer Cash</h4>
                  <p>
                    ₱4,500.00 <span className="dsd-placeholder-note">(Placeholder)</span>
                  </p>
                </div>
              </div>

              <div className="dsd-metric-card dsd-surface dsd-surface-hover">
                <div className="dsd-metric-icon-wrap">
                  <Users size={18} className="dsd-metric-icon" />
                </div>
                <div className="dsd-metric-info">
                  <h4>Active Staff</h4>
                  <p>{activeStaffCount} Clocked In</p>
                </div>
              </div>
            </div>

            <div className="dsd-lower-grid">
              <div className="dsd-panel dsd-surface dsd-surface-hover">
                <div className="dsd-panel-head">
                  <h3 className="dsd-panel-title">Top Selling Products Today</h3>
                </div>

                {displayTopProducts.length > 0 ? (
                  <div className="dsd-table-wrap">
                    <table className="dsd-table">
                      <thead>
                        <tr>
                          <th>Product Name</th>
                          <th className="align-right">Qty Sold</th>
                          <th className="align-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayTopProducts.map((product, index) => (
                          <tr key={index}>
                            <td className="dsd-product-name">{product.name}</td>
                            <td className="align-right">{product.qty}</td>
                            <td className="align-right strong">
                              ₱
                              {product.revenue.toLocaleString(undefined, {
                                minimumFractionDigits: 2
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="dsd-empty-copy">No products sold today yet.</p>
                )}
              </div>

              <div className="dsd-panel dsd-surface dsd-surface-hover">
                <div className="dsd-panel-head">
                  <h3 className="dsd-panel-title">Quick Insights</h3>
                </div>

                <ul className="dsd-insights-list">
                  <li>
                    <strong>Peak Hour Approaching:</strong>
                    <br />
                    Based on last week's data, expect a 30% increase in foot traffic between
                    12 PM - 2 PM.
                  </li>
                  <li>
                    <strong>Low Inventory Alert:</strong>
                    <br />
                    Espresso beans are running low (Est. &lt; 2 days remaining).
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DailySummaryDashboard;