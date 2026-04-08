'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { reportingApi } from '../services/reportingApi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiSearch,
  FiDownload,
  FiRefreshCw,
  FiActivity,
  FiClock,
  FiDatabase,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import './ActivityLogView.css';

import { UserProfile } from '../types/auth';
import { logUserActivity } from '../utils/activityLogger';

interface ActivityLogRow {
  id: number;
  user_id: string | null;
  user_email: string | null;
  action_type: string;
  action_details: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

interface ActivityLogViewProps {
  profile: UserProfile | null;
}

const ActivityLogView: React.FC<ActivityLogViewProps> = ({ profile }) => {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const result: any = await reportingApi.getActivityLogs();
      if (result.error) throw new Error(result.error);
      setLogs((result.logs || []) as ActivityLogRow[]);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const actionTypes = useMemo(() => {
    const unique = Array.from(new Set(logs.map((log) => log.action_type)));
    return unique.sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchLower = search.toLowerCase();

      const matchesSearch =
        (log.user_email || '').toLowerCase().includes(searchLower) ||
        (log.action_type || '').toLowerCase().includes(searchLower) ||
        (log.action_details || '').toLowerCase().includes(searchLower);

      const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
      const matchesDate = !dateFilter || log.created_at.slice(0, 10) === dateFilter;

      return matchesSearch && matchesAction && matchesDate;
    });
  }, [logs, search, actionFilter, dateFilter]);

  const handleExportCsv = () => {
    const headers = ['ID', 'User Email', 'Action', 'Details', 'Entity', 'Timestamp'];
    const rows = filteredLogs.map((log) => [
      log.id,
      log.user_email || '',
      log.action_type,
      log.action_details?.replace(/,/g, ' ') || '',
      log.entity_type || '',
      log.created_at,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    // Activity Logging
    logUserActivity({
      profile,
      actionType: 'EXPORT',
      actionDetails: `Exported Activity Log (CSV) with ${filteredLogs.length} entries`,
      entityType: 'report',
      entityId: 'activity-log-csv'
    });
  };

  return (
    <div className="activity-log-page">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="activity-log-view"
      >
        <div className="activity-log-shell">
          <header className="activity-log-topbar">
            <div>
              <p className="activity-log-eyebrow">POS AUDIT TRAIL</p>
              <h1 className="activity-log-title">Activity Log</h1>
              <p className="activity-log-subtitle">
                Monitor user actions, system activities, and security-relevant records.
              </p>
            </div>

            <div className="activity-log-count-card">
              <div className="activity-log-count-icon-wrap">
                <FiActivity className="activity-log-count-icon" />
              </div>
              <div className="activity-log-count-text">
                <span className="activity-log-count-number">{filteredLogs.length}</span>
                <span className="activity-log-count-label">Visible Events</span>
              </div>
            </div>
          </header>

          <div className="activity-log-stats-grid">
            <div className="activity-log-stat-card">
              <span className="activity-log-stat-label">Total Events</span>
              <h2 className="activity-log-stat-value">{logs.length}</h2>
            </div>

            <div className="activity-log-stat-card">
              <span className="activity-log-stat-label">Unique Users</span>
              <h2 className="activity-log-stat-value">{new Set(logs.map((l) => l.user_email)).size}</h2>
            </div>

            <div className="activity-log-stat-card">
              <span className="activity-log-stat-label">Action Categories</span>
              <h2 className="activity-log-stat-value">{actionTypes.length}</h2>
            </div>
          </div>

          <div className="activity-log-toolbar">
            <div className="activity-log-search-wrapper">
              <FiSearch className="activity-log-search-icon" />
              <input
                type="text"
                className="activity-log-input"
                placeholder="Search by user, action or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="activity-log-dropdown" ref={dropdownRef}>
              <button
                type="button"
                className={`activity-log-dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
              >
                <span>{actionFilter === 'all' ? 'Filter by Action' : actionFilter}</span>
                {isDropdownOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18 }}
                    className="activity-log-dropdown-menu"
                  >
                    <div
                      className={`activity-log-dropdown-item ${actionFilter === 'all' ? 'selected' : ''}`}
                      onClick={() => {
                        setActionFilter('all');
                        setIsDropdownOpen(false);
                      }}
                    >
                      All Records
                    </div>

                    {actionTypes.map((type) => (
                      <div
                        key={type}
                        className={`activity-log-dropdown-item ${actionFilter === type ? 'selected' : ''}`}
                        onClick={() => {
                          setActionFilter(type);
                          setIsDropdownOpen(false);
                        }}
                      >
                        {type}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <input
              type="date"
              className="activity-log-date-picker"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />

            <div className="activity-log-button-group">
              <button
                type="button"
                className="activity-log-btn activity-log-btn-secondary"
                onClick={handleExportCsv}
                title="Download CSV"
              >
                <FiDownload />
                <span>Export</span>
              </button>

              <button
                type="button"
                className="activity-log-btn activity-log-btn-primary"
                onClick={loadLogs}
              >
                <FiRefreshCw className={loading ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="activity-log-table-card">
            {loading ? (
              <div className="inline-loading-container">
                <div className="inline-spinner"></div>
                <div className="inline-loading-text">Fetching activity logs...</div>
              </div>
            ) : (
              <div className="activity-log-table-wrap">
                <table className="activity-log-table">
                  <thead>
                    <tr>
                      <th>USER / INITIATOR</th>
                      <th>ACTION TYPE</th>
                      <th>DESCRIPTION</th>
                      <th>ENTITY</th>
                      <th>TIMESTAMP</th>
                    </tr>
                  </thead>

                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {filteredLogs.map((log, index) => (
                        <motion.tr
                          key={log.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.24) }}
                        >
                          <td>
                            <div className="activity-log-user-cell">
                              <div className="activity-log-avatar">
                                {log.user_email?.[0].toUpperCase() || 'S'}
                              </div>
                              <div>
                                <div className="activity-log-user-name">Staff Member</div>
                                <div className="activity-log-user-email">
                                  {log.user_email || 'System Process'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="activity-log-badge">{log.action_type}</span>
                          </td>

                          <td
                            className="activity-log-details-cell"
                            title={log.action_details || ''}
                          >
                            {log.action_details || '—'}
                          </td>

                          <td>
                            <div className="activity-log-meta">
                              <FiDatabase size={13} />
                              <span>{log.entity_type || 'General'}</span>
                            </div>
                          </td>

                          <td>
                            <div className="activity-log-meta">
                              <FiClock size={13} />
                              <span>
                                {new Date(log.created_at).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}

            {filteredLogs.length === 0 && !loading && (
              <div className="activity-log-empty-state">
                No activity records match your current filters.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ActivityLogView;