// --- Types ---

export interface Transaction {
    id: string;
    receiptNumber?: string | null;
    date: string;
    time: string;
    amount: string;
    rawAmount: number;
    method: string;
    itemsCount: number;
    items: Array<{
        name: string;
        qty: number;
        price: number;
        category?: string;
    }>;
    subtotal: number;
    tax: number;
    hour: string;
    customerName?: string;
    changeAmount?: number;
    change_amount?: number;
    amountPaid?: number;
    amount_paid?: number;
    discountType?: string;
    discountAmount?: number;
    notes?: string;
    tags?: string[];
    type?: 'sale' | 'refund';
    originalTransactionId?: string;
    cashierName?: string;
}

export interface RevenueByHour {
    time: string;
    amount: number;
}

export interface CategoryData {
    name: string;
    value: number;
}

export interface PaymentMethodStat {
    name: string;
    count: number;
    percentage: number;
    color: string;
}

// --- Chart Color Helpers ---

export const getBarColor = (index: number): string => {
    const colors = [
        '#1b2a47',
        '#22365f',
        '#253a64',
        '#283f6d',
        '#2f4b82',
        '#375798',
        '#3960ac',
        '#4c72be',
    ];
    return colors[index % colors.length];
};

export const getPaymentMethodColor = (index: number): string => {
    const colors = ['#1b2a47', '#1b2a47', '#1b2a47'];
    return colors[index];
};

// --- Chart Data Helpers ---

export const getRevenueByHour = (transactions: Transaction[]): RevenueByHour[] => {
    const hours = [
        '12AM', '1AM', '2AM', '3AM', '4AM', '5AM',
        '6AM', '7AM', '8AM', '9AM', '10AM', '11AM',
        '12PM', '1PM', '2PM', '3PM', '4PM', '5PM',
        '6PM', '7PM', '8PM', '9PM', '10PM', '11PM',
    ];
    
    if (!Array.isArray(transactions)) {
        return hours.map(h => ({ time: h, amount: 0 }));
    }

    return hours.map((h) => ({
        time: h,
        amount: transactions
            .filter((t) => t && t.hour === h)
            .reduce((acc, curr) => acc + (curr?.rawAmount || 0), 0),
    }));
};

export const getCategoryData = (transactions: Transaction[]): CategoryData[] => {
    if (!Array.isArray(transactions)) {
        return [{ name: 'None', value: 0 }];
    }

    const counts: Record<string, number> = {};
    transactions.forEach((t) => {
        if (t && Array.isArray(t.items)) {
            t.items.forEach((item) => {
                if (item?.category) {
                    counts[item.category] = (counts[item.category] || 0) + (item.qty || 0);
                }
            });
        }
    });
    const data = Object.keys(counts).map((key) => ({ name: key, value: counts[key] }));
    return data.length > 0 ? data : [{ name: 'None', value: 0 }];
};

export const getPaymentMethodStats = (transactions: Transaction[]): PaymentMethodStat[] => {
    if (!Array.isArray(transactions)) return [];

    // Normalize inconsistent method names from local state and DB into canonical names
    const normalizeMethod = (raw: string): string => {
        const m = (raw || '').trim().toLowerCase();
        if (m === 'cash' || m === 'cash payment') return 'Cash';
        if (m === 'gcash' || m === 'mobile' || m === 'mobile payment') return 'GCash / Mobile';
        if (m === 'card' || m === 'card payment' || m === 'credit/debit card' || m === 'credit card') return 'Card';
        if (m === 'split' || m === 'split payment' || m.includes(' + ')) return 'Split';
        return raw || 'Other';
    };

    const methodColors: Record<string, string> = {
        'Cash': '#1b2a47',
        'GCash / Mobile': '#314566',
        'Card': '#4a6288',
        'Split': '#6b83ab',
    };

    const fallbackColors = ['#1b2a47', '#314566', '#4a6288', '#6b83ab', '#90a7cb'];

    const counts: Record<string, number> = {};
    transactions.forEach((t) => {
        if (!t || t.type === 'refund') return;
        const method = normalizeMethod(t.method || 'Other');
        counts[method] = (counts[method] || 0) + 1;
    });

    const totalCount = Object.values(counts).reduce((s, c) => s + c, 0);
    if (totalCount === 0) return [];

    return Object.entries(counts)
        .map(([name, count], index) => ({
            name,
            count,
            percentage: Math.round((count / totalCount) * 100),
            color: methodColors[name] || fallbackColors[index % fallbackColors.length],
        }))
        .sort((a, b) => b.count - a.count);
};
