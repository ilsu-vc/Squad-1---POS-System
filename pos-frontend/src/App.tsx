'use client';

if (typeof window !== 'undefined') {
  window.onerror = function(message, source, lineno, colno, error) {
    alert('App Crashed: ' + message + '\nAt: ' + source + ':' + lineno);
    return false;
  };
}

import { useEffect, useMemo, useState, useRef } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { reportingApi } from './services/reportingApi';
import {
  FiChevronDown,
  FiUser,
  FiLogOut,
  FiKey,
  FiClock,
  FiGrid,
  FiShoppingCart,
  FiRotateCcw,
  FiActivity,
  FiPackage,
  FiBarChart2,
  FiShield,
  FiMenu,
  FiX,
  FiSettings,
  FiFolder,
  FiTrendingUp,
} from 'react-icons/fi';

import { formatCurrency } from './utils/numberformatters';
import cash_icon from './assets/images/cash_icon.png';
import card_icon from './assets/images/card_icon.png';
import mobile_icon from './assets/images/mobile_icon.png';

import medicineImg from './assets/images/medicine.png';
import vitaminsImg from './assets/images/vitamins&supplements.png';
import personalCareImg from './assets/images/personalcare.png';
import firstAidImg from './assets/images/firstaid.png';
import healthWellnessImg from './assets/images/health&wellness.png';
import babyCareImg from './assets/images/babycare.png';

import { categories, Product } from './data/products';
import DashboardView from './components/DashboardView';

import InventoryManagementView from './components/InventoryManagementView';
import HistoryView from './components/HistoryView';
import POSView from './components/POSView';
import PaymentModal from './components/PaymentModal';
import GiftReceiptModal from './components/GiftReceiptModal';
import ReprintModal from './components/ReprintModal';
import RoleManagementView from './components/RoleManagementView';
import ShiftReportView from './components/ShiftReportView';
import ActivityLogView from './components/ActivityLogView';
import ReportsAndAnalysisView from './components/ReportsAndAnalysisView';
import ChangePasswordModal from './components/ChangePasswordModal';
import LoginForm from './components/LoginForm';
import LoadingScreen from './components/LoadingScreen';
import { useBarcodeScanner } from './utils/useBarcodeScanner';
import { Transaction } from './utils/chartHelpers';
import { useTransactionHold } from './hooks/useTransactionHold';
import HeldTransactionsModal from './components/HeldTransactionsModal';
import PartialRefundModal from './components/PartialRefundModal';
import { UserProfile } from './types/auth';
import { hasPermission } from './utils/permissions';
import { requirePermission } from './utils/permissionMiddleware';
import { logUserActivity } from './utils/activityLogger';
import { productApi } from './services/productApi';
import { receiptApi } from './services/receiptApi';
import { discountApi, DiscountValidationResult } from './services/discountApi';
import { salesApi } from './services/salesApi';
import { shiftApi } from './services/shiftApi';
import { authFetch } from './utils/authFetch';
import { startOfflineSync, stopOfflineSync, enqueueAction } from './utils/offlineQueue';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { calculateTaxDiscountBreakdown } from './utils/vatCalculator';

interface CartItem extends Product {
  quantity: number;
}

interface ShiftRecord {
  id: number;
  user_id: string;
  clock_in_at: string;
  clock_out_at: string | null;
  total_hours: number | null;
  created_at?: string;
  handover_notes?: string | null;
  cash_discrepancies?: string | null;
  issues?: string | null;
  pending_items?: string | null;
}

