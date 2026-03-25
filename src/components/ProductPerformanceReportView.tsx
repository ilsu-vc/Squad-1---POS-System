'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/numberformatters';
import { Transaction } from '../utils/chartHelpers';

interface TransactionItem {
  name: string;
  category: string;
  quantity: number;
  line_total: number;
  unit_price?: number;
  created_at?: string;
}

interface ProductStats {
  name: string;
  category: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  prevQuantity: number;
  prevRevenue: number;
}

interface Props {
  onSwitchReport?: (report: string) => void;
  transactions: Transaction[];
}

const ProductPerformanceReportView: React.FC<Props> = ({ transactions }) => {
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const fetchProductData = async () => {
    try {
      setLoading(true);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const startDate = sixtyDaysAgo.toISOString();

      const { data, error } = await supabase
        .from('transaction_items')
        .select('name, category, quantity, line_total, created_at, unit_price')
        .gte('created_at', startDate);

      if (error) throw error;

      // Identify which local transactions are already in the DB to avoid double counting
      const dbTxnIds = new Set<string>();
      try {
        const localTxnIds = transactions.map(t => t.id).filter(id => id.length > 0);
        if (localTxnIds.length > 0) {
          const { data: dbTxns } = await supabase
            .from('transactions')
            .select('id')
            .in('id', localTxnIds.slice(0, 100)); // cap for safety
          (dbTxns || []).forEach((r: any) => dbTxnIds.add(r.id));
        }
      } catch (err) {
        console.warn('Silent skip: failed to check dbTxnIds', err);
      }

      // 1. Process local in-session transactions (Sales and Refunds)
      const localItems: TransactionItem[] = [];
      transactions.forEach((txn) => {
        // Skip if this transaction is already persisted (count it from DB data instead)
        if (dbTxnIds.has(txn.id)) return;

        const isRefund = txn.type === 'refund';
        const multiplier = isRefund ? -1 : 1;

        txn.items.forEach((item) => {
          const parsedDate = new Date(`${txn.date} ${txn.time}`);
          const isoDate = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
          
          localItems.push({
            name: item.name,
            category: item.category || 'Uncategorized',
            quantity: item.qty * multiplier,
            line_total: (item.price * item.qty) * multiplier,
            unit_price: item.price,
            created_at: isoDate,
          });
        });
      });

      // 2. Wrap DB items
      const dbItems = (data || []) as TransactionItem[];

      // 3. Final Merge
      setItems([...dbItems, ...localItems]);
    } catch (err) {
      console.error('Error fetching product stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [transactions]);

  const categories = useMemo(() => {
    const cats = new Set(items.map((item) => item.category || 'Uncategorized'));
    return ['All', ...Array.from(cats).sort()];
  }, [items]);

  const aggregatedProducts = useMemo(() => {
    const productMap = new Map<string, ProductStats>();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filteredItems =
      selectedCategory === 'All'
        ? items
        : items.filter((item) => (item.category || 'Uncategorized') === selectedCategory);

    filteredItems.forEach((item) => {
      if (!productMap.has(item.name)) {
        productMap.set(item.name, {
          name: item.name,
          category: item.category || 'Uncategorized',
          totalQuantity: 0,
          totalRevenue: 0,
          totalCost: 0,
          prevQuantity: 0,
          prevRevenue: 0
        });
      }

      const product = productMap.get(item.name)!;
      const itemDate = item.created_at ? new Date(item.created_at) : new Date();

      if (itemDate >= thirtyDaysAgo) {
        product.totalQuantity += item.quantity;
        product.totalRevenue += Number(item.line_total);
        product.totalCost += (Number(item.unit_price) || 0) * item.quantity;
      } else {
        product.prevQuantity += item.quantity;
        product.prevRevenue += Number(item.line_total);
      }
    });

    return Array.from(productMap.values());
  }, [items, selectedCategory]);

  const topByQuantity = useMemo(() => {
    return [...aggregatedProducts].sort((a, b) => b.totalQuantity - a.totalQuantity).slice(0, 20);
  }, [aggregatedProducts]);

  const topByRevenue = useMemo(() => {
    return [...aggregatedProducts].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 20);
  }, [aggregatedProducts]);

  const bottomProducts = useMemo(() => {
    return [...aggregatedProducts].sort((a, b) => a.totalQuantity - b.totalQuantity).slice(0, 10);
  }, [aggregatedProducts]);

  const renderTrend = (current: number, previous: number) => {
    if (previous === 0 && current > 0) {
      return (
        <span style={{ color: '#059669', fontSize: '11px', marginLeft: '6px' }}>
          ↑ New
        </span>
      );
    }

    if (previous === 0 && current === 0) return null;

    const percentChange = ((current - previous) / previous) * 100;

    if (percentChange > 0) {
      return (
        <span style={{ color: '#059669', fontSize: '11px', marginLeft: '6px' }}>
          ↑{percentChange.toFixed(0)}%
        </span>
      );
    }

    if (percentChange < 0) {
      return (
        <span style={{ color: '#ef4444', fontSize: '11px', marginLeft: '6px' }}>
          ↓{Math.abs(percentChange).toFixed(0)}%
        </span>
      );
    }

    return (
      <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: '6px' }}>
        0%
      </span>
    );
  };

  const renderProductTable = (title: string, data: ProductStats[]) => (
    <div
      style={{
        marginBottom: '20px',
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
        {title}
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
            <th style={{ padding: '12px 8px' }}>Rank</th>
            <th style={{ padding: '12px 8px' }}>Product</th>
            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Units</th>
            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Revenue</th>
            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Margin</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            const marginPercent =
              item.totalRevenue > 0
                ? ((item.totalRevenue - item.totalCost) / item.totalRevenue) * 100
                : 0;

            const displayMargin = item.totalCost > 0 ? `${marginPercent.toFixed(1)}%` : 'N/A';

            return (
              <tr key={item.name} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 8px', color: '#94a3b8' }}>#{index + 1}</td>
                <td style={{ padding: '12px 8px', fontWeight: '500', color: '#0f172a' }}>
                  {item.name}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                  {item.totalQuantity}
                  {renderTrend(item.totalQuantity, item.prevQuantity)}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', color: '#0f172a' }}>
                  {formatCurrency(item.totalRevenue)}
                  {renderTrend(item.totalRevenue, item.prevRevenue)}
                </td>
                <td
                  style={{
                    padding: '12px 8px',
                    textAlign: 'right',
                    color: item.totalCost > 0 ? '#10b981' : '#cbd5e1',
                    fontWeight: '500'
                  }}
                >
                  {displayMargin}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

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
            Product Performance Report
          </h1>
          <p style={{ color: '#64748b', margin: '0', fontSize: '13px' }}>
            {selectedCategory} Performance • Last 30 Days vs Prior
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: '#64748b' }}>Filter by Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              backgroundColor: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '220px',
              outline: 'none',
              color: '#0f172a'
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="inline-loading-container">
          <div className="inline-spinner"></div>
          <div className="inline-loading-text">Analyzing inventory data...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0' }}>
          {renderProductTable('🏆 Top Sellers', topByQuantity)}
          {renderProductTable('💰 Revenue Leaders', topByRevenue)}
          {renderProductTable('⚠️ Slow Movers', bottomProducts)}
        </div>
      )}
    </div>
  );
};

export default ProductPerformanceReportView;