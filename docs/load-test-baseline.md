# k6 Load Testing — Baseline Results & Documentation
## SCRUM 306: POS-S4-014-T4 — Run baseline test and document results

### Overview
This document records the baseline load test results for the POS system's hot endpoints,
establishing performance benchmarks that all future builds must meet.

---

### Test Configuration
| Parameter | Value |
|-----------|-------|
| **Tool** | k6 v0.50.0 |
| **Virtual Users** | 30 (simulating concurrent cashiers) |
| **Duration** | 30s ramp-up → 2min steady → 10s ramp-down |
| **Target Endpoints** | POST /transactions, GET /products/:sku/stock, GET /transactions/:id/receipt |

### Threshold Requirements
| Metric | Threshold | Description |
|--------|-----------|-------------|
| Transaction p95 | < 500ms | 95th percentile response time for creating transactions |
| Stock Check p95 | < 150ms | 95th percentile response time for stock queries |
| Receipt Fetch p95 | < 500ms | 95th percentile response time for receipt lookups |
| Error Rate | < 1% | Overall HTTP error rate across all endpoints |

---

### How to Run Locally

**Prerequisites:**
1. Docker Desktop running
2. k6 installed (see below)
3. All services running via `docker-compose up --build`

**Install k6 on Windows:**
```bash
# Using Chocolatey
choco install k6

# Or download directly from https://k6.io/docs/get-started/installation/
```

**Run the load test (without Grafana):**
```bash
npm run test:load:simple
```

**Run the load test (with Grafana dashboard):**
```bash
# 1. Start all services including InfluxDB and Grafana
docker-compose up --build

# 2. In a separate terminal, run the load test
npm run test:load

# 3. Open Grafana to view real-time results
#    URL: http://localhost:3001
#    Login: admin / admin
#    Dashboard: "POS System — k6 Load Test Dashboard"
```

---

### Baseline Results
> **To be filled after running the first baseline test.**
> 
> Run `npm run test:load:simple` and paste the terminal summary output below.

```
═══════════════════════════════════════════════════════════════
  📊 POS Load Test Summary
═══════════════════════════════════════════════════════════════
  Max VUs:            [PENDING]
  Total Iterations:   [PENDING]
  Transaction p95:    [PENDING]ms (threshold: <500ms)
  Stock Check p95:    [PENDING]ms (threshold: <150ms)
  Receipt p95:        [PENDING]ms (threshold: <500ms)
  Error Rate:         [PENDING]% (threshold: <1%)
  HTTP Failures:      [PENDING]%
═══════════════════════════════════════════════════════════════
```

---

### Staging Environment Specs (SCRUM 307)
| Resource | Specification |
|----------|---------------|
| **Container Runtime** | Docker Desktop (Windows) |
| **CPU** | Matches production allocation via Docker resource limits |
| **Memory** | Matches production allocation via Docker resource limits |
| **Database** | Supabase (remote, shared instance) |
| **Message Queue** | RabbitMQ 3.x (Docker container) |

> **Note:** The staging environment is configured through `docker-compose.yml` to mirror
> production specifications. Resource limits can be adjusted per-service using Docker's
> `deploy.resources` configuration if needed.

---

### Grafana Dashboard Access
- **URL:** http://localhost:3001
- **Credentials:** admin / admin
- **Dashboard:** "POS System — k6 Load Test Dashboard"
- **Panels:**
  - Active Virtual Users (real-time)
  - Request Rate (req/s)
  - Transaction Response Time (p95 with 500ms threshold line)
  - Stock Check Response Time (p95 with 150ms threshold line)
  - Receipt Fetch Response Time (p95 with 500ms threshold line)
  - Error Rate gauge (green/yellow/red)
  - HTTP Duration by endpoint
  - Thresholds Summary table