const App: React.FC = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState('');

  const [dbTransactionId, setDbTransactionId] = useState<string | null>(null);
  const [dbReceiptNumber, setDbReceiptNumber] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState('');
  const [discountResult, setDiscountResult] = useState<DiscountValidationResult | null>(null);
  const [isDiscountValidating, setIsDiscountValidating] = useState(false);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('POS');
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [cashReceived, setCashReceived] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [apiChangeAmount, setApiChangeAmount] = useState<number>(0);
  const [completedTaxBreakdown, setCompletedTaxBreakdown] = useState<any>(null);
  const [completedCustomerName, setCompletedCustomerName] = useState('');
  const [completedDiscountMeta, setCompletedDiscountMeta] = useState<{ amount: number; type: string }>({ amount: 0, type: 'none' });
  const [completedOrFields, setCompletedOrFields] = useState<{ name: string; tin: string; address: string } | undefined>(undefined);
  const [isReprintModalOpen, setIsReprintModalOpen] = useState(false);
  const [isGiftReceiptOpen, setIsGiftReceiptOpen] = useState(false);
  const [lastCompletedTransaction, setLastCompletedTransaction] = useState<{
    id: string | null;
    receiptNumber: string | null;
    items: Array<{ name: string; qty: number }>;
    date?: string;
    time?: string;
  } | null>(null);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isPartialRefundModalOpen, setIsPartialRefundModalOpen] = useState(false);
  const [selectedRefundTxn, setSelectedRefundTxn] = useState<Transaction | null>(null);
  const [appAlert, setAppAlert] = useState<{ isOpen: boolean; title: string; message: string }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const [shiftLoading, setShiftLoading] = useState(false);
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(null);
  const [shiftNow, setShiftNow] = useState(Date.now());

  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handoverCashDiscrepancies, setHandoverCashDiscrepancies] = useState('');
  const [handoverIssues, setHandoverIssues] = useState('');
  const [handoverPendingItems, setHandoverPendingItems] = useState('');

  const [latestHandover, setLatestHandover] = useState<ShiftRecord | null>(null);
  const [isHandoverPreviewOpen, setIsHandoverPreviewOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [transferRequests, setTransferRequests] = useState<any[]>([]);
  const [isCompletingTransaction, setIsCompletingTransaction] = useState(false);

  const [stockAlert, setStockAlert] = useState<{
    isOpen: boolean;
    type: 'no-stock' | 'low-stock';
    productName: string;
    stock: number;
    threshold: number;
    onHold: number;
  }>({
    isOpen: false,
    type: 'low-stock',
    productName: '',
    stock: 0,
    threshold: 0,
    onHold: 0,
  });

  const handleCloseStockAlert = () => {
    setStockAlert((prev) => ({
      ...prev,
      isOpen: false,
    }));
  };

  const categoryImageMap: Record<string, string> = {
    'OTC Medications': medicineImg.src,
    'Vitamins & Supplements': vitaminsImg.src,
    'Personal Care': personalCareImg.src,
    'First Aid': firstAidImg.src,
    'Health & Wellness': healthWellnessImg.src,
    'Baby Care': babyCareImg.src,
    'Medicine': medicineImg.src,
    'Vitamins': vitaminsImg.src,
    'Supplements': vitaminsImg.src,
    'Hygiene': personalCareImg.src,
    'Emergency': firstAidImg.src,
  };

  const refreshInventoryData = async () => {
    await fetchProducts();
  };

  const fetchProducts = async (_requestRows?: any[]) => {
    try {
      const result: any = await productApi.getProducts();
      if (result.error) throw new Error(result.error);

      const productRows = result.products || [];
      const transferRows = result.transfers || [];

      const productsWithImages = productRows.map((product: any) => {
        // Robust mapping: try exact match, then case-insensitive match
        const cat = product.category || 'Medicine';
        const img = categoryImageMap[cat] || 
                    categoryImageMap[Object.keys(categoryImageMap).find(k => k.toLowerCase() === cat.toLowerCase()) || ''] || 
                    medicineImg.src;
        
        return {
          ...product,
          image: img,
        };
      });

      setProducts(productsWithImages);
      setTransferRequests(transferRows);
      return productsWithImages;
    } catch (err: any) {
      console.error('Error fetching products:', err);
      return [];
    }
  };

  const fetchTransferRequests = async () => {
    try {
      const result: any = await productApi.getTransfers();
      if (result.error) throw new Error(result.error);
      const rows = result.transfers || [];
      setTransferRequests(rows);
      return rows;
    } catch (err: any) {
      console.error('Error fetching transfer requests:', err);
      return [];
    }
  };

  // --- Same-Tab Payment Gateway Return Callback Listener ---
  useEffect(() => {
    const checkPaymentCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const txnId = urlParams.get('txnId');

      if (paymentStatus === 'success' && txnId) {
        const pendingSaleStr = localStorage.getItem('pending_checkout_sale');
        const pendingCartStr = localStorage.getItem('pending_checkout_cart');
        const pendingDetailsStr = localStorage.getItem('pending_checkout_details');

        if (pendingSaleStr && pendingCartStr && pendingDetailsStr) {
          try {
            const pendingSale = JSON.parse(pendingSaleStr);
            const pendingCart = JSON.parse(pendingCartStr);
            const pendingDetails = JSON.parse(pendingDetailsStr);

            setIsCompletingTransaction(true);

            // 1. Call complete endpoint to save transaction in Supabase
            const res = await authFetch('/api/transactions/transactions/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(pendingSale),
            });
            const saleResult = await res.json();
            
            if (saleResult.error) throw new Error(saleResult.error);

            // 2. Setup receipt states to display the Receipt Modal
            const receiptNo = saleResult.receiptNumber ?? null;
            setDbReceiptNumber(receiptNo);
            setApiChangeAmount(saleResult.changeAmount ?? 0);
            
            const calculatedTax = calculateTaxDiscountBreakdown({
              subtotal: pendingSale.subtotal,
              vat: pendingSale.vat,
              discountType: pendingDetails.discountType,
              discountAmount: pendingSale.discountAmount,
            });
            
            setCompletedTaxBreakdown(calculatedTax);
            setCompletedCustomerName(pendingDetails.customerName || '');
            setCompletedDiscountMeta({ amount: pendingSale.discountAmount, type: pendingDetails.discountType || 'none' });
            setCompletedOrFields(pendingDetails.orFields);
            
            setDbTransactionId(txnId);
            // Restore cart items so ItemizedReceipt renders them
            setCart(pendingCart);
            
            // Configure modal states to show successful receipt screen
            setPaymentMethod(pendingSale.paymentMethod || 'card');
            setPaymentStatus('success');
            setIsPaymentModalOpen(true);
            
            setDiscountCode('');
            setDiscountResult(null);

            // Fetch the actual receipt data immediately in the background
            try {
              const receiptData = await authFetch(`/api/transactions/transactions/${txnId}/receipt`).then((r) => r.json());
              console.log('Fetched receipt data:', receiptData);
            } catch (receiptErr) {
              console.warn('Failed to fetch receipt details:', receiptErr);
            }

          } catch (err: any) {
            console.error('Error completing transaction after redirect:', err);
            setAppAlert({ isOpen: true, title: 'Payment Error', message: `Failed to complete transaction: ${err.message}` });
          } finally {
            setIsCompletingTransaction(false);
            // Cleanup localStorage and clean URL parameters
            localStorage.removeItem('pending_checkout_sale');
            localStorage.removeItem('pending_checkout_cart');
            localStorage.removeItem('pending_checkout_details');
            window.history.replaceState({}, document.title, window.location.origin + '/');
          }
        }
      } else if (paymentStatus === 'cancel') {
        alert('❌ Payment was cancelled or failed. Your cart has been preserved.');
        // Cleanup URL query strings
        window.history.replaceState({}, document.title, window.location.origin + '/');
      }
    };

    // Run callback check on page load
    checkPaymentCallback();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('live-products-and-transfers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        async () => {
          await refreshInventoryData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requesttransfers' },
        async () => {
          await refreshInventoryData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);


  // ── Sync Transaction History Real-time ──
  useEffect(() => {
    const channel = supabase
      .channel('live-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        async () => {
          try {
            const result: any = await salesApi.fetchTransactions();
            if (result?.transactions && Array.isArray(result.transactions)) {
              setTransactions(prev => {
                if (result.transactions.length === 0 && prev.length > 0) {
                  return prev; 
                }
                localStorage.setItem('pharma_transactions', JSON.stringify(result.transactions));
                return result.transactions;
              });
            }
          } catch (err) {
            console.warn('Real-time sync failed:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const loadSession = async () => {
    console.info('[Session] Starting session load...');
    const timeoutId = setTimeout(() => {
      console.warn('[Session] Session load timed out after 10s.');
      setAuthError('Connection timed out. Please check your network.');
      setAuthLoading(false);
    }, 10000);

    try {
      setAuthLoading(true);
      setAuthError('');

      console.info('[Session] Checking Supabase session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const session = sessionData.session;
      if (!session?.user) {
        console.info('[Session] No active session found.');
        setAuthError('Auth session missing!');
        return;
      }

      console.info(`[Session] Session found for user ${session.user.id}. Fetching profile...`);
      const profileResult: any = await authFetch(`/api/auth/profile/${session.user.id}`).then((r) => r.json());
      if (profileResult.error || profileResult.statusCode >= 400) {
        throw new Error(profileResult.message || profileResult.error || 'Internal API Error');
      }

      const data = profileResult.profile;
      if (!data) {
        console.warn('[Session] Profile payload missing from API response.');
        setAuthError('Profile payload missing.');
        return;
      }
      if (data.is_active === false) {
        console.warn('[Session] User account is inactive.');
        setAuthError('This account is inactive.');
        return;
      }

      console.info('[Session] Profile loaded successfully.');
      setProfile(data as UserProfile);
    } catch (err: any) {
      console.error('[Session] Critical error during load:', err);
      setAuthError(err.message || 'Failed to load user profile.');
    } finally {
      clearTimeout(timeoutId);
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const loadActiveShift = async (userId: string) => {
    try {
      setShiftLoading(true);
      const result: any = await authFetch(`/api/auth/shift/active/${userId}`).then((r) => r.json());
      if (result.error) throw new Error(result.error);
      setActiveShift(result.shift ?? null);
    } catch (err: any) {
      console.error(err);
      setAppAlert({ isOpen: true, title: 'Shift Error', message: err.message || 'Failed to load shift status.' });
    } finally {
      setShiftLoading(false);
    }
  };

  const loadLatestHandover = async () => {
    try {
      const result: any = await authFetch('/api/auth/shift/latest-handover').then((r) => r.json());
      if (result.error) throw new Error(result.error);
      const handoverData = (result.handover as ShiftRecord | null) ?? null;
      setLatestHandover(handoverData);

      // Check if returning from checkout callback to suppress the Shift Handover popup
      const urlParams = new URLSearchParams(window.location.search);
      const isReturningFromCheckout = urlParams.has('payment');

      if (
        !isReturningFromCheckout &&
        handoverData &&
        (handoverData.handover_notes ||
          handoverData.cash_discrepancies ||
          handoverData.issues ||
          handoverData.pending_items)
      ) {
        setIsHandoverPreviewOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadActiveShift(profile.id);
      loadLatestHandover();
      
      // Fetch initial inventory and transfer data only when authenticated
      refreshInventoryData();
      fetchTransferRequests();

      // POS-S4-009-T3: Start offline queue sync on login
      startOfflineSync();
      // ── Sync transactions from DB on every login/restart ──
      salesApi.fetchTransactions().then((result: any) => {
        if (result?.transactions && Array.isArray(result.transactions)) {
          // Robust persistence: Only overwrite if we got data or if local was empty
          // This prevents "losing" history if the API is momentarily empty or failing
          setTransactions(prev => {
            if (result.transactions.length === 0 && prev.length > 0) {
              console.warn('[Sync] API returned empty transactions list, but local history has data. Retaining local history to prevent data loss.');
              return prev;
            }
            localStorage.setItem('pharma_transactions', JSON.stringify(result.transactions));
            return result.transactions;
          });
        }
      }).catch((err: any) => {
        console.warn('Could not fetch transactions from DB, falling back to localStorage:', err);
      });
    } else {
      setActiveShift(null);
      setLatestHandover(null);
      // POS-S4-009-T3: Stop offline queue sync on logout
      stopOfflineSync();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!activeShift) return;

    const interval = setInterval(() => {
      setShiftNow(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, [activeShift]);

  const getCartQtyForProduct = (productId: number | string) => {
    return cart.find((item: any) => String(item.id) === String(productId))?.quantity || 0;
  };

  const getAvailableSellableStock = (product: any) => {
    return Number(product?.available_stock) || 0;
  };

  const filteredProducts = products.filter(
    (p) =>
      (activeCategory === 'All' || p.category === activeCategory) &&
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.12 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const checkoutTaxBreakdown = calculateTaxDiscountBreakdown({
    subtotal,
    vat: tax,
    discountType: discountResult?.valid ? discountResult.discountType : 'none',
    discountPercent: discountResult?.valid ? discountResult.discountPercent || 0 : 0,
  });
  const discountAmount = checkoutTaxBreakdown.discountAmount;
  const finalTotal = checkoutTaxBreakdown.totalDue;
  const changeAmount = cashReceived ? Math.max(0, parseFloat(cashReceived) - finalTotal) : 0;

  const { heldTransactions, holdCart, removeHold, resumeHold } = useTransactionHold();

  const shiftHoursWorked = useMemo(() => {
    if (!activeShift?.clock_in_at) return 0;
    const clockInMs = new Date(activeShift.clock_in_at).getTime();
    const diffHours = (shiftNow - clockInMs) / (1000 * 60 * 60);
    return Number(Math.max(diffHours, 0).toFixed(2));
  }, [activeShift, shiftNow]);

  const shiftElapsedText = useMemo(() => {
    if (!activeShift?.clock_in_at) return 'Not clocked in';

    const clockInMs = new Date(activeShift.clock_in_at).getTime();
    const diffMs = Math.max(shiftNow - clockInMs, 0);
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  }, [activeShift, shiftNow]);

  const ensureActiveShift = () => {
    if (!activeShift) {
      setAppAlert({
        isOpen: true,
        title: 'Shift Required',
        message: 'You must clock in before performing sales activities.',
      });
      return false;
    }

    return true;
  };

  const resetHandoverFields = () => {
    setHandoverNotes('');
    setHandoverCashDiscrepancies('');
    setHandoverIssues('');
    setHandoverPendingItems('');
  };

  const addToCart = (product: any) => {
    if (!ensureActiveShift()) return;

    const availableSellableStock = Number(product.available_stock) || 0;
    const currentThreshold = Number(product.low_stock_threshold) || 0;
    const currentCartQty = getCartQtyForProduct(product.id);

    if (availableSellableStock <= 0) {
      setStockAlert({
        isOpen: true,
        type: 'no-stock',
        productName: product.name,
        stock: availableSellableStock,
        threshold: currentThreshold,
        onHold: Number(product.reserved_transfer_qty) || 0,
      });
      return;
    }

    if (currentCartQty >= availableSellableStock) {
      setAppAlert({
        isOpen: true,
        title: 'Stock Limit Reached',
        message: `You can only add up to ${availableSellableStock} unit(s) of ${product.name} to the cart because ${product.reserved_transfer_qty} unit(s) are reserved for branch transfer.`,
      });
      return;
    }

    setCart((prevCart: any[]) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [...prevCart, { ...product, quantity: 1 }];
    });

    if (availableSellableStock <= currentThreshold) {
      setStockAlert({
        isOpen: true,
        type: availableSellableStock <= 0 ? 'no-stock' : 'low-stock',
        productName: product.name,
        stock: availableSellableStock,
        threshold: currentThreshold,
        onHold: Number(product.reserved_transfer_qty) || 0,
      });
    }
  };

  const updateQty = (id: number, delta: number) => {
    if (!ensureActiveShift()) return;

    const cartItem = cart.find((item) => item.id === id);
    if (!cartItem) return;

    if (delta > 0) {
      const product = products.find((p) => Number(p.id) === Number(id));
      if (!product) return;

      const availableSellableStock = getAvailableSellableStock(product);

      if (cartItem.quantity >= availableSellableStock) {
        setAppAlert({
          isOpen: true,
          title: 'Stock Limit Reached',
          message: `You can only sell up to ${availableSellableStock} unit(s) of ${cartItem.name} because some stock is reserved for branch transfer.`,
        });
        return;
      }
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const handleClockIn = async () => {
    if (!profile) return;
    try {
      setShiftLoading(true);
      if (activeShift) {
        setAppAlert({ isOpen: true, title: 'Already Clocked In', message: 'You already have an active shift.' });
        return;
      }
      const result: any = await authFetch('/api/auth/shift/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      }).then((r) => r.json());
      if (result.error) throw new Error(result.error);
      await loadActiveShift(profile.id);
      await logUserActivity({
        profile,
        actionType: 'SHIFT_CLOCK_IN',
        actionDetails: `User clocked in at ${new Date().toLocaleString()}`,
        entityType: 'shift',
        entityId: profile.id,
      });
      setAppAlert({ isOpen: true, title: 'Clocked In', message: 'Your shift has started successfully.' });
    } catch (err: any) {
      console.error(err);
      setAppAlert({ isOpen: true, title: 'Clock In Failed', message: err.message || 'Failed to clock in.' });
    } finally {
      setShiftLoading(false);
    }
  };

  const handleOpenClockOutModal = () => {
    if (!profile || !activeShift) {
      setAppAlert({
        isOpen: true,
        title: 'No Active Shift',
        message: 'You do not have an active shift to clock out from.',
      });
      return;
    }

    setIsHandoverModalOpen(true);
  };

  const handleConfirmClockOut = async () => {
    if (!profile || !activeShift) {
      setAppAlert({ isOpen: true, title: 'No Active Shift', message: 'You do not have an active shift to clock out from.' });
      return;
    }
    try {
      setShiftLoading(true);
      const clockOutAt = new Date().toISOString();
      const clockInMs = new Date(activeShift.clock_in_at).getTime();
      const totalHours = Number(
        (((new Date(clockOutAt).getTime() - clockInMs) / (1000 * 60 * 60))).toFixed(2)
      );

      const result: any = await authFetch('/api/auth/shift/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          userId: profile.id,
          clockOutAt,
          totalHours,
          handoverNotes: handoverNotes.trim() || null,
          cashDiscrepancies: handoverCashDiscrepancies.trim() || null,
          issues: handoverIssues.trim() || null,
          pendingItems: handoverPendingItems.trim() || null,
        }),
      }).then((r) => r.json());
      if (result.error) throw new Error(result.error);

      await logUserActivity({
        profile,
        actionType: 'SHIFT_CLOCK_OUT',
        actionDetails: `User clocked out. Total hours: ${totalHours.toFixed(2)}. Notes: ${handoverNotes || 'None'}`,
        entityType: 'shift',
        entityId: String(activeShift.id),
      });

      setActiveShift(null);
      setCart([]);
      setIsHandoverModalOpen(false);
      resetHandoverFields();
      await loadLatestHandover();
      setAppAlert({
        isOpen: true,
        title: 'Clocked Out',
        message: `Shift ended successfully. Total hours worked: ${totalHours.toFixed(2)} hours.`,
      });
    } catch (err: any) {
      console.error(err);
      setAppAlert({ isOpen: true, title: 'Clock Out Failed', message: err.message || 'Failed to clock out.' });
    } finally {
      setShiftLoading(false);
    }
  };

  const handleHoldCart = async () => {
    const permissionCheck = requirePermission(
      profile,
      'sales.process',
      'You do not have permission to hold orders.'
    );

    if (!permissionCheck.allowed) {
      setAppAlert({
        isOpen: true,
        title: 'Access Denied',
        message: permissionCheck.message || 'Access denied.',
      });
      return;
    }

    if (!ensureActiveShift()) return;

    const { success, message } = holdCart(cart, total);
    if (success) {
      setCart([]);

      await logUserActivity({
        profile,
        actionType: 'ORDER_HELD',
        actionDetails: `Held order with ${cart.length} cart item(s), total ₱${total.toFixed(2)}`,
        entityType: 'held_order',
        entityId: null,
      });

      setAppAlert({ isOpen: true, title: 'Success', message: 'Order placed on hold.' });
    } else {
      setAppAlert({
        isOpen: true,
        title: 'Notice',
        message: message || 'Failed to place order on hold.',
      });
    }
  };

  const handleResumeHold = async (id: string) => {
    const permissionCheck = requirePermission(
      profile,
      'sales.process',
      'You do not have permission to resume held orders.'
    );

    if (!permissionCheck.allowed) {
      setAppAlert({
        isOpen: true,
        title: 'Access Denied',
        message: permissionCheck.message || 'Access denied.',
      });
      return;
    }

    if (!ensureActiveShift()) return;

    if (cart.length > 0) {
      if (
        !window.confirm(
          'Your current cart has items. Resuming a hold will clear your current cart. Proceed?'
        )
      ) {
        return;
      }
    }

    const resumedCart = resumeHold(id);
    if (resumedCart) {
      setCart(resumedCart);

      await logUserActivity({
        profile,
        actionType: 'ORDER_RESUMED',
        actionDetails: `Resumed held order ${id}`,
        entityType: 'held_order',
        entityId: id,
      });
    }
  };

  const handleDeleteHold = async (id: string) => {
    const permissionCheck = requirePermission(
      profile,
      'sales.process',
      'You do not have permission to delete held orders.'
    );

    if (!permissionCheck.allowed) {
      setAppAlert({
        isOpen: true,
        title: 'Access Denied',
        message: permissionCheck.message || 'Access denied.',
      });
      return;
    }

    if (!ensureActiveShift()) return;

    removeHold(id);

    await logUserActivity({
      profile,
      actionType: 'ORDER_DELETED',
      actionDetails: `Deleted held order ${id}`,
      entityType: 'held_order',
      entityId: id,
    });
  };

  const handleBarcodeScan = (scannedCode: string) => {
    if (!ensureActiveShift()) return;

    const productFound = products.find((p) => p.barcode === scannedCode);

    if (productFound) {
      addToCart(productFound);
    } else {
      alert(`Product not found! Scanned Code: ${scannedCode}`);
    }
  };

  useBarcodeScanner(handleBarcodeScan);

  const toggleHistoryItem = (id: string) => setExpandedTxn(expandedTxn === id ? null : id);

  const handlePartialRefund = (txn: Transaction) => {
    setSelectedRefundTxn(txn);
    setIsPartialRefundModalOpen(true);
  };

  const handleProcessRefund = (
    originalTxn: Transaction,
    refundItems: Array<{ name: string; qty: number; price: number; category?: string }>,
    refundSubtotal: number,
    refundTax: number,
    refundTotal: number
  ) => {
    const now = new Date();
    const h = now.getHours();
    const formattedHour =
      h >= 12 ? (h === 12 ? '12PM' : `${h - 12}PM`) : h === 0 ? '12AM' : `${h}AM`;

    const refundTxn: Transaction = {
      id: `REFUND-${Date.now()}`,
      receiptNumber: null,
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      hour: formattedHour,
      amount: `-${formatCurrency(refundTotal)}`,
      rawAmount: -refundTotal,
      method: originalTxn.method,
      itemsCount: refundItems.reduce((sum, i) => sum + i.qty, 0),
      items: refundItems,
      subtotal: -refundSubtotal,
      tax: -refundTax,
      type: 'refund',
      originalTransactionId: originalTxn.id,
    };

    const updated = [refundTxn, ...transactions];
    setTransactions(updated);
    localStorage.setItem('pharma_transactions', JSON.stringify(updated));

    logUserActivity({
      profile,
      actionType: 'REFUND',
      actionDetails: `Processed partial refund of ${formatCurrency(refundTotal)} from transaction ${originalTxn.id}`,
      entityType: 'transaction',
      entityId: refundTxn.id,
    });

    setIsPartialRefundModalOpen(false);
    setSelectedRefundTxn(null);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentMethod(null);
    setCashReceived('');
    setPaymentStatus('idle');
    setApiChangeAmount(0);
    setCompletedTaxBreakdown(null);
    setCompletedCustomerName('');
    setCompletedDiscountMeta({ amount: 0, type: 'none' });
    setCompletedOrFields(undefined);
    if (paymentStatus === 'success') setCart([]);
  };

  const handleProceedToPayment = async () => {
    const permissionCheck = requirePermission(profile, 'sales.process', 'You do not have permission to process sales.');
    if (!permissionCheck.allowed) {
      setAppAlert({ isOpen: true, title: 'Access Denied', message: permissionCheck.message || 'Access denied.' });
      return;
    }
    if (!ensureActiveShift()) return;
    try {
      const res = await authFetch('/api/transactions/transactions/initiate', { method: 'POST' });
      const result = await res.json();
      
      if (result.error) throw new Error(result.error);
      setDbTransactionId(result.transactionId);
      setDbReceiptNumber(null);
      setIsPaymentModalOpen(true);
    } catch (err: any) {
      console.warn('[Offline] Failed to initiate transaction, checking connectivity...', err);
      
      // POS-S4-009-T3: Fallback to local transaction ID if offline
      if (!navigator.onLine || err.message === 'Failed to fetch' || err.name === 'TypeError') {
        const localId = `LOCAL-TXN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        console.info(`[Offline] Using local transaction ID: ${localId}`);
        setDbTransactionId(localId);
        setDbReceiptNumber(null);
        setIsPaymentModalOpen(true);
      } else {
        setAppAlert({
          isOpen: true,
          title: 'Error',
          message: err.message || 'Failed to create transaction.'
        });
      }
    }
  };

  const discountTypeMap: Record<string, string> = {
    none: 'None',
    pwd: 'PWD',
    senior: 'Senior Citizen',
    'senior citizen': 'Senior Citizen',
  };

  const handleCompletePayment = async (details: any = {}) => {
    const salesCheck = requirePermission(profile, 'sales.process', 'You do not have permission to complete payments.');
    if (!salesCheck.allowed) {
      setAppAlert({ isOpen: true, title: 'Access Denied', message: salesCheck.message || 'Access denied.' });
      return;
    }
    if (!ensureActiveShift()) return;

    const { discountType = 'none' } = details;
    if (discountType !== 'none') {
      const discountCheck = requirePermission(profile, 'discount.approve', 'Only a Cashier, Supervisor, Manager, or Admin can apply discounts.');
      if (!discountCheck.allowed) {
        setAppAlert({ isOpen: true, title: 'Approval Required', message: discountCheck.message || 'Approval required.' });
        return;
      }
    }
    if (!dbTransactionId) {
      setAppAlert({
        isOpen: true,
        title: 'Error',
        message: 'No DB transaction found. Click Proceed to Payment again.'
      });
      return;
    }

    const {
      customerName = '',
      discountAmount = 0,
      finalTotal = total,
      splitPayments = null,
      notes = '',
      tags = [],
      taxBreakdown = null,
      mobileProvider = 'gcash', // Destructure selected mobile provider (gcash, maya, qrph)
    } = details;
    const paymentTaxBreakdown = taxBreakdown || calculateTaxDiscountBreakdown({
      subtotal,
      vat: tax,
      discountType,
      discountAmount,
    });
    const normalizedDiscountType = discountTypeMap[String(discountType).toLowerCase()] || discountType || 'None';
    const isSplit = Array.isArray(splitPayments) && splitPayments.length > 1;
    const effectivePaymentMethod = isSplit ? 'Split' : paymentMethod ?? 'cash';

    setIsCompletingTransaction(true);
    try {
      const itemsPayload = cart.map((item) => ({
        product_id: item.id,
        name: item.name,
        category: item.category ?? null,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
      }));
      const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

      const amountPaidFromSplit = isSplit ? splitPayments!.reduce((s: number, e: any) => s + (parseFloat(e.amount) || 0), 0) : 0;
      const finalAmountPaid = isSplit ? amountPaidFromSplit : Number(details.tendered ?? finalTotal ?? total ?? 0);

      const salePayload = {
        transactionId: dbTransactionId,
        vat: Number(paymentTaxBreakdown.vatAmount ?? 0),
        subtotal: Number(subtotal ?? 0),
        totalAmount: Number(finalTotal ?? total ?? 0),
        amountPaid: finalAmountPaid,
        paymentMethod: effectivePaymentMethod,
        itemsCount,
        items: itemsPayload,
        discountType: normalizedDiscountType,
        discountAmount: Number(discountAmount ?? 0),
        notes,
        tags,
      };

      // Trigger payment gateway checkout for Card and Mobile payments
      const isGatewayPayment = effectivePaymentMethod === 'card' || effectivePaymentMethod === 'mobile';
      if (isGatewayPayment && !dbTransactionId.startsWith('LOCAL-TXN-')) {
        try {
          // Construct unified payment line item with the exact discounted finalTotal
          const frontendLineItems = [{
            name: 'POS Transaction Payment',
            quantity: 1,
            amount: {
              value: Math.round(Number(finalTotal || total || 0) * 100),
              currency: 'PHP',
            },
          }];

          // Restrict gateway options dynamically based on payment method
          let paymentMethodsList = ['card'];
          if (effectivePaymentMethod === 'mobile') {
            paymentMethodsList = [mobileProvider]; // ['gcash'], ['maya'], or ['qrph']
          }

          const checkoutRes = await authFetch(`/api/transactions/transactions/${dbTransactionId}/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              successUrl: `${window.location.origin}/?payment=success&txnId=${dbTransactionId}`,
              cancelUrl: `${window.location.origin}/?payment=cancel&txnId=${dbTransactionId}`,
              paymentMethods: paymentMethodsList, // Restrict gateway dynamically
              lineItems: frontendLineItems, // Pass unified discounted total
            }),
          });
          const checkoutResult = await checkoutRes.json();
          if (checkoutResult.checkoutUrl) {
            // Save state to localStorage to prevent loss upon redirect
            localStorage.setItem('pending_checkout_sale', JSON.stringify(salePayload));
            localStorage.setItem('pending_checkout_cart', JSON.stringify(cart));
            localStorage.setItem('pending_checkout_details', JSON.stringify(details));

            // Redirect this tab directly to the secure PayMongo hosted payment page
            window.location.href = checkoutResult.checkoutUrl;
            return; // Stop local execution immediately to await Return to Merchant callback
          } else {
            throw new Error(checkoutResult.message || 'Failed to generate payment checkout link.');
          }
        } catch (err: any) {
          console.error('Payment gateway checkout failure:', err);
          throw new Error(`Payment Gateway Error: ${err.message}`);
        }
      }

      let saleResult: any;
      let isOfflineSale = false;

      try {
        const res = await authFetch('/api/transactions/transactions/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(salePayload),
        });
        saleResult = await res.json();
        
        if (saleResult.error) throw new Error(saleResult.error);
      } catch (err: any) {
        // POS-S4-009-T3: Handle offline sale by queuing
        console.warn('[Offline] Sale API failed, checking connectivity...', err);
        
        // If it's a network error or the server is unavailable, queue it
        if (!navigator.onLine || err.message === 'Failed to fetch' || err.name === 'TypeError') {
          console.info('[Offline] Network issues detected. Queuing sale for later sync.');
          enqueueAction({
            type: 'sale',
            url: '/api/transactions/transactions/complete',
            method: 'POST',
            body: salePayload,
          });
          
          isOfflineSale = true;
          // Generate a mock receipt number for offline mode
          saleResult = {
            receiptNumber: `LOCAL-${dbTransactionId?.split('-').pop() || Date.now().toString().slice(-6)}`,
            changeAmount: finalAmountPaid - finalTotal,
          };
        } else {
          // Re-throw if it's a real API error (like 400 Bad Request)
          throw err;
        }
      }

      const receiptNo = saleResult.receiptNumber ?? null;
      setDbReceiptNumber(receiptNo);
      setApiChangeAmount(saleResult.changeAmount ?? 0);
      setCompletedTaxBreakdown(paymentTaxBreakdown);
      setCompletedCustomerName(customerName);
      setCompletedDiscountMeta({ amount: paymentTaxBreakdown.discountAmount, type: discountType });
      setCompletedOrFields(details.orFields);

      // Fetch the actual receipt data immediately (Skip if offline)
      if (!isOfflineSale) {
        try {
          const receiptData = await authFetch(`/api/transactions/transactions/${dbTransactionId}/receipt`).then((r) => r.json());
          console.log('Fetched receipt data:', receiptData);
        } catch (receiptErr) {
          console.warn('Failed to fetch receipt details:', receiptErr);
        }
      }

      const now = new Date();
      const h = now.getHours();
      const formattedHour = h >= 12 ? (h === 12 ? '12PM' : `${h - 12}PM`) : h === 0 ? '12AM' : `${h}AM`;
      const methodMap: Record<string, string> = {
        cash: 'Cash Payment',
        card: 'Card Payment',
        mobile: 'Mobile Payment',
        split: 'Split Payment',
        Split: 'Split Payment',
      };
      const methodLabel = isSplit
        ? splitPayments!
            .map((e: any) => `${e.method.charAt(0).toUpperCase() + e.method.slice(1)} ₱${parseFloat(e.amount).toFixed(2)}`)
            .join(' + ')
        : methodMap[paymentMethod!] ?? paymentMethod;
      const dashboardMethodLabel = isSplit
        ? methodMap.Split
        : methodMap[effectivePaymentMethod] ?? effectivePaymentMethod;

      const newTransaction: Transaction = {
        id: dbTransactionId,
        receiptNumber: receiptNo,
        date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        hour: formattedHour,
        amount: `₱${finalTotal.toFixed(2)}`,
        rawAmount: finalTotal,
        method: dashboardMethodLabel ?? methodLabel ?? 'Unknown',
        itemsCount,
        items: cart.map((item) => ({
          name: item.name,
          qty: item.quantity,
          price: item.price,
          category: item.category,
        })),
        subtotal,
        tax: paymentTaxBreakdown.vatAmount,
        customerName,
        changeAmount: saleResult.changeAmount ?? Math.max(0, finalAmountPaid - finalTotal),
        discountType: normalizedDiscountType,
        discountAmount,
        notes,
        tags,
      };

      const updated = [newTransaction, ...transactions];
      setTransactions(updated);
      localStorage.setItem('pharma_transactions', JSON.stringify(updated));
      setPaymentStatus('success');
      setLastCompletedTransaction({
        id: dbTransactionId,
        receiptNumber: receiptNo,
        items: newTransaction.items.map((i) => ({ name: i.name, qty: i.qty })),
        date: newTransaction.date,
        time: newTransaction.time,
      });

      const activityMethodLabel = isSplit
        ? splitPayments!.map((e: any) => `${e.method} ₱${parseFloat(e.amount).toFixed(2)}`).join(' + ')
        : effectivePaymentMethod;

      // Log activity (Only if online, otherwise queueing activity might be complex, 
      // for now we prioritize the SALE itself)
      if (!isOfflineSale) {
        await logUserActivity({
          profile,
          actionType: 'SALE',
          actionDetails: `Completed sale worth ₱${finalTotal.toFixed(2)} with ${activityMethodLabel} payment`,
          entityType: 'transaction',
          entityId: dbTransactionId,
        });

        if (discountType !== 'none' && Number(discountAmount) > 0) {
          await logUserActivity({
            profile,
            actionType: 'DISCOUNT_APPLIED',
            actionDetails: `Applied ${normalizedDiscountType} discount worth ₱${Number(discountAmount).toFixed(2)} on sale ${dbTransactionId}`,
            entityType: 'transaction',
            entityId: dbTransactionId,
          });
        }
      }

      // Print receipt (Handle printer failure gracefully if offline)
      try {
        await receiptApi.printReceipt({
          receiptNumber: newTransaction.receiptNumber ?? undefined,
          items: newTransaction.items.map(i => ({
            name: i.name,
            quantity: i.qty,
            price: Number(i.price)
          })),
          vatable: paymentTaxBreakdown.vatableSales,
          vatExempt: paymentTaxBreakdown.vatExemptSales,
          vatAmount: paymentTaxBreakdown.vatAmount,
          vatDeduction: paymentTaxBreakdown.vatDeduction,
          discountAmount: paymentTaxBreakdown.discountAmount,
          discountType: normalizedDiscountType,
          total: newTransaction.rawAmount,
          splitPayments: isSplit ? splitPayments! : undefined,
        });
      } catch (printErr) {
        console.warn('[Offline] Printer unavailable, skipping print.', printErr);
      }

      if (!isOfflineSale) {
        try {
          await refreshInventoryData();
        } catch (invErr) {
          console.warn('Failed to refresh inventory data:', invErr);
        }
      } else {
        setAppAlert({
          isOpen: true,
          title: 'Offline Mode Active',
          message: 'Sale saved locally and will sync when internet is restored. Receipt marked as LOCAL.',
        });
      }
    } catch (err: any) {
      console.error(err);
      setAppAlert({
        isOpen: true,
        title: 'Error',
        message: err.message || 'Failed to complete payment / generate receipt.'
      });
    } finally {
      setIsCompletingTransaction(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!dbTransactionId) {
      setIsPaymentModalOpen(false);
      return;
    }
    try {
      // If it's a local transaction, we don't need to notify the server
      if (dbTransactionId.startsWith('LOCAL-TXN-')) {
        console.info('[Offline] Cancelling local transaction.');
      } else {
        const res = await authFetch('/api/transactions/transactions/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: dbTransactionId }),
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
      }
      
      setPaymentStatus('idle');
      setDbReceiptNumber(null);
      setDbTransactionId(null);
      setIsPaymentModalOpen(false);
    } catch (err: any) {
      console.warn('[Offline] Failed to cancel transaction on server, checking connectivity...', err);
      
      if (!navigator.onLine || err.message === 'Failed to fetch' || err.name === 'TypeError') {
        // Just clear locally if offline
        setPaymentStatus('idle');
        setDbReceiptNumber(null);
        setDbTransactionId(null);
        setIsPaymentModalOpen(false);
      } else {
        setAppAlert({
          isOpen: true,
          title: 'Error',
          message: err.message || 'Failed to cancel transaction.'
        });
      }
    }
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'Dashboard') {
      const dashboardCheck = requirePermission(
        profile,
        'reports.view',
        'You do not have permission to view the dashboard.'
      );

      if (!dashboardCheck.allowed) {
        setAppAlert({
          isOpen: true,
          title: 'Access Denied',
          message: dashboardCheck.message || 'Access denied.',
        });
        return;
      }
    }

    if (tab === 'History') {
      const historyCheck = requirePermission(
        profile,
        'history.view',
        'You do not have permission to view transaction history.'
      );

      if (!historyCheck.allowed) {
        setAppAlert({
          isOpen: true,
          title: 'Access Denied',
          message: historyCheck.message || 'Access denied.',
        });
        return;
      }
    }

    if (tab === 'Role Management') {
      const roleManagementCheck = requirePermission(
        profile,
        'roles.manage',
        'You do not have permission to manage roles.'
      );

      if (!roleManagementCheck.allowed) {
        setAppAlert({
          isOpen: true,
          title: 'Access Denied',
          message: roleManagementCheck.message || 'Access denied.',
        });
        return;
      }
    }

    if (tab === 'Shift Report') {
      const shiftReportCheck = requirePermission(
        profile,
        'reports.view',
        'You do not have permission to view shift records.'
      );

      if (!shiftReportCheck.allowed) {
        setAppAlert({
          isOpen: true,
          title: 'Access Denied',
          message: shiftReportCheck.message || 'Access denied.',
        });
        return;
      }
    }

    if (tab === 'Activity Log') {
      const activityLogCheck = requirePermission(
        profile,
        'reports.view',
        'You do not have permission to view activity logs.'
      );

      if (!activityLogCheck.allowed) {
        setAppAlert({
          isOpen: true,
          title: 'Access Denied',
          message: activityLogCheck.message || 'Access denied.',
        });
        return;
      }
    }

    if (tab === 'Reports and Analysis') {
      const hourlySalesCheck = requirePermission(
        profile,
        'reports.view',
        'You do not have permission to view Reports and Analysis.'
      );

      if (!hourlySalesCheck.allowed) {
        setAppAlert({
          isOpen: true,
          title: 'Access Denied',
          message: hourlySalesCheck.message || 'Access denied.',
        });
        return;
      }
    }

    setActiveTab(tab);
  };

  const handleLogout = async () => {
    // Log logout activity before signing out
    if (profile) {
      try {
        await reportingApi.logActivity({
          userId: profile.id,
          userEmail: profile.email || '',
          actionType: 'LOGOUT',
          actionDetails: 'User logged out',
          entityType: 'user',
          entityId: profile.id,
        });
      } catch (logErr) {
        console.warn('Failed to log logout activity:', logErr);
      }
    }
    await supabase.auth.signOut();
    window.location.reload();
  };

  // SCRUM-388: 15-minute inactivity auto-logout
  useInactivityLogout({
    timeout: 15 * 60 * 1000, // 15 minutes
    onLogout: async () => {
      if (profile) {
        try {
          await reportingApi.logActivity({
            userId: profile.id,
            userEmail: profile.email || '',
            actionType: 'AUTO_LOGOUT',
            actionDetails: 'User automatically logged out due to inactivity (15 minutes)',
            entityType: 'user',
            entityId: profile.id,
          });
        } catch (logErr) {
          console.warn('Failed to log auto-logout activity:', logErr);
        }
      }
      await supabase.auth.signOut();
      window.location.reload();
    },
    enabled: !!profile, // Only enable when user is logged in
  });

  const renderSidebarLink = (
    tab: string,
    label: string,
    icon: React.ReactNode,
    isVisible: boolean = true,
    isPrimary: boolean = false
  ) => {
    if (!isVisible) return null;

    return (
      <button
        className={[
          'sidebar-nav-link',
          activeTab === tab ? 'active' : '',
          isPrimary ? 'primary' : '',
          isSidebarCollapsed ? 'collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => handleTabChange(tab)}
        title={isSidebarCollapsed ? label : undefined}
      >
        <span className="sidebar-nav-icon">{icon}</span>
        {!isSidebarCollapsed && <span className="sidebar-nav-text">{label}</span>}
      </button>
    );
  };

  if (authLoading) {
    return <LoadingScreen message="Identifying your profile..." />;
  }

  if (authError === 'Auth session missing!' || (!profile && !authError)) {
    return <LoginForm />;
  }

  if (authError || !profile) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Unable to load profile</h2>
        <p>{authError || 'No user profile found.'}</p>
        <button onClick={handleLogout}>Back to Login</button>
      </div>
    );
  }

  return (
    <div className={`pos-shell ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            {!isSidebarCollapsed && <h1 className="sidebar-logo">PharmaCare POS</h1>}
          </div>

          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <FiMenu /> : <FiX />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-group">
            {!isSidebarCollapsed && <div className="sidebar-group-label">Daily Work</div>}
            {renderSidebarLink('POS', 'POS', <FiShoppingCart />, true, true)}
            {renderSidebarLink(
              'History',
              'History',
              <FiRotateCcw />,
              hasPermission(profile.role, 'history.view')
            )}
          </div>

          <div className="sidebar-group">
            {!isSidebarCollapsed && <div className="sidebar-group-label">Operations</div>}
            {renderSidebarLink(
              'Dashboard',
              'Dashboard',
              <FiGrid />,
              hasPermission(profile.role, 'reports.view')
            )}
            {renderSidebarLink(
              'Shift Report',
              'Shift Report',
              <FiClock />,
              hasPermission(profile.role, 'reports.view')
            )}
            {renderSidebarLink(
              'Activity Log',
              'Activity Log',
              <FiActivity />,
              hasPermission(profile.role, 'reports.view')
            )}
          </div>

          <div className="sidebar-group">
            {!isSidebarCollapsed && <div className="sidebar-group-label">Inventory</div>}
            {renderSidebarLink(
              'Inventory',
              'Inventory',
              <FiPackage />,
              hasPermission(profile.role, 'inventory.view')
            )}
          </div>

          <div className="sidebar-group">
            {!isSidebarCollapsed && <div className="sidebar-group-label">Analytics</div>}
            {renderSidebarLink(
              'Reports and Analysis',
              'Reports & Analysis',
              <FiTrendingUp />,
              hasPermission(profile.role, 'reports.view')
            )}
          </div>
        </nav>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-sidebar-toggle"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              <FiMenu />
            </button>

            <div className="topbar-page-meta">
              <div className="topbar-page-title">{activeTab}</div>
              <div className="topbar-page-subtitle">PharmaCare Drugstore POS</div>
            </div>
          </div>

          <div className="header-right-section" ref={userMenuRef}>
            <div
              className={`profile-pill ${isUserMenuOpen ? 'active' : ''}`}
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div className="avatar-circle">
                {profile.full_name ? profile.full_name[0].toUpperCase() : <FiUser />}
              </div>
              <div className="profile-info">
                <div className="user-name">{profile.full_name || profile.email}</div>
                <div className="user-role">{profile.role}</div>
              </div>
              <FiChevronDown className={`chevron-icon ${isUserMenuOpen ? 'rotate' : ''}`} />
            </div>

            {isUserMenuOpen && (
              <div className="user-dropdown-menu">
                <div className="shift-status-section">
                  <div className="status-header">
                    <FiClock className="status-icon" />
                    <span className="status-label">{activeShift ? 'Shift Active' : 'Not Clocked In'}</span>
                  </div>
                  {activeShift && (
                    <div className="status-details">
                      <div className="detail-item">
                        <span className="detail-label">Started:</span>
                        <span className="detail-value">
                          {new Date(activeShift.clock_in_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Total Hours:</span>
                        <span className="detail-value">
                          {shiftHoursWorked.toFixed(2)} ({shiftElapsedText})
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="dropdown-divider"></div>

                <div className="dropdown-actions">
                  {activeShift ? (
                    <button
                      className="dropdown-btn"
                      onClick={() => {
                        handleOpenClockOutModal();
                        setIsUserMenuOpen(false);
                      }}
                      disabled={shiftLoading}
                    >
                      <FiClock /> {shiftLoading ? 'Processing...' : 'Clock Out'}
                    </button>
                  ) : (
                    <button
                      className="dropdown-btn primary"
                      onClick={() => {
                        handleClockIn();
                        setIsUserMenuOpen(false);
                      }}
                      disabled={shiftLoading}
                    >
                      <FiClock /> {shiftLoading ? 'Processing...' : 'Clock In'}
                    </button>
                  )}

                  <button
                    className="dropdown-btn"
                    onClick={() => {
                      setIsChangePasswordModalOpen(true);
                      setIsUserMenuOpen(false);
                    }}
                  >
                    <FiKey /> Change Password
                  </button>

                  {hasPermission(profile.role, 'roles.manage') && (
                    <button
                      className="dropdown-btn"
                      onClick={() => {
                        handleTabChange('Role Management');
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <FiSettings /> Role Management
                    </button>
                  )}

                  <button className="dropdown-btn danger" onClick={handleLogout}>
                    <FiLogOut /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="scrollable-content">
          {activeTab === 'Dashboard' && hasPermission(profile.role, 'reports.view') && (
            <DashboardView transactions={transactions} />
          )}

          {activeTab === 'History' && hasPermission(profile.role, 'history.view') && (
            <HistoryView
              transactions={transactions}
              historySearch={historySearch}
              setHistorySearch={setHistorySearch}
              expandedTxn={expandedTxn}
              toggleHistoryItem={toggleHistoryItem}
              setIsReprintModalOpen={setIsReprintModalOpen}
              onPartialRefund={handlePartialRefund}
            />
          )}

          {activeTab === 'Shift Report' && hasPermission(profile.role, 'reports.view') && (
            <ShiftReportView />
          )}

          {activeTab === 'Activity Log' && hasPermission(profile.role, 'reports.view') && (
            <ActivityLogView profile={profile} />
          )}

          {activeTab === 'Reports and Analysis' && hasPermission(profile.role, 'reports.view') && (
            <ReportsAndAnalysisView transactions={transactions} profile={profile} />
          )}

          {activeTab === 'Inventory' && hasPermission(profile.role, 'inventory.view') && (
            <InventoryManagementView
              products={products}
              onInventoryUpdated={refreshInventoryData}
              canEdit={hasPermission(profile.role, 'inventory.edit')}
              profile={profile}
              canRequestTransfer={profile?.role === 'admin' || profile?.role === 'manager'}
            />
          )}

          {activeTab === 'Role Management' && hasPermission(profile.role, 'roles.manage') && (
            <RoleManagementView currentUserId={profile.id} />
          )}

          {activeTab === 'POS' && (
            <POSView
              cart={cart}
              setCart={setCart}
              filteredProducts={filteredProducts}
              allProducts={products}
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
            finalTotal={finalTotal}
            taxBreakdown={checkoutTaxBreakdown}
              discountCode={discountCode}
              setDiscountCode={setDiscountCode}
              discountResult={discountResult}
              discountError={discountError}
              isDiscountValidating={isDiscountValidating}
              validateDiscountCode={async () => {
                setDiscountError(null);
                setIsDiscountValidating(true);
                const result = await discountApi.validateDiscountCode(discountCode, total);
                setDiscountResult(result);
                setIsDiscountValidating(false);
                if (!result.valid) setDiscountError(result.error || 'Invalid discount code.');
              }}
              resetDiscount={() => {
                setDiscountCode('');
                setDiscountResult(null);
                setDiscountError(null);
              }}
              handleProceedToPayment={handleProceedToPayment}
              onHoldCart={handleHoldCart}
              onViewHeld={() => setIsHeldModalOpen(true)}
              heldCount={heldTransactions.length}
              stockAlert={stockAlert}
              onCloseStockAlert={handleCloseStockAlert}
            />
          )}

          <PaymentModal
            isOpen={isPaymentModalOpen}
            total={finalTotal}
            subtotal={subtotal}
            tax={tax}
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
            canApproveDiscount={hasPermission(profile?.role || '', 'discount.approve')}
            apiChangeAmount={apiChangeAmount}
            isSubmitting={isCompletingTransaction}
            onOpenGiftReceipt={() => {setIsGiftReceiptOpen(true)}}
            discountAmount={completedTaxBreakdown ? completedDiscountMeta.amount : discountAmount}
            discountType={completedTaxBreakdown ? completedDiscountMeta.type : (discountResult?.discountType ?? 'none')}
            preAppliedDiscountPercent={discountResult?.valid ? discountResult.discountPercent || 0 : 0}
            taxBreakdown={completedTaxBreakdown || checkoutTaxBreakdown}
            customerName={completedCustomerName}
            orFields={completedOrFields}
            receiptItems={cart.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price,
              category: item.category,
            }))}
          />

          <ReprintModal
            isOpen={isReprintModalOpen}
            onClose={() => setIsReprintModalOpen(false)}
            transactions={transactions}
          />

          <GiftReceiptModal
            isOpen={isGiftReceiptOpen}
            onClose={() => setIsGiftReceiptOpen(false)}
            transactionId={lastCompletedTransaction?.id ?? null}
            receiptNumber={lastCompletedTransaction?.receiptNumber ?? null}
            items={lastCompletedTransaction?.items ?? []}
            date={lastCompletedTransaction?.date}
            time={lastCompletedTransaction?.time}
          />

          <HeldTransactionsModal
            isOpen={isHeldModalOpen}
            onClose={() => setIsHeldModalOpen(false)}
            heldTransactions={heldTransactions}
            onResume={handleResumeHold}
            onDelete={handleDeleteHold}
          />

          <PartialRefundModal
            isOpen={isPartialRefundModalOpen}
            transaction={selectedRefundTxn}
            allTransactions={transactions}
            onClose={() => {
              setIsPartialRefundModalOpen(false);
              setSelectedRefundTxn(null);
            }}
            onProcessRefund={handleProcessRefund}
          />

          <ChangePasswordModal
            isOpen={isChangePasswordModalOpen}
            userEmail={profile.email}
            onClose={() => setIsChangePasswordModalOpen(false)}
          />

          {isHandoverModalOpen && (
            <div className="confirm-overlay" onClick={() => setIsHandoverModalOpen(false)}>
              <div
                className="confirm-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 560, width: '90%' }}
              >
                <h3 className="confirm-title">Shift Handover Notes</h3>
                <p className="confirm-message" style={{ marginBottom: 12 }}>
                  Add notes for the next shift before clocking out.
                </p>

                <div style={{ display: 'grid', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                      General Notes
                    </label>
                    <textarea
                      value={handoverNotes}
                      onChange={(e) => setHandoverNotes(e.target.value)}
                      placeholder="Write any important handover notes..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid #d1d5db',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                      Cash Discrepancies
                    </label>
                    <textarea
                      value={handoverCashDiscrepancies}
                      onChange={(e) => setHandoverCashDiscrepancies(e.target.value)}
                      placeholder="Record any cash drawer discrepancies..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid #d1d5db',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                      Issues
                    </label>
                    <textarea
                      value={handoverIssues}
                      onChange={(e) => setHandoverIssues(e.target.value)}
                      placeholder="List issues encountered during the shift..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid #d1d5db',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
                      Pending Items
                    </label>
                    <textarea
                      value={handoverPendingItems}
                      onChange={(e) => setHandoverPendingItems(e.target.value)}
                      placeholder="List pending items for the next shift..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid #d1d5db',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>

                <div className="confirm-actions" style={{ marginTop: 16 }}>
                  <button className="confirm-btn cancel" onClick={() => setIsHandoverModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="confirm-btn confirm" onClick={handleConfirmClockOut} disabled={shiftLoading}>
                    {shiftLoading ? 'Saving...' : 'Save Notes & Clock Out'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {isHandoverPreviewOpen && latestHandover && (
            <div className="confirm-overlay" onClick={() => setIsHandoverPreviewOpen(false)}>
              <div
                className="confirm-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 560, width: '90%' }}
              >
                <h3 className="confirm-title">Latest Shift Handover</h3>
                <p className="confirm-message" style={{ marginBottom: 12 }}>
                  Review the most recent handover notes before starting your shift.
                </p>

                <div style={{ display: 'grid', gap: 12, textAlign: 'left' }}>
                  <div>
                    <strong>General Notes:</strong>
                    <div>{latestHandover.handover_notes || 'None'}</div>
                  </div>

                  <div>
                    <strong>Cash Discrepancies:</strong>
                    <div>{latestHandover.cash_discrepancies || 'None'}</div>
                  </div>

                  <div>
                    <strong>Issues:</strong>
                    <div>{latestHandover.issues || 'None'}</div>
                  </div>

                  <div>
                    <strong>Pending Items:</strong>
                    <div>{latestHandover.pending_items || 'None'}</div>
                  </div>
                </div>

                <div className="confirm-actions" style={{ justifyContent: 'center', marginTop: 16 }}>
                  <button className="confirm-btn confirm" onClick={() => setIsHandoverPreviewOpen(false)}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {appAlert.isOpen && (
            <div className="confirm-overlay" onClick={() => setAppAlert({ ...appAlert, isOpen: false })}>
              <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
                <h3 className="confirm-title">{appAlert.title}</h3>
                <p className="confirm-message">{appAlert.message}</p>
                <div className="confirm-actions" style={{ justifyContent: 'center' }}>
                  <button className="confirm-btn confirm" onClick={() => setAppAlert({ ...appAlert, isOpen: false })}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
