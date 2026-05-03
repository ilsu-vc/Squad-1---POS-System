import React, { useEffect, useState } from 'react';
import './HeldTransactionsModal.css';
import { HeldTransaction, CartItem } from '../hooks/useTransactionHold';
import { formatCurrency } from '../utils/numberformatters';

interface HeldTransactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    heldTransactions: HeldTransaction[];
    onResume: (id: string) => void;
    onDelete: (id: string) => void;
}

const HeldTransactionsModal: React.FC<HeldTransactionsModalProps> = ({
    isOpen,
    onClose,
    heldTransactions,
    onResume,
    onDelete
}) => {
    // We use a state to force re-render every minute so the elapsed time updates
    const [, setTick] = useState(0);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const interval = setInterval(() => setTick(t => t + 1), 60000);
            return () => clearInterval(interval);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const formatElapsedTime = (createdAt: number) => {
        const diffMs = Date.now() - createdAt;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return '< 1 min ago';
        if (diffMins === 1) return '1 min ago';
        if (diffMins < 60) return `${diffMins} mins ago`;
        
        const hrs = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        return `${hrs}h ${mins}m ago`;
    };

    return (
        <div className="held-modal-overlay" onClick={onClose}>
            <div className="held-modal" onClick={e => e.stopPropagation()}>
                <div className="held-modal-header">
                    <h2>Held Orders ({heldTransactions.length}/5)</h2>
                    <button className="held-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="held-modal-body">
                    {heldTransactions.length === 0 ? (
                        <div className="held-empty-state">
                            <h3>No Held Orders</h3>
                            <p>You have no pending orders on hold.</p>
                        </div>
                    ) : (
                        <div className="held-list">
                            {heldTransactions.map(txn => (
                                <div key={txn.id} className="held-item-card">
                                    <div className="held-item-info">
                                        <span className="held-id">{txn.id}</span>
                                        <div className="held-metrics">
                                            <span>{txn.itemCount} item{txn.itemCount !== 1 ? 's' : ''}</span>
                                            <span>&bull;</span>
                                            <span className="held-total">{formatCurrency(txn.totalAmount)}</span>
                                            <span>&bull;</span>
                                            <span className="held-time-elapsed">Hold started {formatElapsedTime(txn.createdAt)}</span>
                                        </div>
                                    </div>
                                    <div className="held-item-actions">
                                        <button 
                                            className="held-btn resume"
                                            onClick={() => {
                                                onResume(txn.id);
                                                onClose();
                                            }}
                                        >
                                            Resume
                                        </button>
                                        <button 
                                            className="held-btn delete"
                                            onClick={() => setTransactionToDelete(txn.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Confirm Modal */}
            {transactionToDelete && (
                <div className="confirm-overlay" onClick={() => setTransactionToDelete(null)} style={{ zIndex: 3000 }}>
                    <div className="confirm-modal" onClick={e => e.stopPropagation()}>
                        <h3 className="confirm-title">Delete Held Order</h3>
                        <p className="confirm-message">Are you sure you want to delete hold {transactionToDelete}?</p>
                        <div className="confirm-actions">
                            <button className="confirm-btn cancel" onClick={() => setTransactionToDelete(null)}>Cancel</button>
                            <button 
                                className="confirm-btn confirm" 
                                style={{ background: '#dc2626' }}
                                onClick={() => {
                                    onDelete(transactionToDelete);
                                    setTransactionToDelete(null);
                                }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeldTransactionsModal;
