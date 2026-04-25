/**
 * PACT CONSUMER TESTS — Inventory Service (Product Service)
 * ─────────────────────────────────────────────────────────────────────────────
 * SCRUM 298: POS-S4-013-T1 — Set up Pact consumer tests in frontend repo
 *
 * These tests define the contract between the POS Frontend (consumer) and
 * the Inventory/Product Service (provider) on port 4002.
 *
 * Contracts covered:
 *   1. GET /products — Fetch all products with stock and transfer data
 *      (Maps to acceptance criteria: GET /products/:sku/stock)
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
  integer,
  decimal,
  string,
} = MatchersV3;

// ── Pact Provider Setup ──────────────────────────────────────────────────────
const provider = new PactV3({
  consumer: 'POSFrontend',
  provider: 'InventoryService',
  dir: path.resolve(__dirname, '..', 'pacts'), // Output dir for pact JSON files
  logLevel: 'warn',
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('📝 Pact Consumer Tests — Inventory Service', () => {

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Contract 1: GET /products — List products with stock data
  // (Maps to acceptance criteria: GET /products/:sku/stock)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('GET /products — List Products with Stock', () => {
    it('should return 200 with products array including stock fields', async () => {
      provider
        .given('products exist in the inventory')
        .uponReceiving('a request to get all products with stock data')
        .withRequest({
          method: 'GET',
          path: '/products',
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            products: eachLike({
              id: like(1),
              name: like('Sample Product'),
              price: like(99.99),
              stock: like(50),
              category: like('Beverages'),
              low_stock_threshold: like(10),
              reserved_transfer_qty: like(0),
              available_stock: like(50),
            }),
            transfers: like([]),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/products`);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty('products');
        expect(body).toHaveProperty('transfers');
        expect(Array.isArray(body.products)).toBe(true);
        expect(body.products.length).toBeGreaterThan(0);

        const product = body.products[0];
        // Verify stock-related fields are present in the response
        expect(product).toHaveProperty('id');
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('price');
        expect(product).toHaveProperty('stock');
        expect(product).toHaveProperty('category');
        expect(product).toHaveProperty('available_stock');
        expect(product).toHaveProperty('reserved_transfer_qty');
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Contract 2: PATCH /products/:id/decrement — Decrement stock
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('PATCH /products/:id/decrement — Decrement Stock', () => {
    it('should return 200 with updated stock on valid decrement', async () => {
      provider
        .given('a product with stock exists', { productId: '1' })
        .uponReceiving('a request to decrement product stock')
        .withRequest({
          method: 'PATCH',
          path: '/products/1/decrement',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            quantity: 2,
          },
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            success: true,
            newStock: like(48),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/products/1/decrement`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: 2 }),
          }
        );

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body).toHaveProperty('newStock');
        expect(typeof body.newStock).toBe('number');
      });
    });

    it('should return 400 for invalid quantity', async () => {
      provider
        .given('a product with stock exists', { productId: '1' })
        .uponReceiving('a request to decrement stock with invalid quantity')
        .withRequest({
          method: 'PATCH',
          path: '/products/1/decrement',
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            quantity: 0,
          },
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
        const response = await fetch(
          `${mockServer.url}/products/1/decrement`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: 0 }),
          }
        );

        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.error).toBe('Validation failed');
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Contract 3: Health check (validates service is alive)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  describe('GET /health — Service Health Check', () => {
    it('should return 200 with service status', async () => {
      provider
        .given('the inventory service is available')
        .uponReceiving('a health check request')
        .withRequest({
          method: 'GET',
          path: '/health',
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: {
            service: 'product-service',
            status: 'ok',
            port: like(4002),
          },
        });

      await provider.executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/health`);

        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.service).toBe('product-service');
        expect(body.status).toBe('ok');
      });
    });
  });
});
