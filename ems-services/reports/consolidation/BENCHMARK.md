# Consolidated runtime benchmark — 2026-09-30

Four applications used **1.77 GiB idle** and **1.83 GiB mean at 50 requests/s**, excluding PostgreSQL. Sampled application CPU means summed to **0.74 cores** during load50. Docker cache-adjusted memory is not heap or RSS. CPU percentages are relative to one core.

| Application       | Idle MiB | Load50 mean MiB | Load50 max MiB | Load50 CPU mean % |
| ----------------- | -------: | --------------: | -------------: | ----------------: |
| auth-service      |    463.6 |           475.3 |          486.8 |              6.09 |
| people-service    |    544.9 |           580.1 |          581.5 |             19.59 |
| workforce-service |    504.7 |           517.9 |          525.6 |             24.08 |
| gateway-service   |    294.8 |           304.8 |          309.0 |             24.67 |

| Phase  | Requests | HTTP 200 | Completed requests/s | p95 ms | p99 ms | Arrival-to-completion p95 ms | Payroll p95 ms |
| ------ | -------: | -------: | -------------------: | -----: | -----: | ---------------------------: | -------------: |
| warmup |      300 |      300 |                10.03 |   73.2 |  195.9 |                         76.1 |          137.6 |
| load20 |     1200 |     1200 |                19.98 |   55.2 |  194.2 |                         60.0 |          140.2 |
| load50 |     3000 |     3000 |                50.01 |  144.8 | 1156.2 |                        218.8 |          243.2 |

## Comparison and limits

The prior eight-application report measured 3.06 GiB idle and 3.28 GiB load50. Current idle memory is approximately 42% lower. Application database pools now total 30 connections (10 each for Auth/People/Workforce), versus 70 previously. Current load50 p95 is 144.8 ms and payroll p95 is 243.2 ms; the earlier run reported 2,433 ms and 5,238 ms respectively. These are observations from separate desktop runs, not an isolated causal experiment.

The new run uses the same nine equally weighted GET routes, a 32-worker open-loop client, 30 seconds of warm-up at 10 requests/s, 60 seconds idle, 60 seconds each at 20 and 50 requests/s, and 30 seconds recovery. Fifty benchmark employees have 700 approved eight-hour attendance entries for the same anchored fortnight. The time-entry route uses the first benchmark employee rather than ID 1. Browser/demo fixtures are also present: total 60 employees, 22 shifts, 701 attendance entries, eight departments, six locations and one PTO request. The prior benchmark had 50 employees, 20 shifts and 700 entries. Results are not strictly identical datasets.

No Maven, browser tests, image builds or backup restores ran during the final measurement phases. Containers ran without CPU/memory limits on the local Docker Desktop VM. Differences in JVM warm-up, database state, host activity, image/runtime revisions and run order remain uncontrolled. This does not establish maximum capacity, cloud latency or Fargate sizing. No new AWS pricing or deployment claim is made.

Payroll now makes one local grouped attendance query across authorized employees instead of one attendance RPC per employee. This removes the former RPC amplification; the workload does not isolate that optimization from consolidation and other environmental changes.

Raw evidence: workload-summary.json, resource-summary.json/csv, resources.jsonl, \*-requests.json, benchmark-dataset.json and db-connections.txt. The earlier report remains in ../benchmark-2026-09-30/REPORT.md.
