# 🚨 Contract Test Failure Runbook

**SCRUM 301: POS-S4-013-T4 — Document contract test failure runbook**

This runbook provides step-by-step guidance for investigating and resolving
contract test failures in the POS system. Contract tests exist between the
**POS Frontend** (consumer) and the **Transaction Service** / **Inventory Service** (providers).

---

## Table of Contents

1. [Overview: How Contract Tests Work](#overview-how-contract-tests-work)
2. [Consumer Test Failures](#consumer-test-failures)
3. [Provider Verification Failures](#provider-verification-failures)
4. [Pact Broker Issues](#pact-broker-issues)
5. [CI Pipeline Failures](#ci-pipeline-failures)
6. [Common Scenarios](#common-scenarios)
7. [Verification & QA Checklist](#verification--qa-checklist)
8. [Escalation Path](#escalation-path)

---

## Overview: How Contract Tests Work

```
Frontend (Consumer)              Pact Broker             Backend (Provider)
┌─────────────────┐    publish    ┌────────────┐   verify   ┌──────────────────┐
│ Consumer Tests  │──────────────>│ Pact JSON  │<───────────│ Provider Tests   │
│ (Jest + Pact)   │              │ Contracts  │            │ (Jest + Verifier)│
└─────────────────┘              └────────────┘            └──────────────────┘
        │                              │                           │
   Generates pact                 Stores &                   Replays pact
   JSON files                    versions                   interactions
```

**Key Contracts:**
| Endpoint | Consumer | Provider |
|----------|----------|----------|
| `POST /transactions` | POSFrontend | TransactionService |
| `GET /transactions/:id/receipt` | POSFrontend | TransactionService |
| `GET /transactions` | POSFrontend | TransactionService |
| `GET /products` | POSFrontend | InventoryService |
| `PATCH /products/:id/decrement` | POSFrontend | InventoryService |

---

## Consumer Test Failures

### Symptoms
- `npm run test:pact:consumer` fails
- Error messages like: "Pact verification failed" or "Mock server received unexpected request"

### Investigation Steps

1. **Read the error message** — Pact errors clearly state which interaction failed and why.

2. **Check the test file:**
   ```bash
   # Transaction service consumer tests
   tests/pact/consumer/transactionService.consumer.pact.test.js
   
   # Inventory service consumer tests
   tests/pact/consumer/inventoryService.consumer.pact.test.js
   ```

3. **Common causes:**
   - Frontend API client (`src/services/salesApi.ts` or `src/services/productApi.ts`) was changed but the Pact test was not updated
   - Request body schema doesn't match what the consumer test defines
   - Response body expectations are wrong

4. **Fix:** Update the consumer test to match the actual API client behavior, then re-run:
   ```bash
   npm run test:pact:consumer
   ```

5. **Verify pact files were regenerated:**
   ```bash
   dir tests\pact\pacts\
   # Should show .json files with recent timestamps
   ```

---

## Provider Verification Failures

### Symptoms
- `npm run test:pact:provider` fails in transaction-service or inventory-service
- Error: "Verification failed" with a diff showing expected vs actual response

### Investigation Steps

1. **Ensure the service is running:**
   ```bash
   # Start all services
   docker-compose up --build -d

   # Or start individually
   docker-compose up transaction-service
   docker-compose up inventory-service
   ```

2. **Verify health:**
   ```bash
   curl http://localhost:4007/health
   curl http://localhost:4002/health
   ```

3. **Run provider verification with verbose logging:**
   ```bash
   cd services/transaction-service
   PROVIDER_BASE_URL=http://localhost:4007 npm run test:pact:provider

   cd services/inventory-service
   PROVIDER_BASE_URL=http://localhost:4002 npm run test:pact:provider
   ```

4. **Common causes:**
   - Provider endpoint was changed (different response shape, new required fields)
   - Provider state handler doesn't set up the correct test data
   - Database not seeded with required test records
   - Service crashed or isn't responding

5. **Fix:** Either update the provider to match the contract, or if the change is intentional, update the consumer test first, then re-generate pacts.

### The Golden Rule
> **Consumer changes first, then provider.**
> Never change the provider's API without first updating the consumer test.

---

## Pact Broker Issues

### Symptoms
- `npm run test:pact:publish` fails
- Pact Broker UI at `http://localhost:9292` is unreachable

### Investigation Steps

1. **Verify Pact Broker is running:**
   ```bash
   docker-compose ps pact-broker pact-postgres
   ```

2. **Start Pact Broker if not running:**
   ```bash
   docker-compose up -d pact-broker pact-postgres
   ```

3. **Check Pact Broker logs:**
   ```bash
   docker-compose logs pact-broker
   docker-compose logs pact-postgres
   ```

4. **Test broker connectivity:**
   ```bash
   curl http://localhost:9292/diagnostic/status/heartbeat
   ```

5. **Common causes:**
   - PostgreSQL not ready yet (wait for health check)
   - Port 9292 already in use
   - Database credentials mismatch

6. **Nuclear option — Reset Pact Broker:**
   ```bash
   docker-compose down -v  # WARNING: deletes all data
   docker-compose up -d pact-broker pact-postgres
   ```

---

## CI Pipeline Failures

### Symptoms
- GitHub Actions workflow "Pact Contract Tests" fails
- `can-i-deploy` check prevents merge

### Investigation Steps

1. **Check the failing job** in GitHub Actions:
   - `consumer-tests` — Consumer pact test failed
   - `publish-pacts` — Could not publish to broker
   - `provider-verification` — Provider doesn't satisfy the contract
   - `e2e-tests` — Existing tests broke

2. **Download the pact artifacts** from the failed run to inspect locally.

3. **Reproduce locally:**
   ```bash
   # Run consumer tests
   npm run test:pact:consumer

   # Start services
   docker-compose up --build -d

   # Run provider verification
   cd services/transaction-service && npm run test:pact:provider
   cd services/inventory-service && npm run test:pact:provider
   ```

4. **If `can-i-deploy` fails:**
   - A breaking API change was detected
   - You must update both consumer tests AND provider implementation before merging
   - Never force-merge when contract tests fail

---

## Common Scenarios

### Scenario 1: "I added a new field to the API response"
1. Update the consumer Pact test to expect the new field
2. Run `npm run test:pact:consumer` — generate new pact files
3. Run provider verification — should pass since you added a field (non-breaking)
4. Commit both changes together

### Scenario 2: "I removed a field from the API response"
⚠️ **This is a BREAKING CHANGE!**
1. First, update the frontend to not depend on the removed field
2. Update the consumer Pact test to remove the expectation
3. Run `npm run test:pact:consumer`
4. Then remove the field from the provider
5. Run provider verification
6. Commit all changes together

### Scenario 3: "I changed the request body schema"
1. Update `src/services/salesApi.ts` or `src/services/productApi.ts`
2. Update the consumer Pact test to match the new request body
3. Run `npm run test:pact:consumer`
4. Update the provider's Zod validation schema if needed
5. Run provider verification
6. Commit all changes together

### Scenario 4: "Provider tests pass locally but fail in CI"
1. Check if the CI environment has the required Supabase env vars set
2. Verify the service starts correctly in CI (check logs)
3. Ensure pact files were properly downloaded from artifacts
4. Check for port conflicts in CI

---

## Verification & QA Checklist

After fixing a contract test failure, verify the full system:

```bash
# 1. Run consumer tests
npm run test:pact:consumer

# 2. Start all services
docker-compose up --build

# 3. Run provider verification
cd services/transaction-service && npm run test:pact:provider
cd services/inventory-service && npm run test:pact:provider

# 4. Run existing tests to ensure nothing broke
npm run test:smoke
npm run test:e2e

# 5. QA the system manually  
#    - ✅ Inventory stock updates when a sale is completed
#    - ✅ Past transactions show in history page
#    - ✅ Transaction history tab works
#    - ✅ Dashboard data updates correctly
#    - ✅ Shift clock in/out works
#    - ✅ Request transfers work
```

### How to Verify Contract Tests in the System (for Screenshots/Documentation)

1. **Terminal Screenshot**: Run `npm run test:pact:consumer` and capture the passing test output
2. **File System Screenshot**: Show the generated pact JSON files in `tests/pact/pacts/`
3. **Pact Broker UI Screenshot**: Open `http://localhost:9292` in browser and capture the contract matrix
4. **Docker Logs Screenshot**: Run `docker-compose logs pact-broker` and capture healthy broker output
5. **Provider Verification Screenshot**: Run provider tests and capture the verification output
6. **CI Pipeline Screenshot**: Show the GitHub Actions workflow passing (or the workflow YAML file)

---

## Escalation Path

| Level | Who | When |
|-------|-----|------|
| L1 | Developer who made the change | First, try to fix the failing test |
| L2 | Frontend/Backend team lead | If the fix requires coordinated changes across teams |
| L3 | Scrum Master | If the failure is blocking the sprint and requires prioritization |
| L4 | DevOps / Infrastructure | If the Pact Broker or CI infrastructure is down |

---

## Quick Reference Commands

```bash
# Run consumer tests (generates pact files)
npm run test:pact:consumer

# Run provider verification
cd services/transaction-service && npm run test:pact:provider
cd services/inventory-service && npm run test:pact:provider

# Publish pacts to broker
npm run test:pact:publish

# Start Pact Broker
docker-compose up -d pact-broker pact-postgres

# View Pact Broker
# Open: http://localhost:9292

# View broker health
curl http://localhost:9292/diagnostic/status/heartbeat

# View all pacts
curl http://localhost:9292/pacts

# Rebuild everything
docker-compose up --build

# Full system QA after changes
npm run test:smoke
npm run test:e2e
```
