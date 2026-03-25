'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatCurrency } from '../utils/numberformatters';
import './TaggedTransactionsReportView.css';

interface Transaction {
  id: string;
  receipt_number: string | null;
  total_amount: number;
  created_at: string;
  notes: string | null;
  tags: string[] | null;
}

interface Props {
  onSwitchReport?: (report: string) => void;
}

const TaggedTransactionsReportView: React.FC<Props> = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [dateRange, setDateRange] = useState<number>(30); // Last 30 days

  const availableTags = ['All', 'Bulk Order', 'Delivery', 'Special Request'];

  const fetchTaggedTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - dateRange);
      const startDate = targetDate.toISOString();

      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select('id, receipt_number, total_amount, created_at, notes, tags')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      
      const tagged = (data || []).filter(t => (t.tags && t.tags.length > 0) || t.notes);
      setTransactions(tagged);
    } catch (err: any) {
      console.error('Error fetching tagged transactions:', err);
      setError(err.message || 'Failed to fetch tagged transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaggedTransactions();
  }, [dateRange]);

  const filteredTransactions = useMemo(() => {
    if (selectedTag === 'All') return transactions;
    return transactions.filter(t => t.tags && t.tags.includes(selectedTag));
  }, [transactions, selectedTag]);

  return (
    <div className="tagged-report-container">
      <div className="report-header">
        <div className="header-left">
          <h1 className="report-title">Tagged Transactions Report</h1>
          <p className="report-subtitle">View and filter transactions with special notes or tags</p>
        </div>
        <div className="header-actions">
          <select 
            className="modern-select" 
            value={dateRange} 
            onChange={(e) => setDateRange(Number(e.target.value))}
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      <div className="filter-bar">
        <p className="filter-label">Filter by Tag:</p>
        <div className="tag-filters">
          {availableTags.map(tag => (
            <button
              key={tag}
              className={`tag-filter-btn ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading transactions...</div>
      ) : error ? (
        <div className="error-state" style={{ padding: '40px', textAlign: 'center', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fee2e2' }}>
          <p style={{ fontWeight: 600, marginBottom: '8px' }}>Oops! Something went wrong.</p>
          <p style={{ fontSize: '14px' }}>{error}</p>
          <button 
            onClick={() => fetchTaggedTransactions()}
            style={{ marginTop: '16px', padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="empty-state">No tagged transactions found for the selected criteria.</div>
      ) : (
        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Receipt #</th>
                <th>Amount</th>
                <th>Tags</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(txn => (
                <tr key={txn.id}>
                  <td className="date-cell">
                    {new Date(txn.created_at).toLocaleDateString()}
                    <br />
                    <span className="time-text">{new Date(txn.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td>{txn.receipt_number || 'N/A'}</td>
                  <td className="amount-cell">{formatCurrency(txn.total_amount)}</td>
                  <td>
                    <div className="tag-list">
                      {txn.tags && txn.tags.map((tag, i) => (
                        <span key={i} className="report-tag-badge">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="notes-cell">
                    <div className="notes-text-wrapper" title={txn.notes || ''}>
                      {txn.notes || <span className="no-notes">No notes</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TaggedTransactionsReportView;
