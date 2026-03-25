'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import './App.css';
import { supabase } from './supabaseClient';
import { FiChevronDown, FiUser, FiLogOut, FiKey, FiClock } from 'react-icons/fi';

import { formatCurrency } from './utils/numberformatters';
import dashboard_CI from './assets/images/dashboard_CI.png';
import POS_CI from './assets/images/POS_CI.png';
import history_CI from './assets/images/history_CI.png';
import cash_icon from './assets/images/cash_icon.png';
import card_icon from './assets/images/card_icon.png';
import mobile_icon from './assets/images/mobile_icon.png';
import role_management_icon from './assets/images/role_management_icon.png';

import medicineImg from './assets/images/medicine.png';
import vitaminsImg from './assets/images/vitamins&supplements.png';
import personalCareImg from './assets/images/personalcare.png';
import firstAidImg from './assets/images/firstaid.png';
import healthWellnessImg from './assets/images/health&wellness.png';
import babyCareImg from './assets/images/babycare.png';

import { categories, Product } from './data/products';
import DashboardView from './components/DashboardView';
import InventoryView from './components/InventoryView';

import StockAlert from './components/StockAlert';
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
import { printReceipt } from './utils/printer-service';
import { useBarcodeScanner } from './utils/useBarcodeScanner';
import { Transaction } from './utils/chartHelpers';
import { useTransactionHold } from './hooks/useTransactionHold';
import HeldTransactionsModal from './components/HeldTransactionsModal';
import PartialRefundModal from './components/PartialRefundModal';
import { UserProfile } from './types/auth';
import { hasPermission } from './utils/permissions';
import { requirePermission } from './utils/permissionMiddleware';
import { logUserActivity } from './utils/activityLogger';

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

const getImgSrc = (img: any): string | undefined => {
  if (!img) return undefined;
  if (typeof img === 'string' && img.trim() !== '') return img;
  if (img?.src) return img.src;
  return undefined;
};

