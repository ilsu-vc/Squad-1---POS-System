'use client';

import React, { useEffect, useState } from 'react';
import { Box, RefreshCw } from 'lucide-react';
import InventoryView from './InventoryView';
import StockBranchTransfer from './StockBranchTransfer';

interface InventoryManagementViewProps {
  products?: any[];
  onInventoryUpdated?: () => Promise<void> | void;
  canEdit: boolean;
  profile?: any;
  canRequestTransfer: boolean;
}

const InventoryManagementView: React.FC<InventoryManagementViewProps> = ({
  products = [],
  onInventoryUpdated,
  canEdit,
  profile,
  canRequestTransfer,
}) => {
  const [activeInventoryTab, setActiveInventoryTab] = useState<string>('local-stock');
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const NAVBAR_HEIGHT = 106;
  const HAMBURGER_RIGHT_OFFSET = 32;
  const HAMBURGER_TOP_OFFSET = 10;

  useEffect(() => {
    setIsMounted(true);

    const savedTab = localStorage.getItem('pos_active_inventory_tab');
    if (savedTab) {
      setActiveInventoryTab(savedTab);
    }
  }, []);

  const handleSwitchInventoryTab = (tabValue: string) => {
    setActiveInventoryTab(tabValue);
    localStorage.setItem('pos_active_inventory_tab', tabValue);
    setIsSidebarOpen(false);
  };

  if (!isMounted) return null;

  const getMenuItemStyle = (tabName: string): React.CSSProperties => ({
    padding: '12px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    color: activeInventoryTab === tabName ? '#01a2ad' : '#1b2a47',
    fontWeight: '500',
    backgroundColor: activeInventoryTab === tabName ? '#ebf8f9' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  });

  return (
    <div
      style={{
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          style={{
            position: 'fixed',
            top: `${NAVBAR_HEIGHT + HAMBURGER_TOP_OFFSET}px`,
            right: `${HAMBURGER_RIGHT_OFFSET}px`,
            zIndex: 1001,
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            padding: '4px',
          }}
          aria-label="Open Inventory Menu"
        >
          <div
            style={{
              width: '26px',
              height: '3px',
              backgroundColor: '#1e293b',
              borderRadius: '2px',
            }}
          />
          <div
            style={{
              width: '26px',
              height: '3px',
              backgroundColor: '#1e293b',
              borderRadius: '2px',
            }}
          />
          <div
            style={{
              width: '26px',
              height: '3px',
              backgroundColor: '#1e293b',
              borderRadius: '2px',
            }}
          />
        </button>
      )}

      {activeInventoryTab === 'local-stock' && (
        <InventoryView
          products={products}
          onInventoryUpdated={onInventoryUpdated}
          canEdit={canEdit}
        />
      )}

      {activeInventoryTab === 'branch-transfer' && (
        <StockBranchTransfer
          products={products}
          profile={profile}
          canRequestTransfer={canRequestTransfer}
          onInventoryUpdated={onInventoryUpdated}
        />
      )}

      {isSidebarOpen && (
        <div
          style={{
            position: 'fixed',
            top: `${NAVBAR_HEIGHT}px`,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 999,
          }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div
        style={{
          position: 'fixed',
          top: `${NAVBAR_HEIGHT}px`,
          right: 0,
          width: '340px',
          height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
          boxSizing: 'border-box',
          backgroundColor: 'white',
          boxShadow: '-4px 0 15px rgba(0,0,0,0.05)',
          transform: isSidebarOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          zIndex: 1000,
          padding: '24px',
          pointerEvents: isSidebarOpen ? 'auto' : 'none',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              margin: 0,
              color: '#1e293b',
              fontWeight: 'bold',
            }}
          >
            Inventory Menu
          </h2>

          <button
            onClick={() => setIsSidebarOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '32px',
              cursor: 'pointer',
              color: '#64748b',
              lineHeight: 1,
            }}
            aria-label="Close Inventory Menu"
          >
            &times;
          </button>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li
            onClick={() => handleSwitchInventoryTab('local-stock')}
            style={getMenuItemStyle('local-stock')}
          >
            <Box size={20} />
            Local Stock Management
          </li>

          <li
            onClick={() => handleSwitchInventoryTab('branch-transfer')}
            style={getMenuItemStyle('branch-transfer')}
          >
            <RefreshCw size={20} />
            Branch Transfer Stock
          </li>
        </ul>
      </div>
    </div>
  );
};

export default InventoryManagementView;