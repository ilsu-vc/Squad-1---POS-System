/**
 * PACT CONSUMER TESTS — Transaction Service
 * ─────────────────────────────────────────────────────────────────────────────
 * SCRUM 298: POS-S4-013-T1 — Set up Pact consumer tests in frontend repo
 *
 * These tests define the contract between the POS Frontend (consumer) and
 * the Transaction Service (provider) on port 4007.
 *
 * Contracts covered:
 *   1. POST /transactions        — Create a new transaction
 *   2. GET  /transactions/:id/receipt — Fetch receipt for a transaction
 *   3. POST /transactions (with discount) — Transaction with discount fields
 *
 * Run with: npm run test:pact:consumer
 *
 * After running, pact contracts are written to tests/pact/pacts/
 */

const path = require('path');
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');

const {
  like,
  eachLike,
  uuid,
  string,
  integer,
  decimal,
} = MatchersV3;

// ── Pact Provider Setup ──────────────────────────────────────────────────────
const provider = new PactV3({
  consumer: 'POSFrontend',
  provider: 'TransactionService',
  dir: path.resolve(__dirname, '..', 'pacts'), // Output dir for pact JSON files
  logLevel: 'warn',
});

// ── Helper: build a minimal valid transaction payload ─────────────────────────
function buildTransactionPayload(overrides = {}) {
  return {
    totalAmount: 250.00,
    paymentMethod: 'cash',
    itemsCount: 2,
    items: [
      {
        product_id: '1',
        name: 'Test Product A',
        category: 'Beverages',
        unit_price: 100.00,
        quantity: 1,
      },
      {
        product_id: '2',
        name: 'Test Product B',
        category: 'Snacks',
        unit_price: 150.00,
        quantity: 1,
      },
    ],
    vat: 26.79,
    subtotal: 223.21,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('📝 Pact Consumer Tests — Transaction Service', () => {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Contract 1: POST /transactions — Create a new transaction
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('POST /transactions — Create Transaction', () => {
    it('should return 201 with transactionId and receiptNumber', async () => {
      // Define the expected interaction
      provider
        .given('the transaction service is available')
        .uponReceiving('a request to create a new transaction')
        .withRequest({
          method: 'POST',
          path: '/transactions',
          headers: {
            'Content-Type': 'application/json',
          },
          body: buildTransactionPayload(),
        })
        .willRespondWith({
          status: 201,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            transactionId: like('550e8400-e29b-41d4-a716-446655440000'),
            receiptNumber: like('REC-000001'),
          },
        });

      // Execute the test against the mock server
      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildTransactionPayload()),
        });

        expect(response.status).toBe(201);

        const body = await response.json();
        expect(body).toHaveProperty('transactionId');
        expect(body).toHaveProperty('receiptNumber');
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Contract 2: POST /transactions — Validation failure (empty body)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('POST /transactions — Validation Failure', () => {
    it('should return 400 with validation error for empty body', async () => {
      provider
        .given('the transaction service is available')
        .uponReceiving('a request to create transaction with empty body')
        .withRequest({
          method: 'POST',
          path: '/transactions',
          headers: {
            'Content-Type': 'application/json',
          },
          body: { paymentMethod: 'cash' },
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            error: 'Validation failed',
            details: like({}),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentMethod: 'cash' }),
        });

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.error).toBe('Validation failed');
        expect(body).toHaveProperty('details');
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Contract 3: GET /transactions/:id/receipt — Fetch receipt
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('GET /transactions/:id/receipt — Fetch Receipt', () => {
    it('should return 200 with receipt data for a valid transaction', async () => {
      const txnId = '550e8400-e29b-41d4-a716-446655440000';

      provider
        .given('a completed transaction exists', { transactionId: txnId })
        .uponReceiving('a request to fetch receipt for a transaction')
        .withRequest({
          method: 'GET',
          path: `/transactions/${txnId}/receipt`,
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            receipt: like({
              id: like(1),
              receipt_number: like('REC-000001'),
              transaction_id: like(txnId),
            }),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/transactions/${txnId}/receipt`
        );

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty('receipt');
        expect(body.receipt).toHaveProperty('receipt_number');
        expect(body.receipt).toHaveProperty('transaction_id');
      });
    });

    it('should return 400 for invalid transaction ID format', async () => {
      provider
        .given('the transaction service is available')
        .uponReceiving('a request for receipt with invalid ID format')
        .withRequest({
          method: 'GET',
          path: '/transactions/not-a-uuid/receipt',
        })
        .willRespondWith({
          status: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            error: 'Invalid transaction ID format',
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/transactions/not-a-uuid/receipt`
        );

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.error).toBe('Invalid transaction ID format');
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Contract 4: POST /transactions with discount — Discount handling
  // (Maps to acceptance criteria: POST /discounts/validate)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('POST /transactions — With Discount Fields', () => {
    it('should accept transaction with discountType and discountAmount', async () => {
      const payload = buildTransactionPayload({
        discountType: 'Senior',
        discountAmount: 50.00,
        totalAmount: 200.00,
      });

      provider
        .given('the transaction service is available')
        .uponReceiving('a request to create a transaction with discount')
        .withRequest({
          method: 'POST',
          path: '/transactions',
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload,
        })
        .willRespondWith({
          status: 201,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            transactionId: like('550e8400-e29b-41d4-a716-446655440000'),
            receiptNumber: like('REC-000002'),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        expect(response.status).toBe(201);

        const body = await response.json();
        expect(body).toHaveProperty('transactionId');
        expect(body).toHaveProperty('receiptNumber');
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Contract 5: GET /transactions — List transactions
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('GET /transactions — List Transactions', () => {
    it('should return 200 with array of transactions', async () => {
      provider
        .given('completed transactions exist')
        .uponReceiving('a request to list all transactions')
        .withRequest({
          method: 'GET',
          path: '/transactions',
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            transactions: eachLike({
              id: like('550e8400-e29b-41d4-a716-446655440000'),
              receiptNumber: like('REC-000001'),
              date: like('Apr 10, 2026'),
              time: like('10:30:00 AM'),
              hour: like('10AM'),
              amount: like('₱250.00'),
              rawAmount: like(250.00),
              method: like('cash'),
              itemsCount: like(2),
              items: eachLike({
                name: like('Test Product'),
                qty: like(1),
                price: like(100.00),
              }),
              subtotal: like(223.21),
              tax: like(26.79),
              discountType: like('None'),
              discountAmount: like(0),
              type: 'sale',
            }),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/transactions`);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty('transactions');
        expect(Array.isArray(body.transactions)).toBe(true);
        expect(body.transactions.length).toBeGreaterThan(0);

        const txn = body.transactions[0];
        expect(txn).toHaveProperty('id');
        expect(txn).toHaveProperty('receiptNumber');
        expect(txn).toHaveProperty('amount');
        expect(txn).toHaveProperty('method');
        expect(txn).toHaveProperty('items');
        expect(txn.type).toBe('sale');
      });
    });
  });
});
