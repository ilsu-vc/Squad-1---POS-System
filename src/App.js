import React, { useState } from 'react';
import './App.css';
import { supabase } from "./supabaseClient";
// Import Recharts components
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

import PaymentModal from './components/PaymentModal';


// Import Product Images
import medicineImg from './assets/images/medicine.png';
import vitaminsImg from './assets/images/vitamins&supplements.png';
import personalCareImg from './assets/images/personalcare.png';
import firstAidImg from './assets/images/firstaid.png';
import healthWellnessImg from './assets/images/health&wellness.png';
import babyCareImg from './assets/images/babycare.png';


// Import Icons
import dashboard_CI from './assets/images/dashboard_CI.png';
import dashboard_NCI from './assets/images/dashboard_NCI.png';
import POS_CI from './assets/images/POS_CI.png';
import POS_NCI from './assets/images/POS_NCI.png';
import history_CI from './assets/images/history_CI.png';
import history_NCI from './assets/images/history_NCI.png';
import searchIcon from './assets/images/search_icon.png';
import deleteIcon from './assets/images/delete_icon.png';


// Import Dashboard Stat Icons
import total_revenue_icon from './assets/images/total_revenue_icon.png';
import transaction_icon from './assets/images/transaction_icon.png';
import avg_transaction from './assets/images/avg_transaction.png';
import items_sold_icon from './assets/images/items_sold_icon.png';


// Import Payment Icons
import cash_icon from './assets/images/cash_icon.png';
import card_icon from './assets/images/card_icon.png';
import mobile_icon from './assets/images/mobile_icon.png';

const getPaymentMethodColor = (index) => {
  const colors = [
    "#5d7c5d",  // Light Orange for Mobile Payment
    "#5d7c5d",  // Light Blue for Credit/Debit Card
    "#5d7c5d",  // Light Green for Cash Payment
  ];
  return colors[index];
};

const getBarColor = (index) => {
  const colors = [
    "#5d7c5d",  // Lighter Green
    "#678b67",  // Light Blue
    "#73a073",  // Yellow
    "#7dab7d",  // Light Red
    "#95b495",  // Orange
    "#a3bea3",  // Blue Violet
    "#b0c8b0",  // Lime Green
    "#cce1cc",  // Tomato Red
  ];
  return colors[index % colors.length]; // Cycle through colors
};

