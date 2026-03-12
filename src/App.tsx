'use client';

import { useState } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

// Number format utility
import { formatCurrency } from './utils/numberformatters';

// ── Navigation Icons ──
import dashboard_CI from './assets/images/dashboard_CI.png';
import POS_CI from './assets/images/POS_CI.png';
import history_CI from './assets/images/history_CI.png';

// ── Payment Icons (passed to PaymentModal) ──
import cash_icon from './assets/images/cash_icon.png';
import card_icon from './assets/images/card_icon.png';
import mobile_icon from './assets/images/mobile_icon.png';

// ── Data ──
import { products, categories, Product } from './data/products';

// ── View Components ──
import DashboardView from './components/DashboardView';
import HistoryView from './components/HistoryView';
import POSView from './components/POSView';
import PaymentModal from './components/PaymentModal';
import ReprintModal from './components/ReprintModal';
import { printReceipt } from './utils/printer-service';
import { useBarcodeScanner } from './utils/useBarcodeScanner';
import { Transaction } from './utils/chartHelpers';
import { useTransactionHold } from './hooks/useTransactionHold';
import HeldTransactionsModal from './components/HeldTransactionsModal';

interface CartItem extends Product {
    quantity: number;
}

const getImgSrc = (img: any): string => {
    return typeof img === 'string' ? img : img?.src ?? '';
};

