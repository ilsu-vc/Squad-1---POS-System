'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { productApi } from '../services/productApi';
import { ArrowRightLeft, PackageCheck, Truck, Building2, ClipboardList, Boxes } from 'lucide-react';
import './StockBranchTransfer.css';

interface StockBranchTransferProps {
  products?: any[];
  profile?: any;
  canRequestTransfer: boolean;
  onInventoryUpdated?: () => Promise<void> | void;
}

interface TransferRequest {
  id: number;
  product_id: number | null;
  product_name: string;
  quantity_transfer: number;
  transfer_status: 'Pending' | 'Approved' | 'In-Transit' | 'Received' | 'Cancelled';
  requested_by: string;
  destination_branch_id: number | null;
  destination_branch_name: string | null;
  created_at: string;
}

interface StoreBranch {
  id: number;
  branch_name: string;
}

const STATUS_OPTIONS = ['All', 'Pending', 'Approved', 'In-Transit', 'Received', 'Cancelled'];
const EDITABLE_STATUS_OPTIONS = ['Pending', 'Approved', 'In-Transit', 'Received', 'Cancelled'];

const StockBranchTransfer: React.FC<StockBranchTransferProps> = ({
  products = [],
  profile,
  canRequestTransfer,
  onInventoryUpdated,
}) => {
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [branches, setBranches] = useState<StoreBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);

  const [activeStatus, setActiveStatus] = useState('All');

  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [quantityTransfer, setQuantityTransfer] = useState('');
  const [selectedTransferStatus, setSelectedTransferStatus] =
    useState<TransferRequest['transfer_status']>('Pending');

  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);

  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  const productDropdownRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const safeProducts = Array.isArray(products) ? products : [];

  const isAdmin =
    profile?.role === 'admin' ||
    profile?.role === 'Admin' ||
    profile?.user_role === 'admin' ||
    profile?.user_role === 'Admin';

  const currentRequesterName =
    profile?.full_name ||
    profile?.fullname ||
    profile?.name ||
    profile?.fullName ||
    'Unknown User';

  const fetchTransferRequests = async () => {
    try {
      setLoadingRequests(true);

      const result: any = await productApi.getTransfers();
      const { transfers: data, error } = result;

      if (error) throw error;

      setRequests((data || []) as TransferRequest[]);
    } catch (err: any) {
      console.error('Error fetching transfer requests:', err);
      alert(err.message || 'Failed to load transfer requests.');
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);

      const data = await productApi.getBranches();
      const error = null;

      if (error) throw error;

      setBranches((data || []) as StoreBranch[]);
    } catch (err: any) {
      console.error('Error fetching branches:', err);
      alert(err.message || 'Failed to load branches.');
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchTransferRequests();
      fetchBranches();
    }
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setProductDropdownOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setBranchDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRequests = useMemo(() => {
    if (activeStatus === 'All') return requests;
    return requests.filter((req) => req.transfer_status === activeStatus);
  }, [requests, activeStatus]);

  const totalRequests = requests.length;
  const totalPending = requests.filter((r) => r.transfer_status === 'Pending').length;
  const totalApproved = requests.filter((r) => r.transfer_status === 'Approved').length;
  const totalInTransit = requests.filter((r) => r.transfer_status === 'In-Transit').length;
  const totalReceived = requests.filter((r) => r.transfer_status === 'Received').length;

  const totalTransferUnits = requests.reduce(
    (sum, req) => sum + (Number(req.quantity_transfer) || 0),
    0
  );

  const selectedProduct = safeProducts.find(
    (p) => String(p.id) === String(selectedProductId)
  );

  const selectedBranch = branches.find(
    (b) => String(b.id) === String(selectedBranchId)
  );

  const resetForm = () => {
    setSelectedProductId('');
    setSelectedBranchId('');
    setQuantityTransfer('');
    setSelectedTransferStatus('Pending');
    setEditingRequestId(null);
    setProductDropdownOpen(false);
    setBranchDropdownOpen(false);
    setStatusDropdownOpen(false);
  };

  const handleOpenRequestModal = () => {
    resetForm();
    setIsRequestModalOpen(true);
  };

  const handleOpenEditModal = (request: TransferRequest) => {
    setEditingRequestId(request.id);
    setSelectedProductId(String(request.product_id ?? ''));
    setSelectedBranchId(String(request.destination_branch_id ?? ''));
    setQuantityTransfer(String(request.quantity_transfer ?? ''));
    setSelectedTransferStatus(request.transfer_status);
    setIsRequestModalOpen(true);
  };

  const handleCloseRequestModal = () => {
    setIsRequestModalOpen(false);
    resetForm();
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const chosenProduct = safeProducts.find(
        (product) => String(product.id) === String(selectedProductId)
      );

      if (!chosenProduct) {
        alert('Please select a product.');
        return;
      }

      const chosenBranch = branches.find(
        (branch) => String(branch.id) === String(selectedBranchId)
      );

      if (!chosenBranch) {
        alert('Please select the destination branch.');
        return;
      }

      const qty = Number(quantityTransfer);

      if (!qty || qty <= 0) {
        alert('Please enter a valid transfer quantity.');
        return;
      }

      if (editingRequestId === null) {
        const result: any = await productApi.createTransfer({
          product_id: chosenProduct.id,
          product_name: chosenProduct.name,
          quantity_transfer: qty,
          transfer_status: 'Pending',
          requested_by: currentRequesterName,
          destination_branch_id: chosenBranch.id,
          destination_branch_name: chosenBranch.branch_name,
        });
        const { error } = result;

        if (error) throw error;

        alert('Transfer request created successfully.');
      } else {
        if (!isAdmin) {
          alert('Only admin can edit transfer requests.');
          return;
        }

        const result: any = await productApi.updateTransfer(editingRequestId, {
          transfer_status: selectedTransferStatus,
          quantity_transfer: qty,
        });
        const { error } = result;

        if (error) throw error;

        alert('Transfer request updated successfully.');
      }
      await fetchTransferRequests();

      if (typeof onInventoryUpdated === 'function') {
        await onInventoryUpdated();
      }

      handleCloseRequestModal();
    } catch (err: any) {
      console.error('Error saving transfer request:', err);
      alert(err.message || 'Failed to save transfer request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!isAdmin) {
      alert('Only admin can cancel transfer requests.');
      return;
    }

    if (editingRequestId === null) {
      alert('No request selected.');
      return;
    }

    const chosenProduct = safeProducts.find(
      (product) => String(product.id) === String(selectedProductId)
    );

    const chosenBranch = branches.find(
      (branch) => String(branch.id) === String(selectedBranchId)
    );

    const qty = Number(quantityTransfer);

    if (!chosenProduct || !chosenBranch || !qty || qty <= 0) {
      alert('Request details are incomplete.');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to cancel this transfer request?');
    if (!confirmed) return;

    try {
      setSubmitting(true);

      const { error } = await supabase.rpc('update_transfer_request_with_stock', {
        p_request_id: editingRequestId,
        p_product_id: Number(chosenProduct.id),
        p_product_name: chosenProduct.name,
        p_quantity_transfer: qty,
        p_destination_branch_id: Number(chosenBranch.id),
        p_destination_branch_name: chosenBranch.branch_name,
        p_transfer_status: 'Cancelled',
      });

      if (error) throw error;

      alert('Transfer request cancelled successfully.');

      await fetchTransferRequests();

      if (typeof onInventoryUpdated === 'function') {
        await onInventoryUpdated();
      }

      handleCloseRequestModal();
    } catch (err: any) {
      console.error('Error cancelling transfer request:', err);
      alert(err.message || 'Failed to cancel transfer request.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';

    const date = new Date(dateString);

    return date.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'low-stock';
      case 'Approved':
        return 'in-stock';
      case 'In-Transit':
        return 'low-stock';
      case 'Received':
        return 'in-stock';
      case 'Cancelled':
        return 'out-stock';
      default:
        return 'in-stock';
    }
  };

  return (
    <div className="sbt-view sbt-rise-up">
      <div className="sbt-shell">
        <div className="sbt-topbar">
          <div>
            <p className="sbt-eyebrow">INVENTORY</p>
            <h2 className="sbt-title">Branch Transfer Stock</h2>
          </div>

          {canRequestTransfer && (
            <button className="sbt-primary-btn" onClick={handleOpenRequestModal}>
              <ArrowRightLeft size={16} />
              Request Transfer
            </button>
          )}
        </div>

        <div className="sbt-stats-grid">
          <div className="sbt-stat-card sbt-surface sbt-surface-hover">
            <div className="sbt-stat-icon-wrap">
              <ClipboardList size={20} className="sbt-stat-icon" />
            </div>
            <div>
              <p className="sbt-stat-label">Number of Requests</p>
              <h2 className="sbt-stat-value">{totalRequests}</h2>
            </div>
          </div>

          <div className="sbt-stat-card sbt-surface sbt-surface-hover">
            <div className="sbt-stat-icon-wrap">
              <Boxes size={20} className="sbt-stat-icon" />
            </div>
            <div>
              <p className="sbt-stat-label">Pending</p>
              <h2 className="sbt-stat-value">{totalPending}</h2>
            </div>
          </div>

          <div className="sbt-stat-card sbt-surface sbt-surface-hover">
            <div className="sbt-stat-icon-wrap">
              <PackageCheck size={20} className="sbt-stat-icon" />
            </div>
            <div>
              <p className="sbt-stat-label">Approved</p>
              <h2 className="sbt-stat-value">{totalApproved}</h2>
            </div>
          </div>

          <div className="sbt-stat-card sbt-surface sbt-surface-hover">
            <div className="sbt-stat-icon-wrap">
              <Truck size={20} className="sbt-stat-icon" />
            </div>
            <div>
              <p className="sbt-stat-label">In-Transit</p>
              <h2 className="sbt-stat-value">{totalInTransit}</h2>
            </div>
          </div>

          <div className="sbt-stat-card sbt-surface sbt-surface-hover">
            <div className="sbt-stat-icon-wrap">
              <PackageCheck size={20} className="sbt-stat-icon" />
            </div>
            <div>
              <p className="sbt-stat-label">Received</p>
              <h2 className="sbt-stat-value">{totalReceived}</h2>
            </div>
          </div>

          <div className="sbt-stat-card sbt-surface sbt-surface-hover">
            <div className="sbt-stat-icon-wrap">
              <Building2 size={20} className="sbt-stat-icon" />
            </div>
            <div>
              <p className="sbt-stat-label">Total Stock to Transfer</p>
              <h2 className="sbt-stat-value">{totalTransferUnits}</h2>
            </div>
          </div>
        </div>

        <div className="sbt-filter-bar">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              className={activeStatus === status ? 'sbt-filter-btn active' : 'sbt-filter-btn'}
              onClick={() => setActiveStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="sbt-table-wrap sbt-surface">
          <table className="sbt-table">
            <thead>
              <tr>
                <th>Transfer ID</th>
                <th>Product Name</th>
                <th>Quantity Transfer</th>
                <th>Destination Branch</th>
                <th>Transfer Status</th>
                <th>Date and Time</th>
                <th>Requested By</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loadingRequests ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="sbt-empty-row">
                    Loading transfer requests...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="sbt-empty-row">
                    No transfer requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.id}</td>
                    <td className="sbt-strong-cell">{request.product_name}</td>
                    <td>{request.quantity_transfer}</td>
                    <td>{request.destination_branch_name || '-'}</td>
                    <td className={`status-cell ${getStatusClass(request.transfer_status)}`}>
                      <span className={`stock-badge ${getStatusClass(request.transfer_status)}`}>
                        {request.transfer_status}
                      </span>
                    </td>
                    <td>{formatDateTime(request.created_at)}</td>
                    <td>{request.requested_by}</td>

                    {isAdmin && (
                      <td>
                        {request.transfer_status !== 'Received' &&
                        request.transfer_status !== 'Cancelled' ? (
                          <button
                            type="button"
                            className="sbt-secondary-btn"
                            onClick={() => handleOpenEditModal(request)}
                          >
                            Edit
                          </button>
                        ) : null}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isRequestModalOpen && (
        <div className="modal-overlay">
          <div className="stock-transfer-modal sbt-modal-shell">
            <div className="stock-transfer-header">
              <div>
                <p className="sbt-eyebrow">TRANSFER</p>
                <h2 className="stock-transfer-title">
                  {editingRequestId !== null ? 'Edit Transfer Request' : 'Request Transfer'}
                </h2>
                <p className="stock-transfer-subtitle">
                  {editingRequestId !== null
                    ? 'Update this branch transfer request'
                    : 'Create a new branch transfer request'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitRequest} className="stock-transfer-form">
              <div className="stock-transfer-layout">
                <div className="stock-transfer-left-card">
                  <div className="stock-transfer-form-grid">
                    <div className="stock-transfer-field">
                      <label className="stock-transfer-label">Product</label>
                      <div className="custom-dropdown-container sbt-dropdown-container" ref={productDropdownRef}>
                        <button
                          type="button"
                          className={`custom-dropdown-trigger ${productDropdownOpen ? 'active' : ''}`}
                          onClick={() => setProductDropdownOpen((prev) => !prev)}
                        >
                          <span className="sbt-dropdown-label">
                            {selectedProduct
                              ? `${selectedProduct.name} (${selectedProduct.stock || 0} in stock)`
                              : 'Select product'}
                          </span>
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

                        {productDropdownOpen && (
                          <div className="custom-dropdown-menu">
                            {safeProducts.map((product) => (
                              <div
                                key={product.id}
                                className={`dropdown-item ${String(selectedProductId) === String(product.id) ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedProductId(String(product.id));
                                  setProductDropdownOpen(false);
                                }}
                              >
                                {product.name} ({product.stock || 0} in stock)
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="stock-transfer-field">
                      <label className="stock-transfer-label">Destination Branch</label>
                      <div className="custom-dropdown-container sbt-dropdown-container" ref={branchDropdownRef}>
                        <button
                          type="button"
                          className={`custom-dropdown-trigger ${branchDropdownOpen ? 'active' : ''}`}
                          onClick={() => !loadingBranches && setBranchDropdownOpen((prev) => !prev)}
                          disabled={loadingBranches}
                        >
                          <span className="sbt-dropdown-label">
                            {loadingBranches
                              ? 'Loading branches...'
                              : selectedBranch?.branch_name || 'Select destination branch'}
                          </span>
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

                        {branchDropdownOpen && !loadingBranches && (
                          <div className="custom-dropdown-menu">
                            {branches.map((branch) => (
                              <div
                                key={branch.id}
                                className={`dropdown-item ${String(selectedBranchId) === String(branch.id) ? 'selected' : ''}`}
                                onClick={() => {
                                  setSelectedBranchId(String(branch.id));
                                  setBranchDropdownOpen(false);
                                }}
                              >
                                {branch.branch_name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="stock-transfer-field">
                      <label className="stock-transfer-label">Quantity Transfer</label>
                      <input
                        type="number"
                        min="1"
                        className="stock-transfer-input"
                        placeholder="Enter quantity"
                        value={quantityTransfer}
                        onChange={(e) => setQuantityTransfer(e.target.value)}
                        required
                      />
                    </div>

                    <div className="stock-transfer-field">
                      <label className="stock-transfer-label">Requested By</label>
                      <input
                        type="text"
                        className="stock-transfer-input stock-transfer-input-readonly"
                        value={currentRequesterName}
                        readOnly
                      />
                    </div>

                    {isAdmin && editingRequestId !== null && (
                      <div className="stock-transfer-field">
                        <label className="stock-transfer-label">Transfer Status</label>
                        <div className="custom-dropdown-container sbt-dropdown-container" ref={statusDropdownRef}>
                          <button
                            type="button"
                            className={`custom-dropdown-trigger ${statusDropdownOpen ? 'active' : ''}`}
                            onClick={() => setStatusDropdownOpen((prev) => !prev)}
                          >
                            <span className="sbt-dropdown-label">{selectedTransferStatus}</span>
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

                          {statusDropdownOpen && (
                            <div className="custom-dropdown-menu">
                              {EDITABLE_STATUS_OPTIONS.map((status) => (
                                <div
                                  key={status}
                                  className={`dropdown-item ${selectedTransferStatus === status ? 'selected' : ''}`}
                                  onClick={() => {
                                    setSelectedTransferStatus(
                                      status as TransferRequest['transfer_status']
                                    );
                                    setStatusDropdownOpen(false);
                                  }}
                                >
                                  {status}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="stock-transfer-right-panel">
                  <div className="stock-transfer-right-card">
                    <div className="stock-transfer-summary-row">
                      <span>Selected Product:</span>
                      <strong>{selectedProduct?.name || '-'}</strong>
                    </div>

                    <div className="stock-transfer-summary-row">
                      <span>Destination Branch:</span>
                      <strong>{selectedBranch?.branch_name || '-'}</strong>
                    </div>

                    <div className="stock-transfer-summary-row">
                      <span>Quantity:</span>
                      <strong>{quantityTransfer || 0}</strong>
                    </div>

                    <div className="stock-transfer-divider"></div>

                    <div className="stock-transfer-summary-row">
                      <span>Status:</span>
                      <strong>
                        {editingRequestId !== null ? selectedTransferStatus : 'Pending'}
                      </strong>
                    </div>
                  </div>

                  <div className="stock-transfer-right-bottom">
                    <div className="stock-transfer-big-label">Transfer Status</div>
                    <div className="stock-transfer-big-value">
                      {editingRequestId !== null ? selectedTransferStatus : 'Pending'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="stock-transfer-actions">
                {isAdmin &&
                  editingRequestId !== null &&
                  selectedTransferStatus !== 'Received' &&
                  selectedTransferStatus !== 'Cancelled' && (
                    <button
                      type="button"
                      className="stock-transfer-cancel-btn sbt-danger-btn"
                      onClick={handleCancelRequest}
                      disabled={submitting}
                      style={{ marginRight: 'auto' }}
                    >
                      Cancel Request
                    </button>
                  )}

                <button
                  type="button"
                  className="stock-transfer-cancel-btn"
                  onClick={handleCloseRequestModal}
                  disabled={submitting}
                >
                  Close
                </button>

                <button
                  type="submit"
                  className="stock-transfer-submit-btn"
                  disabled={submitting}
                >
                  {submitting
                    ? editingRequestId !== null
                      ? 'Saving...'
                      : 'Submitting...'
                    : editingRequestId !== null
                    ? 'Save Changes'
                    : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockBranchTransfer;