'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Trophy, CircleDollarSign, TriangleAlert } from 'lucide-react';
import { salesApi } from '../services/salesApi';
import { formatCurrency } from '../utils/numberformatters';
import { Transaction } from '../utils/chartHelpers';
import './ProductPerformanceReportView.css';

interface TransactionItem {
  name: string;
  category: string;
  quantity: number;
  line_total: number;
  unit_price?: number;
  created_at?: string;
  transaction_id?: string;
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchProductData = async () => {
    try {
      setLoading(true);
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const startDate = sixtyDaysAgo.toISOString();

      const result = await salesApi.fetchTransactionItems(startDate);
      const dbItems = result.items || [];
      
      const dbTxnIds = new Set<string>();
      dbItems.forEach((item: any) => {
        if (item.transaction_id) dbTxnIds.add(item.transaction_id);
      });

      const localItems: TransactionItem[] = [];
      transactions.forEach((txn) => {
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
            line_total: item.price * item.qty * multiplier,
            unit_price: item.price,
            created_at: isoDate,
          });
        });
      });

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          prevRevenue: 0,
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
      return <span className="pprv-trend up">↑ New</span>;
    }

    if (previous === 0 && current === 0) return null;

    const percentChange = ((current - previous) / previous) * 100;

    if (percentChange > 0) {
      return <span className="pprv-trend up">↑{percentChange.toFixed(0)}%</span>;
    }

    if (percentChange < 0) {
      return <span className="pprv-trend down">↓{Math.abs(percentChange).toFixed(0)}%</span>;
    }

    return <span className="pprv-trend neutral">0%</span>;
  };

  const renderProductTable = (
    title: string,
    data: ProductStats[],
    icon: React.ReactNode
  ) => (
    <div className="pprv-table-card pprv-surface pprv-surface-hover">
      <div className="pprv-card-head">
        <h3 className="pprv-card-title pprv-title-with-icon">
          {icon}
          <span>{title}</span>
        </h3>
      </div>

      <div className="pprv-table-wrap">
        <table className="pprv-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Product</th>
              <th className="align-right">Units</th>
              <th className="align-right">Revenue</th>
              <th className="align-right">Margin</th>
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
                <tr key={item.name}>
                  <td className="pprv-rank-cell">#{index + 1}</td>
                  <td className="pprv-product-cell">{item.name}</td>
                  <td className="align-right">
                    <span className="pprv-value-inline">
                      {item.totalQuantity}
                      {renderTrend(item.totalQuantity, item.prevQuantity)}
                    </span>
                  </td>
                  <td className="align-right strong">
                    <span className="pprv-value-inline">
                      {formatCurrency(item.totalRevenue)}
                      {renderTrend(item.totalRevenue, item.prevRevenue)}
                    </span>
                  </td>
                  <td
                    className={`align-right pprv-margin-cell ${
                      item.totalCost > 0 ? 'is-positive' : 'is-na'
                    }`}
                  >
                    {displayMargin}
                  </td>
                </tr>
              );
            })}

            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="pprv-empty-cell">
                  No products found for this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="pprv-view pprv-rise-up">
      <div className="pprv-shell">
        <div className="pprv-header">
          <div>
            <p className="pprv-eyebrow">REPORTING</p>
            <h1 className="pprv-title">Product Performance Report</h1>
            <p className="pprv-subtitle">{selectedCategory} Performance • Last 30 Days vs Prior</p>
          </div>

          <div className="pprv-filter-wrap">
            <span className="pprv-filter-label">Filter by Category</span>

            <div className="custom-dropdown-container pprv-dropdown-container" ref={dropdownRef}>
              <button
                type="button"
                className={`custom-dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
              >
                {selectedCategory}
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
                  {categories.map((cat) => (
                    <div
                      key={cat}
                      className={`dropdown-item ${selectedCategory === cat ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="inline-loading-container">
            <div className="inline-spinner"></div>
            <div className="inline-loading-text">Analyzing inventory data...</div>
          </div>
        ) : (
          <div className="pprv-stack-grid">
            {renderProductTable(
              'Top Sellers',
              topByQuantity,
              <Trophy className="pprv-title-icon" />
            )}
            {renderProductTable(
              'Revenue Leaders',
              topByRevenue,
              <CircleDollarSign className="pprv-title-icon" />
            )}
            {renderProductTable(
              'Slow Movers',
              bottomProducts,
              <TriangleAlert className="pprv-title-icon" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductPerformanceReportView;