"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const supabase_js_1 = require("@supabase/supabase-js");
const helmet_1 = __importDefault(require("helmet"));
const zod_1 = require("zod");
const amqplib_1 = __importDefault(require("amqplib"));
dotenv_1.default.config();
// ── OWASP: Validate required environment variables at startup ─────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}
const app = (0, express_1.default)();
// ── OWASP: Secure HTTP headers ────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10kb' }));
// ── Supabase Client Factory (JWT-forwarding) ──────────────────────────────────
const getSupabase = (req) => {
    const authHeader = req.headers.authorization;
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
        global: { headers: authHeader ? { Authorization: authHeader } : {} }
    });
};
const PORT = process.env.PORT || 4007;
// ── RabbitMQ Publisher ────────────────────────────────────────────────────────
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = 'transaction_events';
let rabbitChannel = null;
async function connectRabbitMQ(retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            const connection = await amqplib_1.default.connect(RABBITMQ_URL);
            rabbitChannel = await connection.createChannel();
            await rabbitChannel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
            console.log('✅ [TransactionService] Connected to RabbitMQ');
            connection.on('error', (err) => {
                console.error('[TransactionService] RabbitMQ connection error:', err.message);
                rabbitChannel = null;
            });
            connection.on('close', () => {
                console.warn('[TransactionService] RabbitMQ connection closed. Reconnecting...');
                rabbitChannel = null;
                setTimeout(() => connectRabbitMQ(retries), 5000);
            });
            return;
        }
        catch (err) {
            console.warn(`[TransactionService] RabbitMQ connection attempt ${i + 1}/${retries} failed: ${err.message}`);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }
    console.error('[TransactionService] Could not connect to RabbitMQ after all retries. Events will not be published.');
}
function publishTransactionCompleted(payload) {
    if (!rabbitChannel) {
        console.warn('[TransactionService] RabbitMQ channel not available — skipping event publish');
        return;
    }
    try {
        const message = Buffer.from(JSON.stringify({
            event: 'transaction.completed',
            data: payload,
            timestamp: new Date().toISOString(),
        }));
        rabbitChannel.publish(EXCHANGE_NAME, '', message, { persistent: true });
        console.log('[TransactionService] Published transaction.completed event');
    }
    catch (err) {
        console.error('[TransactionService] Failed to publish event:', err.message);
    }
}
// ── Validation Middleware Factory ─────────────────────────────────────────────
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            error: 'Validation failed',
            details: result.error.flatten().fieldErrors,
        });
    }
    req.body = result.data;
    next();
};
// ── Zod Schemas ───────────────────────────────────────────────────────────────
const TransactionItemSchema = zod_1.z.object({
    product_id: zod_1.z.union([zod_1.z.string(), zod_1.z.number()]).optional(),
    name: zod_1.z.string().max(200),
    category: zod_1.z.string().max(100).nullable().optional(),
    unit_price: zod_1.z.number().min(0),
    quantity: zod_1.z.number().int().min(1),
});
const CreateTransactionSchema = zod_1.z.object({
    vat: zod_1.z.number().min(0).max(1000000).optional(),
    subtotal: zod_1.z.number().min(0).max(10000000).optional(),
    totalAmount: zod_1.z.number().min(0).max(10000000),
    paymentMethod: zod_1.z.string().max(50),
    itemsCount: zod_1.z.number().int().min(1),
    items: zod_1.z.array(zod_1.z.any()).min(1, 'At least one item is required'),
    discountType: zod_1.z.string().max(50).optional(),
    discountAmount: zod_1.z.number().min(0).max(10000000).optional(),
    notes: zod_1.z.string().max(1000).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(100)).optional(),
});
const CompleteTransactionSchema = zod_1.z.object({
    transactionId: zod_1.z.string().uuid('Invalid transactionId'),
    vat: zod_1.z.number().min(0).max(1000000).optional(),
    subtotal: zod_1.z.number().min(0).max(10000000).optional(),
    totalAmount: zod_1.z.number().min(0).max(10000000),
    amountPaid: zod_1.z.number().min(0).max(10000000).optional(),
    paymentMethod: zod_1.z.string().max(50),
    itemsCount: zod_1.z.number().int().min(1),
    items: zod_1.z.array(zod_1.z.any()).min(1, 'At least one item is required'),
    discountType: zod_1.z.string().max(50).optional(),
    discountAmount: zod_1.z.number().min(0).max(10000000).optional(),
    notes: zod_1.z.string().max(1000).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(100)).optional(),
});
const CancelTransactionSchema = zod_1.z.object({
    transactionId: zod_1.z.string().uuid('Invalid transactionId'),
});
const UpdateNotesSchema = zod_1.z.object({
    notes: zod_1.z.string().max(1000).optional(),
    tags: zod_1.z.array(zod_1.z.string().max(100)).optional(),
});
const HoldTransactionSchema = zod_1.z.object({
    label: zod_1.z.string().max(200).optional(),
    total: zod_1.z.number().min(0).max(10000000),
    items: zod_1.z.array(TransactionItemSchema).min(1, 'At least one item is required'),
});
const RefundSchema = zod_1.z.object({
    originalTransactionId: zod_1.z.string().uuid('Invalid originalTransactionId'),
    items: zod_1.z.array(TransactionItemSchema).min(1, 'At least one item is required'),
    refundSubtotal: zod_1.z.number().min(0).max(10000000),
    refundTax: zod_1.z.number().min(0).max(1000000),
    refundTotal: zod_1.z.number().min(0).max(10000000),
    reason: zod_1.z.string().max(500).optional(),
});
// ── Helper: fire-and-forget stock decrements via product-service ───────────────
async function decrementStock(items, authHeader) {
    const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:4002';
    Promise.allSettled(items.map(async (item) => {
        if (!item.product_id)
            return;
        try {
            const response = await fetch(`${inventoryServiceUrl}/products/${item.product_id}/decrement`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authHeader ? { Authorization: authHeader } : {}),
                },
                body: JSON.stringify({ quantity: Number(item.quantity) || 1 }),
            });
            if (!response.ok) {
                const errText = await response.text();
                console.error(`[TransactionService] Stock decrement failed for ${item.product_id}: ${response.status} ${errText}`);
            }
            else {
                console.log(`[TransactionService] Stock decremented for product ${item.product_id} by ${item.quantity}`);
            }
        }
        catch (err) {
            console.error(`[TransactionService] Error decrementing stock for product ${item.product_id}:`, err);
        }
    }));
}
// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────
// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ service: 'transaction-service', status: 'ok', port: PORT, rabbitmq: rabbitChannel ? 'connected' : 'disconnected' });
});
// ── POST /transactions ────────────────────────────────────────────────────────
// RESTful: creates a pending transaction and immediately completes it in one call.
app.post('/transactions', validate(CreateTransactionSchema), async (req, res) => {
    const { vat, subtotal, totalAmount, paymentMethod, itemsCount, items, discountType, discountAmount, notes, tags } = req.body;
    try {
        // Step 1: create a pending transaction row
        const { data: txnRow, error: txnErr } = await getSupabase(req)
            .from('transactions')
            .insert({ status: 'pending' })
            .select('id')
            .single();
        if (txnErr)
            return res.status(500).json({ error: txnErr.message });
        const transactionId = txnRow.id;
        // Step 2: confirm and issue receipt via Supabase RPC
        const { data: receiptRows, error: rpcErr } = await getSupabase(req).rpc('confirm_payment_and_issue_receipt', {
            p_transaction_id: transactionId,
            p_vat: Number(vat ?? 0),
            p_subtotal: Number(subtotal ?? 0),
            p_total_amount: Number(totalAmount ?? 0),
            p_payment_method: paymentMethod,
            p_items_count: itemsCount,
            p_items: items,
            p_discount_type: discountType || 'None',
            p_discount_amount: Number(discountAmount ?? 0),
        });
        if (rpcErr)
            return res.status(500).json({ error: rpcErr.message });
        const receipt = Array.isArray(receiptRows) ? receiptRows[0] : receiptRows;
        const receiptNumber = receipt?.o_receipt_number ?? null;
        if (notes !== undefined || tags !== undefined) {
            await getSupabase(req).from('transactions').update({ notes, tags }).eq('id', transactionId);
        }
        // Step 3: fire-and-forget stock decrements
        decrementStock(items, req.headers.authorization);
        // Step 4: emit transaction.completed event to message queue
        publishTransactionCompleted({
            transactionId,
            receiptNumber,
            totalAmount,
            paymentMethod,
            itemsCount,
            items,
            completedAt: new Date().toISOString(),
        });
        res.status(201).json({ transactionId, receiptNumber });
    }
    catch (err) {
        console.error('[TransactionService] POST /transactions error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── GET /transactions ─────────────────────────────────────────────────────────
// Returns all completed transactions (for History page & Dashboard).
app.get('/transactions', async (req, res) => {
    try {
        const { data: txns, error: txnErr } = await getSupabase(req)
            .from('transactions')
            .select(`
        id,
        status,
        total_amount,
        vat,
        subtotal,
        payment_method,
        items_count,
        discount_type,
        discount_amount,
        notes,
        tags,
        created_at,
        transaction_items (
          item_name,
          category,
          unit_price,
          quantity
        ),
        receipts (
          receipt_number
        )
      `)
            .eq('status', 'completed')
            .order('created_at', { ascending: false });
        if (txnErr)
            return res.status(500).json({ error: txnErr.message });
        const formatted = (txns || [])
            .map((t) => {
            try {
                if (!t.created_at)
                    return null;
                const createdAt = new Date(t.created_at);
                if (isNaN(createdAt.getTime()))
                    return null;
                const h = createdAt.getHours();
                const hour = h >= 12 ? (h === 12 ? '12PM' : `${h - 12}PM`) : h === 0 ? '12AM' : `${h}AM`;
                const rawAmount = Number(t.total_amount ?? 0);
                let receiptNumber = null;
                if (t.receipts) {
                    if (Array.isArray(t.receipts) && t.receipts.length > 0) {
                        receiptNumber = t.receipts[0].receipt_number;
                    }
                    else if (!Array.isArray(t.receipts)) {
                        receiptNumber = t.receipts.receipt_number;
                    }
                }
                return {
                    id: t.id,
                    receiptNumber,
                    date: createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    }),
                    time: createdAt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    }),
                    hour,
                    amount: `₱${rawAmount.toFixed(2)}`,
                    rawAmount,
                    method: t.payment_method ?? 'Unknown',
                    itemsCount: Number(t.items_count ?? 0),
                    items: (t.transaction_items || []).map((item) => ({
                        name: item.item_name,
                        qty: Number(item.quantity),
                        price: Number(item.unit_price),
                        category: item.category ?? undefined,
                    })),
                    subtotal: Number(t.subtotal ?? 0),
                    tax: Number(t.vat ?? 0),
                    discountType: t.discount_type ?? 'None',
                    discountAmount: Number(t.discount_amount ?? 0),
                    notes: t.notes ?? undefined,
                    tags: Array.isArray(t.tags) ? t.tags : [],
                    type: 'sale',
                };
            }
            catch (e) {
                console.error(`Error formatting transaction ${t.id}:`, e);
                return null;
            }
        })
            .filter((t) => t !== null);
        res.json({ transactions: formatted });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── GET /transactions/:id ─────────────────────────────────────────────────────
// Fetch a single transaction by ID with its items and receipt.
app.get('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return res.status(400).json({ error: 'Invalid transaction ID format' });
    }
    try {
        const { data, error } = await getSupabase(req)
            .from('transactions')
            .select(`
        id,
        status,
        total_amount,
        vat,
        subtotal,
        payment_method,
        items_count,
        discount_type,
        discount_amount,
        notes,
        tags,
        created_at,
        transaction_items (
          id,
          item_name,
          category,
          unit_price,
          quantity
        ),
        receipts (
          receipt_number
        )
      `)
            .eq('id', id)
            .single();
        if (error)
            return res.status(404).json({ error: 'Transaction not found' });
        let receiptNumber = null;
        if (data.receipts) {
            if (Array.isArray(data.receipts) && data.receipts.length > 0) {
                receiptNumber = data.receipts[0].receipt_number;
            }
            else if (!Array.isArray(data.receipts)) {
                receiptNumber = data.receipts.receipt_number;
            }
        }
        res.json({
            transaction: {
                id: data.id,
                status: data.status,
                totalAmount: data.total_amount,
                vat: data.vat,
                subtotal: data.subtotal,
                paymentMethod: data.payment_method,
                itemsCount: data.items_count,
                discountType: data.discount_type,
                discountAmount: data.discount_amount,
                notes: data.notes,
                tags: data.tags,
                createdAt: data.created_at,
                receiptNumber,
                items: (data.transaction_items || []).map((item) => ({
                    id: item.id,
                    name: item.item_name,
                    category: item.category,
                    unitPrice: item.unit_price,
                    quantity: item.quantity,
                })),
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── GET /transactions/:id/receipt ─────────────────────────────────────────────
// Fetch the receipt record for a given transaction ID.
app.get('/transactions/:id/receipt', async (req, res) => {
    const { id } = req.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return res.status(400).json({ error: 'Invalid transaction ID format' });
    }
    try {
        const { data, error } = await getSupabase(req)
            .from('transactions')
            .select('*, receipts(*)')
            .eq('id', id)
            .single();
        if (error)
            return res.status(500).json({ error: error.message });
        if (!data || !data.receipts)
            return res.status(404).json({ error: 'Receipt not found for this transaction' });
        const receiptData = Array.isArray(data.receipts) ? data.receipts[0] : data.receipts;
        res.json({ receipt: receiptData });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── POST /transactions/hold ───────────────────────────────────────────────────
// Saves the current cart as a held transaction in the held_transactions table.
app.post('/transactions/hold', validate(HoldTransactionSchema), async (req, res) => {
    const { label, total, items } = req.body;
    try {
        const { data, error } = await getSupabase(req)
            .from('held_transactions')
            .insert({
            label: label || null,
            total,
            items,
            held_at: new Date().toISOString(),
        })
            .select('id')
            .single();
        if (error)
            return res.status(500).json({ error: error.message });
        res.status(201).json({ holdId: data.id, message: 'Transaction held successfully' });
    }
    catch (err) {
        console.error('[TransactionService] POST /transactions/hold error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── POST /transactions/hold/:id/resume ────────────────────────────────────────
// Resumes a held transaction: returns cart items and removes the hold record.
app.post('/transactions/hold/:id/resume', async (req, res) => {
    const { id } = req.params;
    try {
        const { data: held, error: fetchErr } = await getSupabase(req)
            .from('held_transactions')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchErr || !held) {
            return res.status(404).json({ error: 'Held transaction not found' });
        }
        const { error: deleteErr } = await getSupabase(req)
            .from('held_transactions')
            .delete()
            .eq('id', id);
        if (deleteErr)
            return res.status(500).json({ error: deleteErr.message });
        res.json({
            message: 'Held transaction resumed',
            items: held.items,
            total: held.total,
            label: held.label,
        });
    }
    catch (err) {
        console.error('[TransactionService] POST /transactions/hold/:id/resume error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── POST /transactions/refund ─────────────────────────────────────────────────
// Records a refund against an original completed transaction.
app.post('/transactions/refund', validate(RefundSchema), async (req, res) => {
    const { originalTransactionId, items, refundSubtotal, refundTax, refundTotal, reason } = req.body;
    try {
        // Verify the original transaction exists and is completed
        const { data: original, error: origErr } = await getSupabase(req)
            .from('transactions')
            .select('id, status')
            .eq('id', originalTransactionId)
            .single();
        if (origErr || !original) {
            return res.status(404).json({ error: 'Original transaction not found' });
        }
        if (original.status !== 'completed') {
            return res.status(400).json({ error: 'Can only refund completed transactions' });
        }
        // Create a refund transaction row (negative amounts)
        const { data: refundTxn, error: insertErr } = await getSupabase(req)
            .from('transactions')
            .insert({
            status: 'refunded',
            total_amount: -Math.abs(refundTotal),
            vat: -Math.abs(refundTax),
            subtotal: -Math.abs(refundSubtotal),
            payment_method: 'refund',
            items_count: items.reduce((sum, i) => sum + i.quantity, 0),
            discount_type: 'None',
            discount_amount: 0,
            notes: reason ? `Refund reason: ${reason}` : null,
        })
            .select('id')
            .single();
        if (insertErr)
            return res.status(500).json({ error: insertErr.message });
        // Insert refund items into transaction_items
        const refundItems = items.map((item) => ({
            transaction_id: refundTxn.id,
            item_name: item.name,
            category: item.category ?? null,
            unit_price: item.unit_price,
            quantity: item.quantity,
        }));
        const { error: itemsErr } = await getSupabase(req)
            .from('transaction_items')
            .insert(refundItems);
        if (itemsErr) {
            console.error('[TransactionService] Failed to insert refund items:', itemsErr.message);
        }
        res.status(201).json({
            refundTransactionId: refundTxn.id,
            originalTransactionId,
            refundTotal: -Math.abs(refundTotal),
            message: 'Refund processed successfully',
        });
    }
    catch (err) {
        console.error('[TransactionService] POST /transactions/refund error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── POST /transactions/initiate ───────────────────────────────────────────────
// Legacy 2-step flow: creates a pending transaction ID for the POS checkout modal.
app.post('/transactions/initiate', async (req, res) => {
    try {
        const { data, error } = await getSupabase(req)
            .from('transactions')
            .insert({ status: 'pending' })
            .select('id')
            .single();
        if (error)
            return res.status(500).json({ error: error.message });
        res.status(201).json({ transactionId: data.id });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── POST /transactions/complete ───────────────────────────────────────────────
// Legacy 2-step flow: completes an already-initiated pending transaction.
app.post('/transactions/complete', validate(CompleteTransactionSchema), async (req, res) => {
    const { transactionId, vat, subtotal, totalAmount, amountPaid, paymentMethod, itemsCount, items, discountType, discountAmount, notes, tags } = req.body;
    try {
        const { data: receiptRows, error: rpcErr } = await getSupabase(req).rpc('confirm_payment_and_issue_receipt', {
            p_transaction_id: transactionId,
            p_vat: Number(vat ?? 0),
            p_subtotal: Number(subtotal ?? 0),
            p_total_amount: Number(totalAmount ?? 0),
            p_payment_method: paymentMethod,
            p_items_count: itemsCount,
            p_items: items,
            p_discount_type: discountType || 'None',
            p_discount_amount: Number(discountAmount ?? 0),
        });
        if (rpcErr)
            return res.status(500).json({ error: rpcErr.message });
        const receipt = Array.isArray(receiptRows) ? receiptRows[0] : receiptRows;
        const receiptNumber = receipt?.o_receipt_number ?? null;
        if (notes !== undefined || tags !== undefined) {
            await getSupabase(req).from('transactions').update({ notes, tags }).eq('id', transactionId);
        }
        decrementStock(items, req.headers.authorization);
        // Emit transaction.completed event to message queue
        publishTransactionCompleted({
            transactionId,
            receiptNumber,
            totalAmount,
            paymentMethod,
            itemsCount,
            items,
            completedAt: new Date().toISOString(),
        });
        // Calculate change amount on backend
        const changeAmount = amountPaid !== undefined ? Math.max(0, amountPaid - Number(totalAmount ?? 0)) : 0;
        res.json({ receiptNumber, transactionId, changeAmount });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── POST /transactions/cancel ─────────────────────────────────────────────────
app.post('/transactions/cancel', validate(CancelTransactionSchema), async (req, res) => {
    const { transactionId } = req.body;
    try {
        const { error } = await getSupabase(req)
            .from('transactions')
            .update({ status: 'cancelled' })
            .eq('id', transactionId);
        if (error)
            return res.status(500).json({ error: error.message });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── PUT /transactions/:id/notes ───────────────────────────────────────────────
app.put('/transactions/:id/notes', validate(UpdateNotesSchema), async (req, res) => {
    const { id } = req.params;
    const { notes, tags } = req.body;
    try {
        const { error } = await getSupabase(req)
            .from('transactions')
            .update({ notes, tags })
            .eq('id', id);
        if (error)
            return res.status(500).json({ error: error.message });
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ── Start Server ──────────────────────────────────────────────────────────────
connectRabbitMQ().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ transaction-service running on port ${PORT}`);
    });
});
