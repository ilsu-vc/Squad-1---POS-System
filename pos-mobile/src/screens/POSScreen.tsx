/**
 * POS Screen — Product grid + Cart + Payment
 *
 * SCRUM 394: Barcode scanner button integrated
 * SCRUM 395: Bluetooth scanner keyboard listener active
 * SCRUM 396: Scanned SKU wired to GET /products/:sku/stock → auto-add to cart
 * SCRUM 397: Unknown SKU and out-of-stock inline error handling
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal,
  StyleSheet, ActivityIndicator, Alert, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { productApi } from '../services/productApi';
import { transactionApi } from '../services/transactionApi';
import BarcodeScanner from '../components/BarcodeScanner';
import { useBluetoothScanner } from '../hooks/useBluetoothScanner';
import { colors, spacing, fontSizes, borderRadius, shadows } from '../theme/tokens';

interface Product {
  id: string; name: string; price: number; stock: number;
  category?: string; sku?: string;
}
interface CartItem extends Product { quantity: number; }

/**
 * SCRUM 397: Inline scan error type
 */
interface ScanError {
  type: 'unknown_sku' | 'out_of_stock';
  message: string;
  sku: string;
}

const VAT_RATE = 0.12;

export default function POSScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [processing, setProcessing] = useState(false);

  // SCRUM 394: Camera scanner state
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);

  // SCRUM 397: Inline scan error state
  const [scanError, setScanError] = useState<ScanError | null>(null);
  const scanErrorFade = useRef(new Animated.Value(0)).current;

  // Hidden TextInput ref for Bluetooth scanner (SCRUM 395)
  const hiddenInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  // SCRUM 397: Auto-dismiss scan errors after 4 seconds
  useEffect(() => {
    if (scanError) {
      Animated.timing(scanErrorFade, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(scanErrorFade, {
          toValue: 0, duration: 300, useNativeDriver: true,
        }).start(() => setScanError(null));
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [scanError]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productApi.getProducts();
      setProducts(Array.isArray(data) ? data : data?.products || data?.data || []);
    } catch (err: any) {
      Alert.alert('Error', 'Could not load products. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          // SCRUM 397: Out-of-stock error
          setScanError({
            type: 'out_of_stock',
            message: `"${product.name}" is at stock limit (${product.stock} available)`,
            sku: product.id,
          });
          return prev;
        }
        return prev.map((c) => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      if (product.stock <= 0) {
        // SCRUM 397: Out-of-stock error
        setScanError({
          type: 'out_of_stock',
          message: `"${product.name}" is out of stock`,
          sku: product.id,
        });
        return prev;
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  /**
   * SCRUM 396: Look up product by scanned SKU and auto-add to cart.
   * SCRUM 397: Handle unknown SKU and out-of-stock errors inline.
   */
  const handleScannedSku = useCallback(async (sku: string) => {
    if (!sku || scanLoading) return;

    setScanLoading(true);
    setScanError(null);

    try {
      // First, check if we already have this product loaded
      const localMatch = products.find(
        (p) => p.id === sku || p.sku === sku || p.name.toLowerCase() === sku.toLowerCase()
      );

      if (localMatch) {
        addToCart(localMatch);
        setScanLoading(false);
        return;
      }

      // Fetch from backend via GET /products/:sku
      const res = await productApi.getProductBySku(sku);
      const product = res?.product || res; // Some APIs wrap it in { product: ... }

      if (!product || (!product.id && !product.name)) {
        // SCRUM 397: Unknown SKU
        setScanError({
          type: 'unknown_sku',
          message: `Product not found for SKU: "${sku}"`,
          sku,
        });
        setScanLoading(false);
        return;
      }

      // Check stock via GET /products/:sku/stock
      try {
        const stockData = await productApi.getProductStock(sku);
        if (stockData?.stock !== undefined) {
          product.stock = stockData.stock;
        }
      } catch {
        // Use whatever stock info came with the product
      }

      if (product.stock <= 0) {
        // SCRUM 397: Out-of-stock
        setScanError({
          type: 'out_of_stock',
          message: `"${product.name}" is out of stock (0 remaining)`,
          sku,
        });
        setScanLoading(false);
        return;
      }

      // Add to cart
      addToCart(product);

      // Also add to local products list if not already there
      setProducts((prev) => {
        if (prev.find((p) => p.id === product.id)) return prev;
        return [...prev, product];
      });
    } catch (err: any) {
      // SCRUM 397: Unknown SKU (API returned 404 or error)
      setScanError({
        type: 'unknown_sku',
        message: `Product not found for SKU: "${sku}"`,
        sku,
      });
    } finally {
      setScanLoading(false);
    }
  }, [products, scanLoading]);

  // SCRUM 395: Bluetooth scanner hook
  const { handleTextInput, handleSubmit } = useBluetoothScanner({
    onScan: handleScannedSku,
    enabled: !paymentVisible && !scannerVisible,
  });

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newQty = c.quantity + delta;
        if (newQty <= 0) return c;
        if (newQty > c.stock) {
          setScanError({
            type: 'out_of_stock',
            message: `Stock limit reached (${c.stock} available)`,
            sku: c.id,
          });
          return c;
        }
        return { ...c, quantity: newQty };
      })
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const vat = subtotal * VAT_RATE;
  const total = subtotal + vat;
  const change = Math.max(0, parseFloat(cashTendered || '0') - total);
  const itemsCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handlePayment = async () => {
    if (paymentMethod === 'cash' && parseFloat(cashTendered || '0') < total) {
      Alert.alert('Insufficient', 'Cash tendered is less than total.');
      return;
    }
    setProcessing(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id || '';
      const started = await transactionApi.startTransaction(userId);
      const txnId = started?.transactionId || started?.id || '';
      await transactionApi.completeTransaction({
        transactionId: txnId, subtotal, vat, totalAmount: total,
        amountPaid: paymentMethod === 'cash' ? parseFloat(cashTendered) : total,
        paymentMethod, itemsCount,
        items: cart.map((c) => ({
          productId: c.id, productName: c.name, quantity: c.quantity,
          unitPrice: c.price, totalPrice: c.price * c.quantity,
        })),
      });
      Alert.alert('Success', `Transaction complete!\n${paymentMethod === 'cash' ? `Change: ₱${change.toFixed(2)}` : 'Payment received.'}`);
      setCart([]); setPaymentVisible(false); setCashTendered('');
      loadProducts(); // Refresh stock
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Transaction failed');
    } finally {
      setProcessing(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)} activeOpacity={0.7}>
      <View style={styles.productIcon}>
        <Ionicons name="medkit" size={24} color={colors.primary} />
      </View>
      <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.productPrice}>₱{item.price?.toFixed(2)}</Text>
      <Text style={[styles.productStock, item.stock <= 5 && { color: colors.warning }]}>
        Stock: {item.stock}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* SCRUM 395: Hidden TextInput for Bluetooth scanner input */}
      <TextInput
        ref={hiddenInputRef}
        style={styles.hiddenInput}
        onChangeText={handleTextInput}
        onSubmitEditing={handleSubmit}
        autoFocus={false}
        blurOnSubmit={false}
        showSoftInputOnFocus={false}
      />

      {/* LEFT: Products */}
      <View style={styles.productsPanel}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput} value={search} onChangeText={setSearch}
            placeholder="Search products..." placeholderTextColor={colors.textMuted}
          />
          {/* SCRUM 394: Camera scanner button */}
          <TouchableOpacity
            onPress={() => setScannerVisible(true)}
            style={styles.scanButton}
          >
            <Ionicons name="scan-outline" size={20} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={loadProducts}>
            <Ionicons name="refresh" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* SCRUM 397: Inline scan error banner */}
        {scanError && (
          <Animated.View
            style={[
              styles.scanErrorBanner,
              scanError.type === 'out_of_stock' ? styles.scanErrorStock : styles.scanErrorUnknown,
              { opacity: scanErrorFade },
            ]}
          >
            <Ionicons
              name={scanError.type === 'out_of_stock' ? 'alert-circle' : 'help-circle'}
              size={20}
              color={scanError.type === 'out_of_stock' ? colors.warning : colors.error}
            />
            <Text style={[
              styles.scanErrorText,
              { color: scanError.type === 'out_of_stock' ? colors.warning : colors.error },
            ]}>
              {scanError.message}
            </Text>
            <TouchableOpacity onPress={() => setScanError(null)}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Scan loading indicator */}
        {scanLoading && (
          <View style={styles.scanLoadingBar}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.scanLoadingText}>Looking up scanned product...</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filtered} renderItem={renderProduct} keyExtractor={(p) => p.id}
            numColumns={3} contentContainerStyle={styles.productGrid}
            ListEmptyComponent={<Text style={styles.emptyText}>No products found</Text>}
          />
        )}
      </View>

      {/* RIGHT: Cart */}
      <View style={styles.cartPanel}>
        <Text style={styles.cartTitle}>
          <Ionicons name="cart" size={20} color={colors.primary} /> Cart ({itemsCount})
        </Text>
        <ScrollView style={styles.cartList}>
          {cart.length === 0 ? (
            <Text style={styles.emptyCart}>Tap products to add them</Text>
          ) : cart.map((item) => (
            <View key={item.id} style={styles.cartItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>₱{item.price.toFixed(2)} each</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity onPress={() => updateQty(item.id, -1)} style={styles.qtyBtn}>
                  <Ionicons name="remove" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity onPress={() => updateQty(item.id, 1)} style={styles.qtyBtn}>
                  <Ionicons name="add" size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.cartItemTotal}>₱{(item.price * item.quantity).toFixed(2)}</Text>
              <TouchableOpacity onPress={() => removeFromCart(item.id)} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₱{subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT (12%)</Text>
            <Text style={styles.totalValue}>₱{vat.toFixed(2)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>₱{total.toFixed(2)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.payButton, cart.length === 0 && { opacity: 0.4 }]}
          onPress={() => setPaymentVisible(true)} disabled={cart.length === 0}
        >
          <Ionicons name="card-outline" size={22} color={colors.white} />
          <Text style={styles.payButtonText}>Proceed to Payment</Text>
        </TouchableOpacity>
      </View>

      {/* SCRUM 394: Barcode Scanner Modal */}
      <BarcodeScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={(sku) => {
          handleScannedSku(sku);
          setScannerVisible(false);
        }}
      />

      {/* Payment Modal */}
      <Modal visible={paymentVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Payment</Text>
            <Text style={styles.modalTotal}>Total: ₱{total.toFixed(2)}</Text>
            {/* Method selection */}
            <View style={styles.methodRow}>
              {['cash', 'card', 'gcash'].map((m) => (
                <TouchableOpacity key={m}
                  style={[styles.methodBtn, paymentMethod === m && styles.methodActive]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Ionicons
                    name={m === 'cash' ? 'cash-outline' : m === 'card' ? 'card-outline' : 'phone-portrait-outline'}
                    size={20} color={paymentMethod === m ? colors.white : colors.textSecondary}
                  />
                  <Text style={[styles.methodText, paymentMethod === m && { color: colors.white }]}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {paymentMethod === 'cash' && (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={styles.inputLabel}>Cash Tendered</Text>
                <TextInput
                  style={styles.cashInput} value={cashTendered} onChangeText={setCashTendered}
                  placeholder="0.00" placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.changeText}>Change: ₱{change.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPaymentVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, processing && { opacity: 0.6 }]}
                onPress={handlePayment} disabled={processing}
              >
                {processing ? <ActivityIndicator color={colors.white} /> :
                  <Text style={styles.confirmBtnText}>Confirm Payment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  // SCRUM 395: Hidden input for Bluetooth scanner
  hiddenInput: {
    position: 'absolute', width: 1, height: 1, opacity: 0, top: -100,
  },
  // Products
  productsPanel: { flex: 0.6, padding: spacing.lg, borderRightWidth: 1, borderRightColor: colors.border },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, height: 44, gap: spacing.sm, marginBottom: spacing.lg,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: fontSizes.md },
  // SCRUM 394: Scan button
  scanButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  // SCRUM 397: Error banners
  scanErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: borderRadius.sm, marginBottom: spacing.md,
  },
  scanErrorUnknown: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  scanErrorStock: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  scanErrorText: { flex: 1, fontSize: fontSizes.sm, fontWeight: '600' },
  scanLoadingBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, backgroundColor: 'rgba(79,140,255,0.1)',
    borderRadius: borderRadius.sm, marginBottom: spacing.md,
  },
  scanLoadingText: { color: colors.primary, fontSize: fontSizes.sm, fontWeight: '500' },
  productGrid: { gap: spacing.md, paddingBottom: spacing.huge },
  productCard: {
    flex: 1, maxWidth: '31%', backgroundColor: colors.surface, borderRadius: borderRadius.md,
    padding: spacing.lg, margin: spacing.xs, borderWidth: 1, borderColor: colors.border, ...shadows.card,
  },
  productIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(79,140,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  productName: { color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: '600', marginBottom: spacing.xs },
  productPrice: { color: colors.primary, fontSize: fontSizes.lg, fontWeight: '700', marginBottom: spacing.xs },
  productStock: { color: colors.textMuted, fontSize: fontSizes.xs },
  emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: fontSizes.md },
  // Cart
  cartPanel: { flex: 0.4, padding: spacing.lg, backgroundColor: colors.surface },
  cartTitle: { color: colors.textPrimary, fontSize: fontSizes.xl, fontWeight: '700', marginBottom: spacing.lg },
  cartList: { flex: 1 },
  emptyCart: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: fontSizes.md },
  cartItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm,
  },
  cartItemName: { color: colors.textPrimary, fontSize: fontSizes.sm, fontWeight: '600' },
  cartItemPrice: { color: colors.textMuted, fontSize: fontSizes.xs },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceHover,
    justifyContent: 'center', alignItems: 'center',
  },
  qtyText: { color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  cartItemTotal: { color: colors.primary, fontSize: fontSizes.sm, fontWeight: '700', minWidth: 70, textAlign: 'right' },
  // Totals
  totalsSection: {
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.sm,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  totalLabel: { color: colors.textSecondary, fontSize: fontSizes.md },
  totalValue: { color: colors.textPrimary, fontSize: fontSizes.md, fontWeight: '500' },
  grandTotalRow: {
    borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, marginTop: spacing.xs,
  },
  grandTotalLabel: { color: colors.textPrimary, fontSize: fontSizes.lg, fontWeight: '700' },
  grandTotalValue: { color: colors.primary, fontSize: fontSizes.xl, fontWeight: '700' },
  payButton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.success, borderRadius: borderRadius.md, height: 52, marginTop: spacing.lg, ...shadows.card,
  },
  payButtonText: { color: colors.white, fontSize: fontSizes.lg, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.xxxl,
    width: 420, ...shadows.elevated,
  },
  modalTitle: { color: colors.textPrimary, fontSize: fontSizes.xxl, fontWeight: '700', marginBottom: spacing.sm },
  modalTotal: { color: colors.primary, fontSize: fontSizes.xl, fontWeight: '700', marginBottom: spacing.xl },
  methodRow: { flexDirection: 'row', gap: spacing.sm },
  methodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm, paddingVertical: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  methodActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodText: { color: colors.textSecondary, fontSize: fontSizes.sm, fontWeight: '600' },
  inputLabel: { color: colors.textSecondary, fontSize: fontSizes.sm, marginBottom: spacing.sm },
  cashInput: {
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.sm, padding: spacing.md,
    color: colors.textPrimary, fontSize: fontSizes.xl, fontWeight: '600', borderWidth: 1, borderColor: colors.border,
  },
  changeText: { color: colors.success, fontSize: fontSizes.lg, fontWeight: '600', marginTop: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xxl },
  cancelBtn: {
    flex: 1, borderRadius: borderRadius.md, height: 48, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border,
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: fontSizes.md, fontWeight: '600' },
  confirmBtn: {
    flex: 1, borderRadius: borderRadius.md, height: 48, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.success, ...shadows.card,
  },
  confirmBtnText: { color: colors.white, fontSize: fontSizes.md, fontWeight: '600' },
});