const App: React.FC = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState('');

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
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<any[]>([]);

  const [stockAlert, setStockAlert] = useState<{
  isOpen: boolean;
  type: 'no-stock' | 'low-stock';
  productName: string;
  stock: number;
  threshold: number;
  }>({
  isOpen: false,
  type: 'low-stock',
  productName: '',
  stock: 0,
  threshold: 0,
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
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, stock, category, low_stock_threshold')
        .order('id', { ascending: true });

      if (error) throw error;

      const productsWithImages = (data || []).map((product) => ({
        ...product,
        image: categoryImageMap[product.category] || medicineImg.src,
      }));

      setProducts(productsWithImages);
    } catch (err: any) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
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
    try {
      setAuthLoading(true);
      setAuthError('');

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const session = sessionData.session;
      if (!session?.user) {
        setAuthError('Auth session missing!');
        return;
      }

      const user = session.user;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, full_name, role, role_id, is_active')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (!data?.is_active) {
        setAuthError('This account is inactive.');
        return;
      }

      setProfile(data as UserProfile);
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Failed to load user profile.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  const loadActiveShift = async (userId: string) => {
    try {
      setShiftLoading(true);

      const { data, error } = await supabase
        .from('shift_records')
        .select('id, user_id, clock_in_at, clock_out_at, total_hours, created_at, handover_notes, cash_discrepancies, issues, pending_items')
        .eq('user_id', userId)
        .is('clock_out_at', null)
        .order('clock_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setActiveShift((data as ShiftRecord | null) ?? null);
    } catch (err: any) {
      console.error(err);
      setAppAlert({
        isOpen: true,
        title: 'Shift Error',
        message: err.message || 'Failed to load shift status.',
      });
    } finally {
      setShiftLoading(false);
    }
  };

  const loadLatestHandover = async () => {
    try {
      const { data, error } = await supabase
        .from('shift_records')
        .select(`
          id,
          user_id,
          clock_in_at,
          clock_out_at,
          total_hours,
          created_at,
          handover_notes,
          cash_discrepancies,
          issues,
          pending_items
        `)
        .not('clock_out_at', 'is', null)
        .or('handover_notes.not.is.null,cash_discrepancies.not.is.null,issues.not.is.null,pending_items.not.is.null')
        .order('clock_out_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const handoverData = (data as ShiftRecord | null) ?? null;
      setLatestHandover(handoverData);

      if (
        handoverData &&
        (
          handoverData.handover_notes ||
          handoverData.cash_discrepancies ||
          handoverData.issues ||
          handoverData.pending_items
        )
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
    } else {
      setActiveShift(null);
      setLatestHandover(null);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!activeShift) return;

    const interval = setInterval(() => {
      setShiftNow(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, [activeShift]);

  const filteredProducts = products.filter(
    (p) =>
      (activeCategory === 'All' || p.category === activeCategory) &&
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.12 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const changeAmount = cashReceived ? Math.max(0, parseFloat(cashReceived) - total) : 0;

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
    const currentStock = Number(product.stock) || 0;
    const currentThreshold = Number(product.low_stock_threshold) || 0;

    if (currentStock <= 0) {
      setStockAlert({
        isOpen: true,
        type: 'no-stock',
        productName: product.name,
        stock: currentStock,
        threshold: currentThreshold,
      });
      return;
    }

    setCart((prevCart: any[]) => {
      const existingItem = prevCart.find((item) => item.id === product.id);

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prevCart, { ...product, quantity: 1 }];
    });

    if (currentStock <= currentThreshold) {
      setStockAlert({
        isOpen: true,
        type: 'low-stock',
        productName: product.name,
        stock: currentStock,
        threshold: currentThreshold,
      });
    }
  };
  const updateQty = (id: number, delta: number) => {
    if (!ensureActiveShift()) return;

    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
      )
    );
  };

  const handleClockIn = async () => {
    if (!profile) return;

    try {
      setShiftLoading(true);

      if (activeShift) {
        setAppAlert({
          isOpen: true,
          title: 'Already Clocked In',
          message: 'You already have an active shift.',
        });
        return;
      }

      const { error } = await supabase.from('shift_records').insert({
        user_id: profile.id,
        clock_in_at: new Date().toISOString(),
      });

      if (error) throw error;

      await loadActiveShift(profile.id);

      await logUserActivity({
        profile,
        actionType: 'clock_in',
        actionDetails: `User clocked in at ${new Date().toLocaleString()}`,
        entityType: 'shift',
        entityId: profile.id,
      });

      setAppAlert({
        isOpen: true,
        title: 'Clocked In',
        message: 'Your shift has started successfully.',
      });
    } catch (err: any) {
      console.error(err);
      setAppAlert({
        isOpen: true,
        title: 'Clock In Failed',
        message: err.message || 'Failed to clock in.',
      });
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
      setAppAlert({
        isOpen: true,
        title: 'No Active Shift',
        message: 'You do not have an active shift to clock out from.',
      });
      return;
    }

    try {
      setShiftLoading(true);

      const clockOutAt = new Date().toISOString();
      const clockInMs = new Date(activeShift.clock_in_at).getTime();
      const clockOutMs = new Date(clockOutAt).getTime();
      const totalHours = Number((((clockOutMs - clockInMs) / (1000 * 60 * 60))).toFixed(2));

      const { error } = await supabase
        .from('shift_records')
        .update({
          clock_out_at: clockOutAt,
          total_hours: totalHours,
          handover_notes: handoverNotes.trim() || null,
          cash_discrepancies: handoverCashDiscrepancies.trim() || null,
          issues: handoverIssues.trim() || null,
          pending_items: handoverPendingItems.trim() || null,
        })
        .eq('id', activeShift.id)
        .eq('user_id', profile.id);

      if (error) throw error;

      await logUserActivity({
        profile,
        actionType: 'clock_out',
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
      setAppAlert({
        isOpen: true,
        title: 'Clock Out Failed',
        message: err.message || 'Failed to clock out.',
      });
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
        actionType: 'order_held',
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
        actionType: 'held_order_resumed',
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
      actionType: 'held_order_deleted',
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
      actionType: 'refund_processed',
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
    if (paymentStatus === 'success') setCart([]);
  };

  const handleProceedToPayment = async () => {
    const permissionCheck = requirePermission(
      profile,
      'sales.process',
      'You do not have permission to process sales.'
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

  const discountTypeMap: Record<string, string> = {
    none: 'None',
    pwd: 'PWD',
    senior: 'Senior Citizen',
  };

  const handleCompletePayment = async (details: any = {}) => {
    const salesCheck = requirePermission(
      profile,
      'sales.process',
      'You do not have permission to complete payments.'
    );

    if (!salesCheck.allowed) {
      setAppAlert({
        isOpen: true,
        title: 'Access Denied',
        message: salesCheck.message || 'Access denied.',
      });
      return;
    }

    if (!ensureActiveShift()) return;

    const { discountType = 'none' } = details;

    if (discountType !== 'none') {
      const discountCheck = requirePermission(
        profile,
        'discount.approve',
        'Only a Supervisor, Manager, or Admin can apply discounts.'
      );

      if (!discountCheck.allowed) {
        setAppAlert({
          isOpen: true,
          title: 'Approval Required',
          message: discountCheck.message || 'Approval required.',
        });
        return;
      }
    }

    if (!dbTransactionId) {
      alert('No DB transaction found. Click Proceed to Payment again.');
      return;
    }

    const {
      customerName = '',
      discountAmount = 0,
      finalTotal = total,
      splitPayments = null,
      notes = '',
      tags = [],
    } = details;

    const normalizedDiscountType = discountTypeMap[discountType] || 'None';

    // Determine effective payment method label
    const isSplit = Array.isArray(splitPayments) && splitPayments.length > 1;
    const effectivePaymentMethod = isSplit
      ? 'Split'
      : (paymentMethod ?? 'cash');

    try {
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
          p_payment_method: effectivePaymentMethod,
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

      const now = new Date();
      const h = now.getHours();
      const formattedHour =
        h >= 12 ? (h === 12 ? '12PM' : `${h - 12}PM`) : h === 0 ? '12AM' : `${h}AM`;

      const methodMap: Record<string, string> = {
        cash: 'Cash Payment',
        card: 'Credit/Debit Card',
        mobile: 'Mobile Payment',
        Split: 'Split Payment',
      };

      const methodLabel = isSplit
        ? splitPayments!
            .map((e: any) => `${e.method.charAt(0).toUpperCase() + e.method.slice(1)} ₱${parseFloat(e.amount).toFixed(2)}`)
            .join(' + ')
        : (methodMap[paymentMethod!] ?? paymentMethod);

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
        method: methodLabel ?? 'Unknown',
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
        notes,
        tags,
      };

      setTransactions([newTransaction, ...transactions]);
      setPaymentStatus('success');
      setLastCompletedTransaction({
        id: dbTransactionId,
        receiptNumber: receiptNo,
        items: newTransaction.items.map(i => ({ name: i.name, qty: i.qty })),
        date: newTransaction.date,
        time: newTransaction.time,
      });

      const activityMethodLabel = isSplit
        ? splitPayments!.map((e: any) => `${e.method} ₱${parseFloat(e.amount).toFixed(2)}`).join(' + ')
        : effectivePaymentMethod;

      await logUserActivity({
        profile,
        actionType: 'sale_completed',
        actionDetails: `Completed sale worth ₱${finalTotal.toFixed(2)} with ${activityMethodLabel} payment`,
        entityType: 'transaction',
        entityId: dbTransactionId,
      });

      // Attempt to save notes and tags to the database if columns exist
      try {
        await supabase
          .from('transactions')
          .update({ notes, tags })
          .eq('id', dbTransactionId);
      } catch (dbErr) {
        console.warn('Could not save notes/tags to DB. Columns might be missing.', dbErr);
      }

      if (discountType !== 'none' && Number(discountAmount) > 0) {
        await logUserActivity({
          profile,
          actionType: 'discount_applied',
          actionDetails: `Applied ${normalizedDiscountType} discount worth ₱${Number(discountAmount).toFixed(2)} on sale ${dbTransactionId}`,
          entityType: 'transaction',
          entityId: dbTransactionId,
        });
      }

      printReceipt({
        receiptNumber: newTransaction.receiptNumber ?? undefined,
        items: newTransaction.items,
        vatable: newTransaction.subtotal,
        vatAmount: newTransaction.tax,
        total: newTransaction.rawAmount,
        splitPayments: isSplit ? splitPayments! : undefined,
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

  const handleTabChange = (tab: string) => {
      console.log('Clicked tab:', tab);
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
      console.log('Setting activeTab to:', tab);
    setActiveTab(tab);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
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
    <div className="pos-container">
      <header className="main-nav">
        <h1 className="logo">PharmaCare Drugstore POS</h1>

        <div className="nav-actions">
          {hasPermission(profile.role, 'reports.view') && (
            <button
              className={activeTab === 'Dashboard' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => handleTabChange('Dashboard')}
            >
              <img src={getImgSrc(dashboard_CI)} alt="" /> Dashboard
            </button>
          )}

          <button
            className={activeTab === 'POS' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => handleTabChange('POS')}
          >
            <img src={getImgSrc(POS_CI)} alt="" /> POS
          </button>

          {hasPermission(profile.role, 'history.view') && (
            <button
              className={activeTab === 'History' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => handleTabChange('History')}
            >
              <img src={getImgSrc(history_CI)} alt="" /> History
            </button>
          )}

          {hasPermission(profile.role, 'reports.view') && (
            <button
              className={activeTab === 'Shift Report' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => handleTabChange('Shift Report')}
            >
              Shift Report
            </button>
          )}
          

          {hasPermission(profile.role, 'reports.view') && (
            <button
              className={activeTab === 'Activity Log' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => handleTabChange('Activity Log')}
            >
              Activity Log
            </button>
          )}

          {hasPermission(profile.role, 'inventory.view') && (
            <button
              className={activeTab === 'Inventory' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => handleTabChange('Inventory')}
            >
              Inventory
            </button>
          )}

          {hasPermission(profile.role, 'reports.view') && (
            <button
              className={activeTab === 'Reports and Analysis' ? 'nav-btn active' : 'nav-btn'}
              onClick={() => handleTabChange('Reports and Analysis')}
            >
              Reports & Analysis
            </button>
          )}
          

          {hasPermission(profile.role, 'roles.manage') && (
            <button
              className={
                activeTab === 'Role Management'
                  ? 'nav-btn active role-management-nav-button'
                  : 'nav-btn role-management-nav-button'
              }
              onClick={() => handleTabChange('Role Management')}
            >
              <img
                src={getImgSrc(role_management_icon)}
                alt="Role Management"
                className="role-management-nav-icon"
              />
              <span className="role-management-nav-text">Role Management</span>
            </button>
          )}
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
                      <span className="detail-value">{new Date(activeShift.clock_in_at).toLocaleString()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Total Hours:</span>
                      <span className="detail-value">{shiftHoursWorked.toFixed(2)} ({shiftElapsedText})</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-actions">
                {activeShift ? (
                  <button className="dropdown-btn" onClick={() => { handleOpenClockOutModal(); setIsUserMenuOpen(false); }} disabled={shiftLoading}>
                    <FiClock /> {shiftLoading ? 'Processing...' : 'Clock Out'}
                  </button>
                ) : (
                  <button className="dropdown-btn primary" onClick={() => { handleClockIn(); setIsUserMenuOpen(false); }} disabled={shiftLoading}>
                    <FiClock /> {shiftLoading ? 'Processing...' : 'Clock In'}
                  </button>
                )}
                
                <button className="dropdown-btn" onClick={() => { setIsChangePasswordModalOpen(true); setIsUserMenuOpen(false); }}>
                  <FiKey /> Change Password
                </button>
                
                <button className="dropdown-btn danger" onClick={handleLogout}>
                  <FiLogOut /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="scrollable-content">

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
        <ActivityLogView />
      )}

      {activeTab === 'Reports and Analysis' && hasPermission(profile.role, 'reports.view') && (
        <ReportsAndAnalysisView transactions={transactions} />
      )}

      {activeTab === 'Inventory' && hasPermission(profile.role, 'inventory.view') && (
        <InventoryView
          products={products}
          onInventoryUpdated={fetchProducts}
          canEdit={hasPermission(profile.role, 'inventory.edit')}
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
      stockAlert={stockAlert}
      onCloseStockAlert={handleCloseStockAlert}
    />
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
        canApproveDiscount={hasPermission(profile.role, 'discount.approve')}
        onOpenGiftReceipt={() => setIsGiftReceiptOpen(true)}
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
        onClose={() => { setIsPartialRefundModalOpen(false); setSelectedRefundTxn(null); }}
        onProcessRefund={handleProcessRefund}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        userEmail={profile.email}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      {isHandoverModalOpen && (
        <div className="confirm-overlay" onClick={() => setIsHandoverModalOpen(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: '90%' }}>
            <h3 className="confirm-title">Shift Handover Notes</h3>
            <p className="confirm-message" style={{ marginBottom: 12 }}>
              Add notes for the next shift before clocking out.
            </p>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>General Notes</label>
                <textarea
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="Write any important handover notes..."
                  rows={3}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Cash Discrepancies</label>
                <textarea
                  value={handoverCashDiscrepancies}
                  onChange={(e) => setHandoverCashDiscrepancies(e.target.value)}
                  placeholder="Record any cash drawer discrepancies..."
                  rows={2}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Issues</label>
                <textarea
                  value={handoverIssues}
                  onChange={(e) => setHandoverIssues(e.target.value)}
                  placeholder="List issues encountered during the shift..."
                  rows={2}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Pending Items</label>
                <textarea
                  value={handoverPendingItems}
                  onChange={(e) => setHandoverPendingItems(e.target.value)}
                  placeholder="List pending items for the next shift..."
                  rows={2}
                  style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db', resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="confirm-actions" style={{ marginTop: 16 }}>
              <button
                className="confirm-btn cancel"
                onClick={() => setIsHandoverModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="confirm-btn confirm"
                onClick={handleConfirmClockOut}
                disabled={shiftLoading}
              >
                {shiftLoading ? 'Saving...' : 'Save Notes & Clock Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isHandoverPreviewOpen && latestHandover && (
        <div className="confirm-overlay" onClick={() => setIsHandoverPreviewOpen(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: '90%' }}>
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
              <button
                className="confirm-btn confirm"
                onClick={() => setIsHandoverPreviewOpen(false)}
              >
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
    </div>
  );
};

export default App;