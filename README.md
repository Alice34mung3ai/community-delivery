# Community-Delivery — Incident Runbook (compact)

Last updated: 2026-09-05

Primary contacts: on-call SRE / dev team / PagerDuty (replace with your values)

---

## 1) Incident summary & severity guide (quick)

- Sev-1 (P1) — System-wide: payment gateway failures causing capture/authorization failures; job backlog causing system stops; auth secret missing (users logged out).
- Sev-2 (P2) — Partial: driver assignment failure for >10% of orders; WebSocket outage for major region; repeated job errors in a queue.
- Sev-3 (P3) — Minor: single-user failures, occasional timeouts, or non-critical background jobs.

## 2) Quick triage checklist (first 5 minutes)

- Check monitoring dashboards (errors, queue length, payment failure rate).
- Find the blast radius: is it all customers, one region, one service?
- Check recent deploys for the last 30 minutes.
- Escalate to on-call and switch to incident channel (e.g., #incidents).
- If Sev-1, add pager rotations, start recording timeline.

## 3) Useful quick checks (commands & queries)

Note: replace placeholders (NAMESPACE, APP, REDIS_HOST, PGHOST) with your environment values.

Kubernetes / service

- Check pods and recent restarts:
  kubectl -n NAMESPACE get pods -l app=community-delivery -o wide
  kubectl -n NAMESPACE describe pod <pod-name>
  kubectl -n NAMESPACE logs <pod-name> --since=10m

- Rollback to previous image (if deploy caused regression):
  kubectl -n NAMESPACE set image deployment/community-delivery community-delivery=<previous-image-tag>

Redis / BullMQ

- Inspect queue lengths (if using BullMQ keys prefix "bull:queue:*"):
  redis-cli -h REDIS_HOST --scan --pattern "bull:*"
  redis-cli -h REDIS_HOST LLEN bull:queue:wait        # approximate queued jobs
  redis-cli -h REDIS_HOST LLEN bull:queue:active

- If you have Bull board / UI, open it to inspect failed jobs and retry.

Postgres (Prisma)

- Find orders stuck in high-risk states:
  SELECT id, status, driver_id, created_at, updated_at
  FROM orders
  WHERE status IN ('created','pending_assignment','assigned')
  ORDER BY created_at DESC LIMIT 50;

- Find payments with failures:
  SELECT id, order_id, status, last_error, attempt_count, updated_at
  FROM payments
  WHERE status IN ('failed','authorization_failed') ORDER BY updated_at DESC LIMIT 50;

Application logs (structured)

- Look for repeated error patterns (payment provider errors, DB constraint, JWT verify errors).
  - grep/filtered logs for "payment", "stripe", "authorize", "capture"
  - grep for "job failed" or for queue handler errors

## 4) Incident playbooks (specifics)

### A. Payment gateway failures (high-impact)

Symptoms
- Large spike in payment authorization/capture failures or webhooks not verifiable.
Immediate checks
- Check payment provider status page (Stripe, etc.).
- Check webhook delivery rate and signatures — have webhooks been rejected?
- Inspect payment worker logs and payment retry/DLQ counts.
Remediation steps
- If provider down: mark payments as degraded in UI; notify ops and customers; pause capture jobs to avoid repeated failures.
- If webhook signature change or secret mismatch: rotate or correct webhook signing secret in server config, then restart webhook handler (or redeploy).
- To pause capture attempts:
  - Pause queue or stop payment worker process: scale down payment worker deployment (kubectl scale deployment/payment-worker --replicas=0)
  - Alternatively, flip a feature flag to stop captures and continue delivery flows while notifying customers.
Recovery
- Once provider stable, restart worker(s) and manually reconcile unprocessed authorizations by running capture/retry jobs; verify idempotency keys before reattempt.
Post-incident
- Run reconciliation job comparing payments table vs provider transactions, reconcile mismatches.

### B. Worker job backlog / DLQ (assign-driver, payments, notifications)

Symptoms
- High queue length, many failed jobs in DLQ, orders stuck in pending states.
Immediate checks
- Redis queue length (LLEN) and worker logs.
- Worker pods for crashloop or high CPU/memory.
Remediation steps
- Restart or horizontally scale workers:
  kubectl -n NAMESPACE rollout restart deployment/worker-deployment
  kubectl -n NAMESPACE scale deployment/worker-deployment --replicas=<n>
- If jobs are failing due to code bug, pause queue intake:
  - Temporarily scale down API instances or set the system to a read-only mode for new order creation (if safe).
- Requeue or retry safe jobs:
  - Use Bull Board or your job admin to retry failed jobs in small batches.
  - For mass requeue: export failed job ids, inspect, and re-add with a controlled script that ensures idempotency.
Recovery
- After bug fix and worker rollout, unpause queues and monitor for error regression.

### C. Driver-assignment failures (matching not returning drivers)

Symptoms
- Many orders in pending_assignment for an extended time; no drivers get notified.
Immediate checks
- Query orders stuck in pending_assignment state (SQL above).
- Inspect assign-driver worker logs for geo-query errors or external service failures.
- Check upstream services (geo DB, Redis caching) and indexes (Postgres PostGIS).
Remediation steps
- If match logic or DB index broke: rollback recent deploy; if index is missing, re-create geospatial index (careful with runtime impact).
- If worker crashed: restart worker pods.
- As a short-term mitigation, set fallback: notify nearby providers manually or trigger admin-assisted assignment (UI button).
Recovery
- Fix matching logic, run canary, then resume automated assignment.

### D. Auth/session outage (JWT_SECRET missing or cookie issues)

Symptoms
- Many 401s; users repeatedly logged out; /api/auth/me failing for many requests.
Immediate checks
- Inspect env config for JWT_SECRET or cookie configuration mismatch.
- Check auth middleware logs for "jwt verify" errors.
Remediation steps
- If JWT secret was rotated or missing, restore correct secret (from secrets manager) and redeploy. If secret changed, issue forced logout/session invalidation — communicate to users.
- If cookie SameSite or domain changed: revert config to previous working values.
Recovery
- After secret restored, clear backlog of auth errors and verify sessions work again. Consider implementing refresh-token flow to reduce impact.

### E. WebSocket / realtime outage

Symptoms
- Clients not receiving events; manual polling shows state changes.
Immediate checks
- Check websocket/realtime pods; check Redis pub/sub connectivity.
- Inspect Socket.IO or WS server logs; verify connections accepted and messages published.
Remediation steps
- Restart realtime pods; ensure Redis adapter is reachable and correct REDIS_URL is set.
- If single node failed due to resource limits, scale horizontally.
- Short-term: fallback to push notifications or polling endpoints for critical updates.
Recovery
- Once recovered, monitor event delivery rate and message ordering; reconcile missed events by re-emitting on reconnect (server should publish recent state snapshot on client connect).

## 5) Safe manual recovery patterns & commands

- Re-run small batches of jobs, not whole queues.
- Use DB transactions for manual fixes:
  BEGIN;
  UPDATE orders SET status='assigned', driver_id=<driver> WHERE id=<order-id> AND status IN ('created','pending_assignment');
  INSERT INTO audit_log(...);
  COMMIT;
- Re-emit events to clients: publish to Redis pub/sub channel "order.{id}" with current order state so reconnecting clients see the latest.
- Avoid mass deletions; prefer marking and reprocessing.

## 6) Post-incident actions (within 24–72h)

- Root-cause analysis: timeline + contributing factors.
- Hotfix or code/infra changes + thorough testing.
- Run reconciliation: payments vs external provider; orders vs job results.
- Update runbook with new commands/notes discovered during incident.
- If user-facing impact: prepare customer communication and credits/refunds.

## 7) Emergency knobs (keep minimal & documented)

- Pause capture/payment worker (kubectl scale)
- Scale worker replicas down/up
- Turn on read-only mode for order creation (feature flag)
- Redirect traffic to previous image (kubectl set image)
- Disable problematic background job handlers via feature flag

## 8) Contacts & escalation

- Primary on-call: (replace)
- Secondary owner: (replace)
- PagerDuty playbook link: (replace)
- Slack incident channel: #incidents

---

## Compact annotated Mermaid diagram

Paste the following block into any Markdown that renders Mermaid (GitHub README with mermaid support or mermaid-cli) to show a compact, printable order-lifecycle diagram.

```mermaid
flowchart LR
  %% compact annotated order lifecycle
  T[Tenant] -->|POST /api/orders| API[API Server]
  API --> DB[(Postgres orders)]
  API --> Q[Queue (BullMQ/Redis)]
  Q --> Matcher[assign-driver worker]
  Matcher -->|conditional update| DB
  Matcher --> Pub[Pub/Sub (Redis)]
  Pub --> WS[WebSocket server]
  WS --> D[Driver]
  D -->|POST /accept| API
  API --> DB
  D -->|pickup| API --> DB --> Pub
  D -->|complete| API --> DB
  API -->|enqueue| Q --> PaymentWorker[payment worker]
  PaymentWorker --> Stripe[Payment gateway]
  Stripe -->|webhook| API
  %% annotations
  classDef notes fill:#f8f9fa,stroke:#ccc,font-size:12px;
  subgraph Notes [Runbook Notes]
    N1["Idempotency: require Idempotency-Key for order creation"]
    N2["Jobs: retry w/ exponential backoff; DLQ for manual review"]
    N3["Auth: cookie httpOnly + JWT; verify JWT_SECRET"]
  end
  API --- N1
  Q --- N2
  API --- N3
```

---

If you want this README populated with real environment values (namespaces, hosts, previous image tags) or exported as a PDF, tell me which values to fill and I will update the file.
