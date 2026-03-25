'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, FiDownload, FiRefreshCw, 
  FiActivity, FiClock, FiDatabase, FiChevronDown, FiChevronUp 
} from 'react-icons/fi';
import './ActivityLogView.css';

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

const ActivityLogView: React.FC = () => {
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
      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs((data || []) as ActivityLogRow[]);
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
    const rows = filteredLogs.map(log => [
      log.id, log.user_email || '', log.action_type, 
      log.action_details?.replace(/,/g, ' ') || '', log.entity_type || '', log.created_at
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="al-container"
    >
      <header className="al-header">
        <div className="al-title-area">
          <h1 className="al-main-title">Activity Log</h1>
          <p className="al-subtitle">Monitoring system-wide user actions and security audits</p>
        </div>
        <div className="al-header-stats">
          <div className="al-time" style={{ fontSize: '15px', fontWeight: 600 }}>
            <FiActivity size={18} color="var(--primary-teal)" style={{ marginRight: '8px' }} />
            <span>{filteredLogs.length} Events Logged</span>
          </div>
        </div>
      </header>

      <div className="al-stats-grid">
        <div className="al-card">
          <span className="al-card-label">Total Events</span>
          <h2 className="al-card-value">{logs.length}</h2>
        </div>
        <div className="al-card">
          <span className="al-card-label">Unique Users</span>
          <h2 className="al-card-value">{new Set(logs.map(l => l.user_email)).size}</h2>
        </div>
        <div className="al-card">
          <span className="al-card-label">Action Categories</span>
          <h2 className="al-card-value">{actionTypes.length}</h2>
        </div>
      </div>

      <div className="al-toolbar">
        <div className="al-search-wrapper">
          <FiSearch className="al-search-icon" />
          <input
            type="text"
            className="al-input-search"
            placeholder="Search by user, action or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* CUSTOM DROPDOWN COMPONENT */}
        <div className="al-custom-dropdown" ref={dropdownRef}>
          <div 
            className={`al-dropdown-trigger ${isDropdownOpen ? 'active' : ''}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span>{actionFilter === 'all' ? 'Filter by Action' : actionFilter}</span>
            {isDropdownOpen ? <FiChevronUp /> : <FiChevronDown />}
          </div>
          
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="al-dropdown-menu"
              >
                <div 
                  className={`al-dropdown-item ${actionFilter === 'all' ? 'selected-item' : ''}`}
                  onClick={() => { setActionFilter('all'); setIsDropdownOpen(false); }}
                >
                  All Records
                </div>
                {actionTypes.map(type => (
                  <div 
                    key={type} 
                    className={`al-dropdown-item ${actionFilter === type ? 'selected-item' : ''}`}
                    onClick={() => { setActionFilter(type); setIsDropdownOpen(false); }}
                  >
                    {type}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input type="date" className="al-date-picker" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />

        <div className="al-button-group">
          <button className="al-btn-secondary" onClick={handleExportCsv} title="Download CSV">
            <FiDownload /> Export
          </button>
          <button className="al-btn-primary" onClick={loadLogs}>
            <FiRefreshCw className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="al-table-card">
        {loading ? (
          <div className="inline-loading-container">
            <div className="inline-spinner"></div>
            <div className="inline-loading-text">Fetching activity logs...</div>
          </div>
        ) : (
          <table className="al-table">
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
              <AnimatePresence mode='popLayout'>
                {filteredLogs.map((log, index) => (
                  <motion.tr 
                    key={log.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.4) }}
                  >
                    <td>
                      <div className="al-user-cell">
                        <div className="al-avatar">{log.user_email?.[0].toUpperCase() || 'S'}</div>
                        <div>
                          <div className="al-user-name">Staff Member</div>
                          <div className="al-user-email">{log.user_email || 'System Process'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="al-badge">{log.action_type}</span>
                    </td>
                    <td className="al-details-cell" title={log.action_details || ''}>
                      {log.action_details || '—'}
                    </td>
                    <td>
                      <div className="al-entity">
                        <FiDatabase size={13} /> {log.entity_type || 'General'}
                      </div>
                    </td>
                    <td>
                      <div className="al-time">
                        <FiClock size={13} /> 
                        {new Date(log.created_at).toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
        {filteredLogs.length === 0 && !loading && (
          <div className="al-empty-state">No activity records match your current filters.</div>
        )}
      </div>
    </motion.div>
  );
};

export default ActivityLogView;