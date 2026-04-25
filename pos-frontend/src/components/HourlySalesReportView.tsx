'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './HourlySalesReportView.css';

import { UserProfile } from '../types/auth';
import { logUserActivity } from '../utils/activityLogger';

interface Transaction {
  id: string;
  created_at: string;
  total_amount: number;
}

interface Props {
  onSwitchReport?: (report: string) => void;
  profile: UserProfile | null;
}

const HourlySalesReportView: React.FC<Props> = ({ onSwitchReport, profile }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const startOfDay = `${selectedDate}T00:00:00Z`;
      const endOfDay = `${selectedDate}T23:59:59Z`;

      const { data, error } = await supabase
        .from('transactions')
        .select('id, created_at, total_amount')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [selectedDate]);

  const chartData = useMemo(() => {
    const startHour = 8;
    const endHour = 20;

    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => {
      const currentHour = startHour + i;
      const nextHour = currentHour + 1;
      return {
        hourNumber: currentHour,
        timeRange: `${currentHour.toString().padStart(2, '0')}:00 - ${nextHour.toString().padStart(2, '0')}:00`,
        netSales: 0,
        transactionCount: 0,
        avgTransaction: 0
      };
    });

    transactions.forEach((t) => {
      if (!t.created_at) return;
      const date = new Date(t.created_at);
      if (isNaN(date.getTime())) return;

      const hourIndex = date.getHours();

      const targetBucket = hours.find((h) => h.hourNumber === hourIndex);
      if (targetBucket) {
        const amount = t.total_amount || (t as any).amount || 0;
        targetBucket.netSales += amount;
        targetBucket.transactionCount += 1;
      }
    });

    hours.forEach((bucket) => {
      bucket.avgTransaction =
        bucket.transactionCount > 0 ? bucket.netSales / bucket.transactionCount : 0;
    });

    return hours;
  }, [transactions]);

  const handleExportCSV = () => {
    const headers = ['Time Range', 'Net Sales', 'Transaction Count', 'Avg Transaction'];
    const csvContent = [
      headers.join(','),
      ...chartData.map(
        (row) =>
          `"${row.timeRange}","${row.netSales.toFixed(2)}","${row.transactionCount}","${row.avgTransaction.toFixed(2)}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Hourly_Sales_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Activity Logging
    logUserActivity({
      profile,
      actionType: 'EXPORT',
      actionDetails: `Exported Hourly Sales Report (CSV) for ${selectedDate}`,
      entityType: 'report',
      entityId: 'hourly-sales-csv'
    });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Hourly Sales Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date: ${selectedDate}`, 14, 30);

    const tableColumns = ['Time Range', 'Transactions', 'Net Sales (PHP)', 'Avg Transaction (PHP)'];
    const tableRows = chartData.map((row) => [
      row.timeRange,
      row.transactionCount.toString(),
      row.netSales.toFixed(2),
      row.avgTransaction.toFixed(2)
    ]);

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 36,
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [27, 42, 71] },
      alternateRowStyles: { fillColor: [249, 251, 252] }
    });

    doc.save(`Hourly_Sales_${selectedDate}.pdf`);

    // Activity Logging
    logUserActivity({
      profile,
      actionType: 'EXPORT',
      actionDetails: `Exported Hourly Sales Report (PDF) for ${selectedDate}`,
      entityType: 'report',
      entityId: 'hourly-sales-pdf'
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="hs-tooltip">
          <p className="hs-tooltip-title">{label}</p>
          <p className="hs-tooltip-line hs-tooltip-line-sales">
            Net Sales: ₱{data.netSales.toFixed(2)}
          </p>
          <p className="hs-tooltip-line hs-tooltip-line-transactions">
            Transactions: {data.transactionCount}
          </p>
          <p className="hs-tooltip-line hs-tooltip-line-average">
            Avg Order: ₱{data.avgTransaction.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="hs-view hs-rise-up">
      <div className="hs-shell">
        <div className="hs-header">
          <div>
            <p className="hs-eyebrow">REPORTING</p>
            <h1 className="hs-title">Hourly Sales Report</h1>
            <p className="hs-subtitle">Average sales volume by time of day</p>
          </div>

          <div className="hs-action-buttons">
            <button className="hs-btn hs-btn-secondary" onClick={handleExportCSV}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Export (CSV)
            </button>
            <button className="hs-btn hs-btn-secondary" onClick={handleExportPDF}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              Export (PDF)
            </button>
            <button className="hs-btn hs-btn-primary" onClick={() => window.print()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              Print
            </button>
          </div>
        </div>

        <div className="hs-card hs-filter-card">
          <div className="hs-filter-top">
            <span className="hs-filter-label">Date Range</span>
          </div>

          <div className="hs-filter-body">
            <div className="hs-date-control">
              <span className="hs-date-prefix">Select Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="hs-date-input"
              />
            </div>
          </div>
        </div>

        <div className="hs-card">
          <div className="hs-card-head">
            <h3 className="hs-card-title">Hourly Sales Report (Chart View)</h3>
          </div>

          {loading ? (
            <div className="inline-loading-container">
              <div className="inline-spinner"></div>
              <div className="inline-loading-text">Loading sales data...</div>
            </div>
          ) : (
            <div className="hs-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid stroke="#e9f0f6" vertical={false} />
                  <XAxis
                    dataKey="timeRange"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#dbe4ef' }}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    orientation="left"
                    tick={{ fontSize: 11, fill: '#01a2ad' }}
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value: 'Transaction Count',
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#01a2ad',
                      fontSize: 12,
                      dy: 50
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#1b2a47' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₱${val}`}
                    label={{
                      value: 'Net Sales',
                      angle: 90,
                      position: 'insideRight',
                      fill: '#1b2a47',
                      fontSize: 12,
                      dy: -30
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="netSales"
                    name="Net Sales"
                    fill="#1b2a47"
                    barSize={36}
                    radius={[5, 5, 0, 0]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="transactionCount"
                    name="Transaction Count"
                    stroke="#01a2ad"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#01a2ad', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="hs-card">
          <div className="hs-card-head">
            <h3 className="hs-card-title">Hourly Sales (Table View)</h3>
          </div>

          <div className="hs-table-wrap">
            <table className="hs-table">
              <thead>
                <tr>
                  <th>Hour</th>
                  <th className="align-right">Transactions</th>
                  <th className="align-right">Net Sales</th>
                  <th className="align-right">Avg Transaction</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.hourNumber}>
                    <td className="hs-hour-cell">{row.timeRange}</td>
                    <td className="align-right">{row.transactionCount}</td>
                    <td className="align-right strong">₱{row.netSales.toFixed(2)}</td>
                    <td className="align-right">₱{row.avgTransaction.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HourlySalesReportView;