const App = () => {
  // --- State Variables ---
  const [dbTransactionId, setDbTransactionId] = useState(null); // UUID from Supabase
  const [dbReceiptNumber, setDbReceiptNumber] = useState(null);

  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('POS');
  const [expandedTxn, setExpandedTxn] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle');

  // --- Transactions State with LocalStorage Initialization ---
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('pharma_transactions');
    return saved ? JSON.parse(saved) : [
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
        hour: '1AM'
      }
    ];
  });

  // --- New Function to determine the payment method pill class ---
  const getMethodPillClass = (method) => {
    if (method === "Credit/Debit Card") return "card";
    if (method === "Cash Payment") return "cash";
    if (method === "Mobile Payment") return "mobile";
    return "";
  };

  // --- Computed Dashboard Stats ---
  const totalRevenue = transactions.reduce((acc, curr) => acc + curr.rawAmount, 0);
  const totalItemsSold = transactions.reduce((acc, curr) => acc + curr.itemsCount, 0);
  const avgTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  // --- Dynamic Chart Data Helpers ---
  const getRevenueByHour = () => {
    const hours = [
      '12AM', '1AM', '2AM', '3AM', '4AM', '5AM', '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
      '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM'
    ];
    return hours.map(h => ({
      time: h,
      amount: transactions.filter(t => t.hour === h).reduce((acc, curr) => acc + curr.rawAmount, 0)
    }));
  };

  const getCategoryData = () => {
    const counts = {};
    transactions.forEach(t => {
      t.items.forEach(item => {
        counts[item.category] = (counts[item.category] || 0) + item.qty;
      });
    });
    const data = Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
    return data.length > 0 ? data : [{ name: 'None', value: 0 }];
  };

  const getPaymentMethodStats = () => {
    const totalCount = transactions.length;
    if (totalCount === 0) return [];
    const methods = ['Mobile Payment', 'Credit/Debit Card', 'Cash Payment'];

    const paymentMethodsData = methods.map(m => {
      const count = transactions.filter(t => t.method === m).length;
      const percentage = Math.round((count / totalCount) * 100);
      return { name: m, count, percentage };
    });

    // Add colors for each payment method
    return paymentMethodsData.map((stat, index) => ({
      ...stat,
      color: getPaymentMethodColor(index),
    }));
  };

  // Remaining code..


  const products = [
    { id: 1, name: 'Acetaminophen 500mg', price: 8.99, image: medicineImg, stock: 150, category: 'OTC Medications' },
    { id: 2, name: 'Ibuprofen 200mg', price: 9.49, image: medicineImg, stock: 200, category: 'OTC Medications' },
    { id: 3, name: 'Aspirin 81mg', price: 7.99, image: medicineImg, stock: 180, category: 'OTC Medications' },
    { id: 4, name: 'Allergy Relief (Loratadine)', price: 12.99, image: medicineImg, stock: 120, category: 'OTC Medications' },
    { id: 5, name: 'Cough Syrup', price: 10.99, image: medicineImg, stock: 85, category: 'OTC Medications' },
    { id: 6, name: 'Antacid Tablets', price: 8.49, image: medicineImg, stock: 160, category: 'OTC Medications' },
    { id: 7, name: 'Cold & Flu Relief', price: 11.99, image: medicineImg, stock: 95, category: 'OTC Medications' },
    { id: 8, name: 'Multivitamin Daily', price: 15.99, image: vitaminsImg, stock: 140, category: 'Vitamins & Supplements' },
    { id: 9, name: 'Vitamin D3 2000 IU', price: 12.99, image: vitaminsImg, stock: 110, category: 'Vitamins & Supplements' },
    { id: 10, name: 'Vitamin C 1000mg', price: 13.49, image: vitaminsImg, stock: 130, category: 'Vitamins & Supplements' },
    { id: 11, name: 'Omega-3 Fish Oil', price: 18.99, image: vitaminsImg, stock: 90, category: 'Vitamins & Supplements' },
    { id: 12, name: 'Calcium + Vitamin D', price: 14.99, image: vitaminsImg, stock: 105, category: 'Vitamins & Supplements' },
    { id: 13, name: 'Probiotic Complex', price: 24.99, image: vitaminsImg, stock: 75, category: 'Vitamins & Supplements' },
    { id: 14, name: 'Hand Sanitizer 8oz', price: 5.99, image: personalCareImg, stock: 220, category: 'Personal Care' },
    { id: 15, name: 'Toothpaste Whitening', price: 6.49, image: personalCareImg, stock: 180, category: 'Personal Care' },
    { id: 16, name: 'Mouthwash Antiseptic', price: 7.99, image: personalCareImg, stock: 140, category: 'Personal Care' },
    { id: 17, name: 'Dental Floss', price: 3.99, image: personalCareImg, stock: 200, category: 'Personal Care' },
    { id: 18, name: 'Body Lotion 16oz', price: 9.99, image: personalCareImg, stock: 100, category: 'Personal Care' },
    { id: 19, name: 'Sunscreen SPF 50', price: 12.99, image: personalCareImg, stock: 85, category: 'Personal Care' },
    { id: 20, name: 'Shampoo & Conditioner', price: 11.99, image: personalCareImg, stock: 120, category: 'Personal Care' },
    { id: 21, name: 'Adhesive Bandages (100ct)', price: 6.99, image: firstAidImg, stock: 150, category: 'First Aid' },
    { id: 22, name: 'Gauze Pads Sterile', price: 8.49, image: firstAidImg, stock: 110, category: 'First Aid' },
    { id: 23, name: 'Medical Tape', price: 4.99, image: firstAidImg, stock: 130, category: 'First Aid' },
    { id: 24, name: 'Antiseptic Wipes (50ct)', price: 7.49, image: firstAidImg, stock: 140, category: 'First Aid' },
    { id: 25, name: 'First Aid Kit', price: 24.99, image: firstAidImg, stock: 45, category: 'First Aid' },
    { id: 26, name: 'Thermometer Digital', price: 12.99, image: firstAidImg, stock: 65, category: 'First Aid' },
    { id: 27, name: 'Blood Pressure Monitor', price: 49.99, image: healthWellnessImg, stock: 35, category: 'Health & Wellness' },
    { id: 28, name: 'Glucose Test Strips (50ct)', price: 32.99, image: healthWellnessImg, stock: 55, category: 'Health & Wellness' },
    { id: 29, name: 'Heating Pad Electric', price: 29.99, image: healthWellnessImg, stock: 40, category: 'Health & Wellness' },
    { id: 30, name: 'Compression Socks', price: 16.99, image: healthWellnessImg, stock: 80, category: 'Health & Wellness' },
    { id: 31, name: 'Sleep Aid Tablets', price: 14.99, image: healthWellnessImg, stock: 95, category: 'Health & Wellness' },
    { id: 32, name: 'Eye Drops Lubricating', price: 9.99, image: healthWellnessImg, stock: 120, category: 'Health & Wellness' },
    { id: 33, name: 'Baby Diapers (Size 3)', price: 24.99, image: babyCareImg, stock: 70, category: 'Baby Care' },
    { id: 34, name: 'Baby Wipes (80ct)', price: 6.99, image: babyCareImg, stock: 150, category: 'Baby Care' },
    { id: 35, name: 'Baby Lotion 16oz', price: 8.99, image: babyCareImg, stock: 90, category: 'Baby Care' },
    { id: 36, name: 'Baby Powder', price: 5.99, image: babyCareImg, stock: 110, category: 'Baby Care' },
    { id: 37, name: 'Diaper Rash Cream', price: 7.99, image: babyCareImg, stock: 100, category: 'Baby Care' },
  ];


  const categories = ['All', 'OTC Medications', 'Vitamins & Supplements', 'Personal Care', 'First Aid', 'Health & Wellness', 'Baby Care'];


  const filteredProducts = products.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const toggleHistoryItem = (id) => setExpandedTxn(expandedTxn === id ? null : id);


  const addToCart = (product) => {
    const exists = cart.find(item => item.id === product.id);
    if (exists) {
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };


  const updateQty = (id, delta) => {
    setCart(cart.map(item => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };


  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = Math.round(subtotal * 0.12 * 100) / 100; // Round to nearest cent
  const total = Math.round((subtotal + tax) * 100) / 100; // Final total rounded to nearest cent


  const changeAmount = cashReceived ? Math.max(0, parseFloat(cashReceived) - total) : 0;


  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentMethod(null);
    setCashReceived('');
    setPaymentStatus('idle');
    if (paymentStatus === 'success') setCart([]);
  };


  const handleCompletePayment = async (paymentDetails = {}) => {
    if (!dbTransactionId) {
      alert("No DB transaction found. Click Proceed to Payment again.");
      return;
    }

    const { 
      customerName, 
      discountType, 
      discountAmount, 
      finalTotal, 
      refNo, 
      cardLast4, 
      mobileProvider 
    } = paymentDetails;

    try {
      // --- 1) mark DB transaction as PAID (ESSENTIAL) ---
      // We do this first and separately to ensure status becomes 'paid' 
      // even if other metadata columns are missing in the schema.
      const { error: statusErr } = await supabase
        .from("transactions")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          vat: Number((finalTotal * 0.12).toFixed(2))
        })
        .eq("id", dbTransactionId);

      if (statusErr) throw new Error(`Failed to update status to paid: ${statusErr.message}`);

      // --- 2) Attempt to update optional metadata (NON-ESSENTIAL) ---
      // If these columns don't exist, we skip silently to not block the receipt generation.
      try {
        await supabase
          .from("transactions")
          .update({
            customer_name: customerName,
            reference_number: refNo,
            discount_type: discountType
          })
          .eq("id", dbTransactionId);
      } catch (metaErr) {
        console.warn("Could not update optional transaction metadata:", metaErr.message);
      }

      // --- 3) call receipt function ---

      const { data: receiptRows, error: rpcErr } = await supabase.rpc(
        "get_or_create_receipt_for_transaction",
        { p_transaction_id: dbTransactionId }
      );

      if (rpcErr) throw rpcErr;

      const receipt = Array.isArray(receiptRows) ? receiptRows[0] : receiptRows;
      const receiptNo = receipt?.receipt_number ?? null;
      setDbReceiptNumber(receiptNo);

      // --- 3) local history logic ---
      const now = new Date();
      const formattedHour =
        now.getHours() >= 12
          ? now.getHours() === 12
            ? "12PM"
            : now.getHours() - 12 + "PM"
          : now.getHours() === 0
            ? "12AM"
            : now.getHours() + "AM";

      const methodMap = {
        cash: "Cash",
        card: "Card",
        mobile: "Mobile",
      };

      const newTransaction = {
        id: dbTransactionId,
        receiptNumber: receiptNo,
        date: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        hour: formattedHour,
        amount: `₱${(finalTotal || total).toFixed(2)}`,
        rawAmount: finalTotal || total,
        method: `${methodMap[paymentMethod]}${paymentMethod === 'mobile' ? ` (${mobileProvider})` : ''}`,
        itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        customerName: customerName || "Walking Customer",
        discountType: discountType || "none",
        refNo: refNo || (paymentMethod === 'card' ? cardLast4 : ''),
        items: cart.map((item) => ({
          name: item.name,
          qty: item.quantity,
          price: item.price,
          category: item.category,
        })),
        subtotal: subtotal - (discountAmount || 0), // adjusted
        tax: (finalTotal || total) * 0.12,
      };

      setTransactions([newTransaction, ...transactions]);
      setPaymentStatus("success");
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to complete payment / generate receipt.");
    }
  };


  const handleCancelPayment = async () => {
    if (!dbTransactionId) {
      setIsPaymentModalOpen(false);
      return;
    }


    try {
      const { error } = await supabase
        .from("transactions")
        .update({ status: "cancelled" })
        .eq("id", dbTransactionId);


      if (error) throw error;


      // reset local UI state
      setPaymentStatus("idle");
      setDbReceiptNumber(null);
      setDbTransactionId(null);
      setIsPaymentModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to cancel transaction.");
    }
  };


  const handleProceedToPayment = async () => {
    try {
      // Create transaction in DB (UUID auto-generated)
      const { data, error } = await supabase
        .from("transactions")
        .insert({ status: "pending" })
        .select("id")
        .single();


      if (error) throw error;


      setDbTransactionId(data.id);
      setDbReceiptNumber(null);


      // open modal
      setIsPaymentModalOpen(true);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to create transaction.");
    }
  };


  return (
    <div className="pos-container">
      <header className="main-nav">
        <h1 className="logo">PharmaCare Drugstore POS</h1>
        <div className="nav-actions">
          <button className={activeTab === 'Dashboard' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('Dashboard')}>
            <img src={activeTab === 'Dashboard' ? dashboard_CI : dashboard_NCI} alt="" /> Dashboard
          </button>
          <button className={activeTab === 'POS' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('POS')}>
            <img src={activeTab === 'POS' ? POS_CI : POS_NCI} alt="" /> POS
          </button>
          <button className={activeTab === 'History' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('History')}>
            <img src={activeTab === 'History' ? history_CI : history_NCI} alt="" /> History
          </button>
        </div>
      </header>


      {activeTab === 'Dashboard' && (
        <div className="dashboard-view">
          <div className="view-inner-container">
            <h2 className="dashboard-header-title">Dashboard Overview</h2>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-info">
                  <h3>Total Revenue</h3>
                  <p className="stat-value">₱{totalRevenue.toFixed(2)}</p>
                  <p className="stat-subtext">↗ Today</p>
                </div>
                <div className="stat-icon-bg"><img src={total_revenue_icon} alt="" className="stat-img-icon" /></div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <h3>Transactions</h3>
                  <p className="stat-value">{transactions.length}</p>
                  <p className="stat-subtext">Total orders</p>
                </div>
                <div className="stat-icon-bg"><img src={transaction_icon} alt="" className="stat-img-icon" /></div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <h3>Avg. Transaction</h3>
                  <p className="stat-value">₱{avgTransaction.toFixed(2)}</p>
                  <p className="stat-subtext">Per order</p>
                </div>
                <div className="stat-icon-bg"><img src={avg_transaction} alt="" className="stat-img-icon" /></div>
              </div>
              <div className="stat-card">
                <div className="stat-info">
                  <h3>Items Sold</h3>
                  <p className="stat-value">{totalItemsSold}</p>
                  <p className="stat-subtext">Total units</p>
                </div>
                <div className="stat-icon-bg"><img src={items_sold_icon} alt="" className="stat-img-icon" /></div>
              </div>
            </div>


            <div className="dashboard-main-grid">
              <div className="content-card">
                <h3 className="card-title">Revenue by Hour</h3>
                <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
                  <ResponsiveContainer>
                    <BarChart data={getRevenueByHour()}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500, fill: '#666' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500, fill: '#666' }} />
                      <Tooltip cursor={{ fill: '#f5f5f5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={30}>
                        {/* Add dynamic colors for each bar */}
                        {getRevenueByHour().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>


              <div className="content-card">
                <h3 className="card-title">Sales by Category</h3>
                <div style={{ width: '100%', height: '100%', minHeight: '200px' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={getCategoryData()}
                        cx="50%" cy="50%" outerRadius={60} dataKey="value"
                        labelLine={true}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {getCategoryData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#5d7c5d', '#8eb08e', '#adc7ad', '#3d523d', '#a3bfa3'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>


              <div className="content-card">
                <h3 className="card-title">Payment Methods</h3>
                <div className="payment-methods-scroll">
                  {getPaymentMethodStats().map((stat) => (
                    <div className="payment-item" key={stat.name}>
                      <div className="payment-info-row">
                        <span className="payment-label">{stat.name}</span>
                        <span className="payment-stats">{stat.count} ({stat.percentage}%)</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${stat.percentage}%`, backgroundColor: stat.color }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>


              <div className="content-card">
                <h3 className="card-title">Recent Transactions</h3>
                <div className="recent-transactions-list">
                  {transactions.slice(0, 5).map((txn) => (
                    <div
                      key={txn.id}
                      className="transaction-card"
                    >
                      <div>
                        <p className="txn-id">{txn.id}</p>
                        <p className="txn-date">{txn.time}</p>
                      </div>
                      <div className="txn-info-right">
                        <p className="txn-amount">{txn.amount}</p>
                        {/* Add dynamic class for method */}
                        <p className={`txn-method ${getMethodPillClass(txn.method)}`}>{txn.method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {activeTab === 'History' && (
        <div className="history-view">
          <div className="view-inner-container">
            <h2 className="view-title">Transaction History</h2>
            <div className="history-search-container">
              <img src={searchIcon} alt="" className="search-icon-img" />
              <input type="text" className="modern-input" placeholder="Search by transaction ID..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} />
            </div>


            <div className="history-stats-row">
              <div className="h-stat-card"><p className="h-stat-label">Total Transactions</p><h2 className="h-stat-value">{transactions.length}</h2></div>
              <div className="h-stat-card"><p className="h-stat-label">Total Revenue</p><h2 className="h-stat-value">₱{totalRevenue.toFixed(2)}</h2></div>
              <div className="h-stat-card"><p className="h-stat-label">Average Transaction</p><h2 className="h-stat-value">₱{avgTransaction.toFixed(2)}</h2></div>
            </div>


            {/* ✅ ADDED: scrollable container for many transactions */}
            <div className="history-scroll-area" style={{ maxHeight: "60vh", overflowY: "auto" }}>
              <div className="history-accordion">
                {transactions.filter(t => t.id.toLowerCase().includes(historySearch.toLowerCase())).map(txn => (
                  <div key={txn.id} className={`history-card ${expandedTxn === txn.id ? 'expanded' : ''}`}>
                    <div className="history-card-header" onClick={() => toggleHistoryItem(txn.id)}>
                      <div className="header-left">
                        <div className="id-badge-row">
                          <span className="txn-id-text">{txn.id}</span>
                          {/* ✅ CHANGED: method pill now has the right class for colors */}
                          <span className={`method-pill ${getMethodPillClass(txn.method)}`}>{txn.method}</span>
                        </div>
                        <p className="txn-meta-text">{txn.date}, {txn.time} • {txn.itemsCount} items</p>
                      </div>
                      <div className="header-right">
                        <span className="txn-total-text">{txn.amount}</span>
                        <span className={`chevron-icon ${expandedTxn === txn.id ? 'open' : ''}`}>⌵</span>
                      </div>
                    </div>
                    {expandedTxn === txn.id && (
                      <div className="history-card-body">
                          <div className="txn-meta-details" style={{ marginBottom: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '8px', fontSize: '0.9rem' }}>
                            <p><strong>Customer:</strong> {txn.customerName || 'Walking Customer'}</p>
                            {txn.discountType && txn.discountType !== 'none' && (
                              <p><strong>Discount:</strong> {txn.discountType.toUpperCase()}</p>
                            )}
                            {txn.refNo && (
                              <p><strong>Reference:</strong> {txn.refNo}</p>
                            )}
                          </div>
                          <p className="body-section-title">Items</p>
                        <div className="items-list">
                          {txn.items.map((item, idx) => (
                            <div key={idx} className="item-detail-row">
                              <div className="item-info">
                                <p className="item-name-text">{item.name}</p>
                                <p className="item-calc-text">₱{item.price} × {item.qty}</p>
                              </div>
                              <p className="item-price-sum">₱{(item.price * item.qty).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                        <div className="history-financial-summary">
                          <div className="f-row"><span>Subtotal:</span> <span>₱{txn.subtotal.toFixed(2)}</span></div>
                          <div className="f-row"><span>Tax:</span> <span>₱{txn.tax.toFixed(2)}</span></div>
                          <div className="f-row f-total"><span>Total:</span> <span>{txn.amount}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}


      {activeTab === 'POS' && (
        <main className="pos-content">
          <div className="inventory-section">
            <div className="search-box">
              <img src={searchIcon} alt="" className="search-icon-img" />
              <input type="text" className="modern-input" placeholder="Search products by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="category-bar">
              {categories.map(cat => (
                <button key={cat} className={activeCategory === cat ? 'cat-btn active' : 'cat-btn'} onClick={() => setActiveCategory(cat)}>{cat}</button>
              ))}
            </div>
            <div className="product-grid">
              {filteredProducts.map(product => (
                <div key={product.id} className="product-card">
                  <div className="img-container"><img src={product.image} alt={product.name} /></div>
                  <h3 className="product-name">{product.name}</h3>
                  <p className="cat-label">{product.category}</p>
                  <div className="card-footer">
                    <div><span className="price">₱{product.price.toFixed(2)}</span><span className="stock">Stock: {product.stock}</span></div>
                    <button className="add-btn" onClick={() => addToCart(product)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className="order-sidebar">
            <div className="sidebar-header"><h2 className="sidebar-title">Current Order</h2><button className="clear-all" onClick={() => setCart([])}>Clear All</button></div>
            <p className="item-count">{cart.length} items</p>
            <div className="cart-list">
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <div className="item-details">
                    <h4 className="cart-item-name">{item.name}</h4><p className="item-price-each">₱{item.price.toFixed(2)} each</p>
                    <div className="qty-controls">
                      <button onClick={() => updateQty(item.id, -1)}>-</button><span>{item.quantity}</span><button onClick={() => updateQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                  <div className="item-total-section">
                    <button className="delete-item" onClick={() => setCart(cart.filter(i => i.id !== item.id))}><img src={deleteIcon} alt="Delete" /></button>
                    <p className="item-total">₱{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="billing-summary">
              <div className="bill-row">
                <span>Subtotal:</span>
                <span id="display-subtotal">₱{subtotal.toFixed(2)}</span>
              </div>
              <div className="bill-row">
                <span>Tax (12%):</span>
                <span id="display-vat">₱{tax.toFixed(2)}</span>
              </div>
              <hr />
              <div className="bill-row total">
                <span>Total:</span>
                <span id="display-grand-total">₱{total.toFixed(2)}</span>
              </div>
              <button className="pay-btn" onClick={handleProceedToPayment}> Proceed to Payment</button>
            </div>
          </aside>
        </main>
      )}


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
    </div>
  );
};


export default App;
