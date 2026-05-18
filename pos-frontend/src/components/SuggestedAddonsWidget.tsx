import React, { useEffect, useState, useMemo } from 'react';
import { Product } from '../data/products';
import { authFetch } from '../utils/authFetch';
import { Sparkles, Plus } from 'lucide-react';

interface CartItem extends Product {
  quantity: number;
}

interface SuggestedAddonsWidgetProps {
  cart: CartItem[];
  allProducts: Product[];
  onAddToCart: (product: Product) => void;
}

/**
 * MBA-powered "Frequently Bought Together" widget.
 * 
 * Strategy:
 *  1. Try to fetch real Apriori rules from the backend reporting service.
 *  2. If backend has no data or is unreachable, fall back to a
 *     category-affinity heuristic: suggest a product from the SAME
 *     category as a cart item that isn't already in the cart.
 *  3. Never blocks the checkout flow. If nothing can be suggested,
 *     the widget simply doesn't render.
 */
export const SuggestedAddonsWidget: React.FC<SuggestedAddonsWidgetProps> = ({
  cart,
  allProducts,
  onAddToCart,
}) => {
  const [backendRules, setBackendRules] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Fetch MBA rules once on mount
  useEffect(() => {
    let cancelled = false;
    const fetchRules = async () => {
      try {
        const res = await authFetch('/api/reporting/mba-rules');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.frequentItemsets?.length > 0) {
            setBackendRules(data.frequentItemsets);
          }
        }
      } catch {
        // Silently ignore — fallback will kick in
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    fetchRules();
    return () => { cancelled = true; };
  }, []);

  // Compute suggestion reactively whenever cart or products change
  const suggestion = useMemo<Product | null>(() => {
    if (cart.length === 0 || allProducts.length === 0) return null;

    const cartIds = new Set(cart.map((item) => Number(item.id)));
    const cartNames = new Set(cart.map((item) => item.name.toLowerCase()));

    // ── Strategy 1: Use real MBA rules from backend ──
    if (backendRules.length > 0) {
      for (const rule of backendRules) {
        const ruleItems: string[] = rule.items.map((i: string) => i.toLowerCase());
        const itemsInCart = ruleItems.filter((i) => cartNames.has(i));

        if (itemsInCart.length > 0 && itemsInCart.length < ruleItems.length) {
          const missingName = ruleItems.find((i) => !cartNames.has(i));
          if (missingName) {
            const match = allProducts.find(
              (p) => p.name.toLowerCase() === missingName && !cartIds.has(Number(p.id))
            );
            if (match) return match;
          }
        }
      }
    }

    // ── Strategy 2: Category-affinity fallback ──
    // "Customers who buy items in this category also buy…"
    // Pick the first product from the same category that isn't in the cart.
    const cartCategories = new Set(cart.map((item) => item.category));

    for (const category of cartCategories) {
      const candidate = allProducts.find(
        (p) => p.category === category && !cartIds.has(Number(p.id))
      );
      if (candidate) return candidate;
    }

    return null;
  }, [cart, allProducts, backendRules]);

  // Don't render anything if there's nothing to suggest
  if (!suggestion) return null;

  return (
    <div
      id="mba-suggested-addons"
      style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '16px',
        border: '1px solid #bbf7d0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        animation: 'fadeSlideIn 0.3s ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        <div
          style={{
            background: '#bbf7d0',
            padding: '7px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Sparkles size={18} color="#16a34a" />
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: '0.7rem',
              color: '#166534',
              margin: '0 0 2px 0',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Frequently Bought Together
          </p>
          <p
            style={{
              fontSize: '0.95rem',
              color: '#14532d',
              margin: 0,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {suggestion.name}
          </p>
        </div>
      </div>
      <button
        onClick={() => onAddToCart(suggestion)}
        style={{
          background: '#16a34a',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.85rem',
          transition: 'all 0.2s',
          boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(22, 163, 74, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(22, 163, 74, 0.2)';
        }}
      >
        <Plus size={16} strokeWidth={3} /> Add
      </button>

      {/* Inline keyframes for the entrance animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
