'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { reportingApi } from '../services/reportingApi';
import './ShiftReportView.css';

interface ShiftUserProfile {
  full_name: string | null;
  email: string;
  role: string;
}

interface ShiftReportRow {
  id: number;
  clock_in_at: string;
  clock_out_at: string | null;
  total_hours: number | null;
  handover_notes?: string | null;
  cash_discrepancies?: string | null;
  issues?: string | null;
  pending_items?: string | null;
  user_profiles?: ShiftUserProfile | ShiftUserProfile[] | null;
}

const ShiftReportView: React.FC = () => {
  const [records, setRecords] = useState<ShiftReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getUserProfile = (record: ShiftReportRow): ShiftUserProfile | null => {
    if (!record.user_profiles) return null;
    return Array.isArray(record.user_profiles)
      ? record.user_profiles[0] ?? null
      : record.user_profiles;
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      const result: any = await reportingApi.getShiftRecords();
      if (result.error) throw new Error(result.error);
      setRecords((result.records ?? []) as unknown as ShiftReportRow[]);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const profile = getUserProfile(record);
      const fullName = profile?.full_name?.toLowerCase() || '';
      const email = profile?.email?.toLowerCase() || '';
      const searchLower = search.toLowerCase();

      const matchesSearch =
        fullName.includes(searchLower) || email.includes(searchLower);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && !record.clock_out_at) ||
        (statusFilter === 'closed' && !!record.clock_out_at);

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const stats = useMemo(
    () => ({
      totalHrs: filteredRecords.reduce((sum, record) => sum + (record.total_hours || 0), 0),
      active: records.filter((record) => !record.clock_out_at).length,
      count: filteredRecords.length,
    }),
    [filteredRecords, records]
  );

  return (
    <div className="shift-report-page">
      <div className="shift-report-container">
        <header className="shift-report-header">
          <div className="header-left">
            <h1 className="shift-title">Shift Management</h1>
            <p className="shift-subtitle">
              Monitoring real-time attendance, labor metrics, and handover notes
            </p>
          </div>

          <div className="header-right">
            <div className="user-stat-group">
              <svg
                className="user-stat-icon"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <div className="user-stat-text">
                <span className="user-stat-number">{stats.count}</span>
                <span className="user-stat-label">Total</span>
              </div>
            </div>
          </div>
        </header>

        <div className="shift-summary-grid">
          <div className="summary-card">
            <span className="summary-label">Total Labor Hours</span>
            <span className="summary-value" style={{ color: 'var(--brand-teal)' }}>
              {stats.totalHrs.toFixed(1)} <small>HRS</small>
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">Currently On Clock</span>
            <span className="summary-value">
              {stats.active} <small style={{ color: 'var(--brand-gray)' }}>STAFF</small>
            </span>
          </div>

          <div className="summary-card">
            <span className="summary-label">Avg. Shift Duration</span>
            <span className="summary-value">
              {(stats.totalHrs / (stats.count || 1)).toFixed(1)} <small>HRS</small>
            </span>
          </div>
        </div>

        <div className="shift-toolbar">
          <div className="search-wrapper">
            <svg
              className="search-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>

            <input
              type="text"
              className="shift-input-search"
              placeholder="Search by staff name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="custom-dropdown" ref={dropdownRef}>
            <div
              className={`dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span>
                {statusFilter === 'all'
                  ? 'All Records'
                  : statusFilter === 'open'
                  ? 'Active'
                  : 'Completed'}
              </span>
              <svg
                className="chevron-icon"
                style={{
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                  transition: '0.3s',
                }}
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {isDropdownOpen && (
              <div className="dropdown-menu">
                {(['all', 'open', 'closed'] as const).map((type) => (
                  <div
                    key={type}
                    className={`dropdown-item ${statusFilter === type ? 'selected' : ''}`}
                    onClick={() => {
                      setStatusFilter(type);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {type === 'all' ? 'All Records' : type === 'open' ? 'Active' : 'Completed'}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="shift-btn-refresh" onClick={loadRecords}>
            Refresh Data
          </button>
        </div>

        <div className="shift-list">
          {loading ? (
            <div className="inline-loading-container">
              <div className="inline-spinner"></div>
              <div className="inline-loading-text">Fetching secure records...</div>
            </div>
          ) : (
            filteredRecords.map((record, index) => {
              const profile = getUserProfile(record);

              return (
                <div
                  className="shift-item-row animate-slide"
                  key={record.id}
                  style={{ animationDelay: `${index * 0.04}s` }}
                >
                  <div className="user-info">
                    <div className="avatar-box">{(profile?.full_name || 'U')[0]}</div>
                    <div>
                      <div className="user-name">{profile?.full_name || 'Unknown User'}</div>
                      <div className="user-email">{profile?.email || 'No email'}</div>
                    </div>
                  </div>

                  <div className="time-capsule">
                    <div className="time-unit">
                      <label>Clock In</label>
                      <span>
                        {new Date(record.clock_in_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="time-arrow">→</div>

                    <div className="time-unit">
                      <label>Clock Out</label>
                      <span>
                        {record.clock_out_at
                          ? new Date(record.clock_out_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '--:--'}
                      </span>
                    </div>
                  </div>

                  <div className="duration-info">
                    <label>SHIFT DURATION</label>
                    <span>{(record.total_hours || 0).toFixed(2)}h</span>
                  </div>

                  <div className="status-col">
                    <span
                      className={`status-indicator ${
                        record.clock_out_at ? 'status-closed' : 'status-active'
                      }`}
                    >
                      {record.clock_out_at ? 'Completed' : 'Active'}
                    </span>
                  </div>

                  <div className="handover-notes-grid">
                    <div className="handover-note-box">
                      <label>General Notes</label>
                      <p>{record.handover_notes || '—'}</p>
                    </div>

                    <div className="handover-note-box">
                      <label>Cash Discrepancies</label>
                      <p>{record.cash_discrepancies || '—'}</p>
                    </div>

                    <div className="handover-note-box">
                      <label>Issues</label>
                      <p>{record.issues || '—'}</p>
                    </div>

                    <div className="handover-note-box">
                      <label>Pending Items</label>
                      <p>{record.pending_items || '—'}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftReportView;