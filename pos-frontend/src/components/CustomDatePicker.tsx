'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import './CustomDatePicker.css';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, label, placeholder = 'Select Date' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const [viewDate, setViewDate] = useState(value ? parseLocalDate(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync viewDate when value prop changes externally
  useEffect(() => {
    if (value) {
      setViewDate(parseLocalDate(value));
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateSelect = (day: number) => {
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const d = parseLocalDate(value);
    return d.getDate() === day && d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const renderDays = () => {
    const days = [];
    const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

    // Padding for start of month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="cdp-day empty" />);
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
      days.push(
        <button
          key={d}
          type="button"
          className={`cdp-day ${isSelected(d) ? 'selected' : ''} ${isToday(d) ? 'today' : ''}`}
          onClick={() => handleDateSelect(d)}
        >
          {d}
        </button>
      );
    }

    return days;
  };

  return (
    <div className="cdp-container" ref={containerRef}>
      {label && <label className="cdp-label">{label}</label>}
      
      <div className={`cdp-trigger ${isOpen ? 'active' : ''}`} onClick={() => setIsOpen(!isOpen)}>
        <CalendarIcon size={18} className="cdp-icon" />
        <span className={`cdp-value ${!value ? 'placeholder' : ''}`}>
          {value ? (() => { const d = parseLocalDate(value); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); })() : placeholder}
        </span>
        {value && (
          <button 
            className="cdp-clear" 
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="cdp-calendar-popup pprv-rise-up">
          <div className="cdp-header">
            <button type="button" onClick={handlePrevMonth} className="cdp-nav-btn">
              <ChevronLeft size={18} />
            </button>
            <span className="cdp-month-title">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button type="button" onClick={handleNextMonth} className="cdp-nav-btn">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="cdp-weekdays">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <span key={day} className="cdp-weekday">{day}</span>
            ))}
          </div>

          <div className="cdp-days-grid">
            {renderDays()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