const App: React.FC = () => {

    // ─────────────────────────────────────────────────────────
    //  State
    // ─────────────────────────────────────────────────────────
    const [dbTransactionId, setDbTransactionId] = useState<string | null>(null);
    const [dbReceiptNumber, setDbReceiptNumber] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [historySearch, setHistorySearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeTab, setActiveTab] = useState('POS');
    const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
    const [cashReceived, setCashReceived] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('idle');
    const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
    const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
    const [appAlert, setAppAlert] = useState<{isOpen: boolean; title: string; message: string}>({isOpen: false, title: '', message: ''});

    const [transactions, setTransactions] = useState<Transaction[]>(() => {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem('pharma_transactions');
        return saved
            ? JSON.parse(saved)
            : [
                {
                    id: 'TXN-1771607944136',
                    date: 'Feb 21, 2026',
                    time: '1:19:04 AM',
                    amount: formatCurrency(12.31),
                    rawAmount: 12.31,
                    method: 'Mobile Payment',
                    itemsCount: 1,
                    items: [{ name: 'Cough Syrup', qty: 1, price: 10.99, category: 'OTC Medications' }],
                    subtotal: 10.99,
                    tax: 1.32,
                    hour: '1AM',
                },
            ];
    });


    // ─────────────────────────────────────────────────────────
    //  Derived / Computed Values
    // ─────────────────────────────────────────────────────────
    const filteredProducts = products.filter(
        (p) =>
            (activeCategory === 'All' || p.category === activeCategory) &&
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const tax = Math.round(subtotal * 0.12 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const changeAmount = cashReceived ? Math.max(0, parseFloat(cashReceived) - total) : 0;


    // ─────────────────────────────────────────────────────────
    //  Hooks & Effects
    // ─────────────────────────────────────────────────────────
    const { heldTransactions, holdCart, removeHold, resumeHold } = useTransactionHold();

    // ─────────────────────────────────────────────────────────
    //  Cart Handlers
    // ─────────────────────────────────────────────────────────
    const addToCart = (product: Product) => {
        const exists = cart.find((item) => item.id === product.id);
        if (exists) {
            setCart(cart.map((item) =>
                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const updateQty = (id: number, delta: number) => {
        setCart(cart.map((item) =>
            item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        ));
    };

    const handleHoldCart = () => {
        const { success, message } = holdCart(cart, total);
        if (success) {
            setCart([]);
            setAppAlert({ isOpen: true, title: 'Success', message: 'Order placed on hold.' });
        } else {
            setAppAlert({ isOpen: true, title: 'Notice', message: message || 'Failed to place order on hold.' });
        }
    };

    const handleResumeHold = (id: string) => {
        if (cart.length > 0) {
            if (!window.confirm('Your current cart has items. Resuming a hold will clear your current cart. Proceed?')) {
                return;
            }
        }
        const resumedCart = resumeHold(id);
        if (resumedCart) setCart(resumedCart);
    };

    // ─────────────────────────────────────────────────────────
    //  Barcode Scanner Handler
    // ─────────────────────────────────────────────────────────
    const handleBarcodeScan = (scannedCode: string) => {
        const productFound = products.find(p => p.barcode === scannedCode);

        if (productFound) {
            addToCart(productFound);
        } else {
            alert(`Product not found! Scanned Code: ${scannedCode}`);
        }
    };

    // Activate the scanner listener
    useBarcodeScanner(handleBarcodeScan);

    // ─────────────────────────────────────────────────────────
    //  History Handlers
    // ─────────────────────────────────────────────────────────
    const toggleHistoryItem = (id: string) => setExpandedTxn(expandedTxn === id ? null : id);


    // ─────────────────────────────────────────────────────────
    //  Payment Handlers
    // ─────────────────────────────────────────────────────────
    const closePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setPaymentMethod(null);
        setCashReceived('');
        setPaymentStatus('idle');
        if (paymentStatus === 'success') setCart([]);
    };

    const handleProceedToPayment = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .insert({ status: 'pending' })
                .select('id')
                .single();

            if (error) throw error;

            setDbTransactionId(data.id);
            setDbReceiptNumber(null);
            setIsPaymentModalOpen(true);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to create transaction.');
        }
    };

    // Mapping for discount types (for database)
    const discountTypeMap: Record<string, string> = {
        none: 'None',
        pwd: 'PWD',
        senior: 'Senior Citizen',
    };

    const handleCompletePayment = async (details: any = {}) => {
        if (!dbTransactionId) {
            alert('No DB transaction found. Click Proceed to Payment again.');
            return;
        }

        const {
            customerName = '',
            discountType = 'none',
            discountAmount = 0,
            finalTotal = total,
        } = details;

        const normalizedDiscountType = discountTypeMap[discountType] || 'None';

        try {
            // 1) Confirm payment + issue receipt in ONE RPC
            const itemsPayload = cart.map((item) => ({
                name: item.name,
                category: item.category ?? null,
                unit_price: Number(item.price),
                quantity: Number(item.quantity),
            }));

            const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

            const { data: receiptRows, error: rpcErr } = await supabase.rpc(
                'confirm_payment_and_issue_receipt',
                {
                    p_transaction_id: dbTransactionId,
                    p_vat: Number(tax ?? 0),
                    p_subtotal: Number(subtotal ?? 0),
                    p_total_amount: Number(finalTotal ?? total ?? 0),
                    p_payment_method: paymentMethod,
                    p_items_count: itemsCount,
                    p_items: itemsPayload,
                    p_discount_type: normalizedDiscountType,
                    p_discount_amount: Number(discountAmount ?? 0),
                }
            );

            if (rpcErr) throw rpcErr;

            const receipt = Array.isArray(receiptRows) ? receiptRows[0] : receiptRows;
            const receiptNo = receipt?.o_receipt_number ?? null;
            setDbReceiptNumber(receiptNo);

            // 2) Update local transaction history
            const now = new Date();
            const h = now.getHours();
            const formattedHour =
                h >= 12
                    ? h === 12 ? '12PM' : h - 12 + 'PM'
                    : h === 0 ? '12AM' : h + 'AM';

            const methodMap: Record<string, string> = {
                cash: 'Cash Payment',
                card: 'Credit/Debit Card',
                mobile: 'Mobile Payment',
            };

            const newTransaction: Transaction = {
                id: dbTransactionId,
                receiptNumber: receiptNo,
                date: now.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                }),
                time: now.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                }),
                hour: formattedHour,
                amount: `₱${finalTotal.toFixed(2)}`,
                rawAmount: finalTotal,
                method: methodMap[paymentMethod!],
                itemsCount,
                items: cart.map((item) => ({
                    name: item.name,
                    qty: item.quantity,
                    price: item.price,
                    category: item.category,
                })),
                subtotal,
                tax,
                customerName,
                discountType: normalizedDiscountType,
                discountAmount,
            };

            setTransactions([newTransaction, ...transactions]);
            setPaymentStatus('success');
            printReceipt({
                receiptNumber: newTransaction.receiptNumber ?? undefined,
                items: newTransaction.items,
                vatable: newTransaction.subtotal,
                vatAmount: newTransaction.tax,
                total: newTransaction.rawAmount,
            });
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to complete payment / generate receipt.');
        }
    };

    const handleCancelPayment = async () => {
        if (!dbTransactionId) {
            setIsPaymentModalOpen(false);
            return;
        }

        try {
            const { error } = await supabase
                .from('transactions')
                .update({ status: 'cancelled' })
                .eq('id', dbTransactionId);

            if (error) throw error;

            setPaymentStatus('idle');
            setDbReceiptNumber(null);
            setDbTransactionId(null);
            setIsPaymentModalOpen(false);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Failed to cancel transaction.');
        }
    };


    // ─────────────────────────────────────────────────────────
    //  Render
    // ─────────────────────────────────────────────────────────
    return (
        <div className="pos-container">

            {/* ── Navigation ── */}
            <header className="main-nav">
                <h1 className="logo">PharmaCare Drugstore POS</h1>
                <div className="nav-actions">
                    <button className={activeTab === 'Dashboard' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('Dashboard')}>
                        <img src={getImgSrc(dashboard_CI)} alt="" /> Dashboard
                    </button>
                    <button className={activeTab === 'POS' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('POS')}>
                        <img src={getImgSrc(POS_CI)} alt="" /> POS
                    </button>
                    <button className={activeTab === 'History' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('History')}>
                        <img src={getImgSrc(history_CI)} alt="" /> History
                    </button>
                </div>
            </header>

            {/* ── Tab Views ── */}
            {activeTab === 'Dashboard' && (
                <DashboardView transactions={transactions} />
            )}

            {activeTab === 'History' && (
                <HistoryView
                    transactions={transactions}
                    historySearch={historySearch}
                    setHistorySearch={setHistorySearch}
                    expandedTxn={expandedTxn}
                    toggleHistoryItem={toggleHistoryItem}
                    setIsReprintModalOpen={setIsReprintModalOpen}
                />
            )}

            {activeTab === 'POS' && (
                <POSView
                    cart={cart}
                    setCart={setCart}
                    filteredProducts={filteredProducts}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    categories={categories}
                    activeCategory={activeCategory}
                    setActiveCategory={setActiveCategory}
                    addToCart={addToCart}
                    updateQty={updateQty}
                    subtotal={subtotal}
                    tax={tax}
                    total={total}
                    handleProceedToPayment={handleProceedToPayment}
                    onHoldCart={handleHoldCart}
                    onViewHeld={() => setIsHeldModalOpen(true)}
                    heldCount={heldTransactions.length}
                />
            )}

            {/* ── Modals ── */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                total={total}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                cashReceived={cashReceived}
                setCashReceived={setCashReceived}
                changeAmount={changeAmount}
                paymentStatus={paymentStatus}
                dbTransactionId={dbTransactionId}
                dbReceiptNumber={dbReceiptNumber}
                handleCancelPayment={handleCancelPayment}
                handleCompletePayment={handleCompletePayment}
                closePaymentModal={closePaymentModal}
                icons={{ cash_icon, card_icon, mobile_icon }}
            />

            <ReprintModal
                isOpen={isReprintModalOpen}
                onClose={() => setIsReprintModalOpen(false)}
                transactions={transactions}
            />

            <HeldTransactionsModal
                isOpen={isHeldModalOpen}
                onClose={() => setIsHeldModalOpen(false)}
                heldTransactions={heldTransactions}
                onResume={handleResumeHold}
                onDelete={removeHold}
            />

            {/* ── App Alert Modal ── */}
            {appAlert.isOpen && (
                <div className="confirm-overlay" onClick={() => setAppAlert({ ...appAlert, isOpen: false })}>
                    <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="confirm-title">{appAlert.title}</h3>
                        <p className="confirm-message">{appAlert.message}</p>
                        <div className="confirm-actions" style={{ justifyContent: 'center' }}>
                            <button
                                className="confirm-btn confirm"
                                onClick={() => setAppAlert({ ...appAlert, isOpen: false })}
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default App;
