import { useState } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

// ── Navigation Icons ──
import dashboard_CI from './assets/images/dashboard_CI.png';
import POS_CI       from './assets/images/POS_CI.png';
import history_CI   from './assets/images/history_CI.png';

// ── Payment Icons (passed to PaymentModal) ──
import cash_icon   from './assets/images/cash_icon.png';
import card_icon   from './assets/images/card_icon.png';
import mobile_icon from './assets/images/mobile_icon.png';

// ── Data ──
import { products, categories } from './data/products';

// ── View Components ──
import DashboardView from './components/DashboardView';
import HistoryView   from './components/HistoryView';
import POSView       from './components/POSView';
import PaymentModal  from './components/PaymentModal';
import ReprintModal  from './components/ReprintModal';


const App = () => {

  // ─────────────────────────────────────────────────────────
  //  State
  // ─────────────────────────────────────────────────────────
  const [dbTransactionId,    setDbTransactionId]    = useState(null);
  const [dbReceiptNumber,    setDbReceiptNumber]    = useState(null);
  const [cart,               setCart]               = useState([]);
  const [searchQuery,        setSearchQuery]        = useState('');
  const [historySearch,      setHistorySearch]      = useState('');
  const [activeCategory,     setActiveCategory]     = useState('All');
  const [activeTab,          setActiveTab]          = useState('POS');
  const [expandedTxn,        setExpandedTxn]        = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod,      setPaymentMethod]      = useState(null);
  const [cashReceived,       setCashReceived]       = useState('');
  const [paymentStatus,      setPaymentStatus]      = useState('idle');
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('pharma_transactions');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'TXN-1771607944136',
            date: 'Feb 21, 2026',
            time: '1:19:04 AM',
            amount: '₱12.31',
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

  const subtotal     = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax          = Math.round(subtotal * 0.12 * 100) / 100;
  const total        = Math.round((subtotal + tax) * 100) / 100;
  const changeAmount = cashReceived ? Math.max(0, parseFloat(cashReceived) - total) : 0;


  // ─────────────────────────────────────────────────────────
  //  Cart Handlers
  // ─────────────────────────────────────────────────────────
  const addToCart = (product) => {
    const exists = cart.find((item) => item.id === product.id);
    if (exists) {
      setCart(cart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };


  // ─────────────────────────────────────────────────────────
  //  History Handlers
  // ─────────────────────────────────────────────────────────
  const toggleHistoryItem = (id) => setExpandedTxn(expandedTxn === id ? null : id);


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
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to create transaction.');
    }
  };

  const handleCompletePayment = async (details = {}) => {
    if (!dbTransactionId) {
      alert('No DB transaction found. Click Proceed to Payment again.');
      return;
    }

    const {
      customerName   = '',
      discountType   = 'none',
      discountAmount = 0,
      finalTotal     = total,
    } = details;

    try {
      // 1) Mark transaction as PAID
      const { error: updErr } = await supabase
        .from('transactions')
        .update({ status: 'paid', paid_at: new Date().toISOString(), vat: Number(tax.toFixed(2)) })
        .eq('id', dbTransactionId);

      if (updErr) throw updErr;

      // 2) Generate / fetch receipt
      const { data: receiptRows, error: rpcErr } = await supabase.rpc(
        'get_or_create_receipt_for_transaction',
        { p_transaction_id: dbTransactionId }
      );

      if (rpcErr) throw rpcErr;

      const receipt  = Array.isArray(receiptRows) ? receiptRows[0] : receiptRows;
      const receiptNo = receipt?.receipt_number ?? null;
      setDbReceiptNumber(receiptNo);

      // 3) Update local transaction history
      const now = new Date();
      const h   = now.getHours();
      const formattedHour =
        h >= 12
          ? h === 12 ? '12PM' : h - 12 + 'PM'
          : h === 0  ? '12AM' : h + 'AM';

      const methodMap = { cash: 'Cash Payment', card: 'Credit/Debit Card', mobile: 'Mobile Payment' };

      const newTransaction = {
        id: dbTransactionId,
        receiptNumber: receiptNo,
        date:   now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time:   now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hour:   formattedHour,
        amount: `₱${finalTotal.toFixed(2)}`,
        rawAmount:  finalTotal,
        method:     methodMap[paymentMethod],
        itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        items: cart.map((item) => ({
          name:     item.name,
          qty:      item.quantity,
          price:    item.price,
          category: item.category,
        })),
        subtotal,
        tax,
        customerName,
        discountType,
        discountAmount,
      };

      setTransactions([newTransaction, ...transactions]);
      setPaymentStatus('success');
    } catch (err) {
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
    } catch (err) {
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
            <img src={dashboard_CI} alt="" /> Dashboard
          </button>
          <button className={activeTab === 'POS' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('POS')}>
            <img src={POS_CI} alt="" /> POS
          </button>
          <button className={activeTab === 'History' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('History')}>
            <img src={history_CI} alt="" /> History
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

    </div>
  );
};

export default App;
