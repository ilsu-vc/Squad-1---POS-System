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

interface Transaction {
  id: string;
  created_at: string;
  total_amount: number;
}

interface Props {
  onSwitchReport?: (report: string) => void;
}

const HourlySalesReportView: React.FC<Props> = ({ onSwitchReport }) => {
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
      const date = new Date(t.created_at);
      const hourIndex = date.getHours();
      
      const targetBucket = hours.find(h => h.hourNumber === hourIndex);
      if (targetBucket) {
        const amount = t.total_amount || (t as any).amount || 0; 
        targetBucket.netSales += amount;
        targetBucket.transactionCount += 1;
      }
    });

    hours.forEach(bucket => {
      bucket.avgTransaction = bucket.transactionCount > 0 
        ? bucket.netSales / bucket.transactionCount 
        : 0;
    });

    return hours;
  }, [transactions]);

  const handleExportCSV = () => {
    const headers = ['Time Range', 'Net Sales', 'Transaction Count', 'Avg Transaction'];
    const csvContent = [
      headers.join(','),
      ...chartData.map(row => 
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
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Hourly Sales Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Date: ${selectedDate}`, 14, 30);

    const tableColumns = ["Time Range", "Transactions", "Net Sales (PHP)", "Avg Transaction (PHP)"];
    const tableRows = chartData.map(row => [
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
      alternateRowStyles: { fillColor: [249, 251, 252] }, 
    });

    doc.save(`Hourly_Sales_${selectedDate}.pdf`);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: '#fff', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{label}</p>
          <p style={{ margin: 0, color: '#1b2a47' }}>Net Sales: ₱{data.netSales.toFixed(2)}</p>
          <p style={{ margin: 0, color: '#ef4444' }}>Transactions: {data.transactionCount}</p>
          <p style={{ margin: 0, color: '#10b981' }}>Avg Order: ₱{data.avgTransaction.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: 'transparent' }}>
      
      <div className="hs-top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '0 0 8px 0' }}>
            Hourly Sales Report
          </h1>
          <p style={{ color: '#64748b', margin: '0', fontSize: '13px' }}>Average sales volume by time of day</p>
        </div>
        
        <div className="hs-action-buttons" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button className="hs-btn" onClick={handleExportCSV}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Export (CSV)
          </button>
          <button className="hs-btn" onClick={handleExportPDF}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Export (PDF)
          </button>
          <button className="hs-btn" onClick={() => window.print()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print
          </button>
        </div>
      </div>

      {/* Date Filter Card */}
      <div className="hs-card hs-filter-section" style={{ padding: '0', marginBottom: '20px' }}>
        <div className="hs-filter-label" style={{ paddingLeft: '24px' }}>Date Range</div>
        <div style={{ flex: 1, padding: '16px' }}>
          <div className="hs-date-range" style={{ width: 'fit-content' }}>
            <span className="hs-date-range-item" style={{ color: '#cbd5e1' }}>Select Date</span>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="hs-date-range-item active" 
              style={{ border: 'none', outline: 'none', cursor: 'pointer' }}
            />
          </div>
        </div>
      </div>

      {/* Chart Card */}
      <div className="hs-card">
        <div className="hs-chart-title">Hourly Sales Report (Chart View)</div>
        {loading ? (
          <div className="inline-loading-container">
            <div className="inline-spinner"></div>
            <div className="inline-loading-text">Loading sales data...</div>
          </div>
        ) : (
          <div className="hs-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="timeRange" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} dy={10} />
                <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11, fill: '#ef4444' }} axisLine={false} tickLine={false} label={{ value: 'Transaction Count', angle: -90, position: 'insideLeft', fill: '#ef4444', fontSize: 12, dy: 50 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#1b2a47' }} axisLine={false} tickLine={false} tickFormatter={(val) => `₱${val}`} label={{ value: 'Net Sales', angle: 90, position: 'insideRight', fill: '#1b2a47', fontSize: 12, dy: -30 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar yAxisId="right" dataKey="netSales" name="Net Sales" fill="#1b2a47" barSize={40} />
                <Line yAxisId="left" type="monotone" dataKey="transactionCount" name="Transaction Count" stroke="#EA4335" strokeWidth={2} dot={{ r: 4, fill: '#EA4335', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Data Table Card */}
      <div className="hs-card">
        <div className="hs-chart-title">Hourly Sales (Table View)</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
              <th style={{ padding: '12px 8px' }}>Hour</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Transactions</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Net Sales</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Avg Transaction</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.hourNumber} style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '12px 8px', fontWeight: '500' }}>{row.timeRange}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>{row.transactionCount}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>₱{row.netSales.toFixed(2)}</td>
                <td style={{ padding: '12px 8px', textAlign: 'right' }}>₱{row.avgTransaction.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HourlySalesReportView;