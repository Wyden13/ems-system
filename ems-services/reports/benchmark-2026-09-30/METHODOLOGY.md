# Benchmark method and reproduction

Run date: 2026-09-30 UTC (2026-09-29 in Edmonton). Source: commit `063d4430ac65dbf6862f7fc21eaf3c4930d61bc0` plus the user's pre-existing working-tree changes. All eight service images were rebuilt from that working tree; no application code was edited for this assessment. Maven packaging skipped tests. HTTP success in this workload does not certify all business workflows.

Environment: Docker Desktop 4.47.0, Engine 28.4.0, Linux ARM64 guest, 10 virtual CPUs, 8,218,034,176 bytes RAM (7.654 GiB), Temurin Java 17.0.20.1 in application images, PostgreSQL 18. Host Java 21 was not used to run the services. Desktop hardware, filesystem, virtualization, CPU sharing, and local networking differ from Fargate/RDS.

The existing integration stack had four crash-looping application containers. They were temporarily stopped during sampling and restored afterwards. A separate `ems-benchmark` Compose project, network, volume, and ports 28080–28087 isolated synthetic data. Initially, Compose's resolved configuration retained explicit integration network/volume names; the newly created PostgreSQL container was stopped and recreated with benchmark-only names **before** provisioning or benchmark fixture writes. Existing volumes were not deleted. Tests used only the new benchmark databases.

## Workload

- Bootstrap one synthetic admin, then use real login/CSRF to obtain a bearer token. Tokens and API records are not saved in the metrics files.
- Seed through APIs: 50 employees, one department, one location, one shift category, 20 shifts, one PTO type. The admin has no employee link.
- Seed 700 synthetic approved attendance records directly into the isolated database: 14 eight-hour entries for each of the 50 employees. These are load fixtures, including synthetic future records, not a demonstration of the clock-in/approval workflow. PTO request and balance tables remain empty.
- Equal round-robin GET mix across nine paths: employees, departments, locations, shifts, PTO types, PTO requests, one employee's attendance, all-employee payroll estimates, and auth CSRF.
- All traffic travels through the gateway. The payroll path exercises employee and attendance gRPC calls over the configured mutual TLS connections. Each estimate makes 50 sequential attendance calls; about one ninth of the offered traffic is payroll. This is a deliberately report-heavy mix, not a claim about real user behavior.
- Unrestricted: 30-second warm-up at 10 requests/s; 60 seconds idle; 60 seconds offering 20 requests/s; 60 seconds offering 50 requests/s; 30-second recovery. Work completion can extend beyond the offer interval.
- Constrained: recreate each application with 0.5 CPU and 1 GiB; `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=60.0 -XX:InitialRAMPercentage=15.0`. PostgreSQL remains unrestricted. Then 30-second warm-up, 30 seconds idle, and 60 seconds offering 50 requests/s.
- A separate constrained authentication probe offers two login flows/s for 30 seconds (60 logins, each preceded by CSRF). It exercises password verification and session persistence; it is not a brute-force or maximum-throughput test.

The Python standard-library client has at most 32 concurrent workers for mixed reads, a new HTTP connection per request, and a 30-second socket timeout. There is no browser rendering or frontend load in these numbers. Results include non-200 responses and client exceptions (status 0). Preflight must succeed before the initial workload runs. An initial attendance preflight returned 404 because the admin had no employee link; adding the explicit employeeId fixture corrected the harness without changing application behavior.

Request latency starts when a worker begins the HTTP request. **The baseline latency does not include time queued in the client's executor**; under backlog, it understates delay from scheduled arrival. Achieved throughput includes drain time. The constrained run also captures scheduled-arrival-to-completion p95 (`end_to_end_p95_ms`) to reveal queueing. One run per scenario is insufficient for confident capacity or comparative efficiency claims; warm-up, JIT, cache, GC, host contention, and run order may explain differences. A faster later phase does not establish that higher load improves performance.

## Resource measurements

`docker stats --no-stream` samples all benchmark containers, followed by a one-second pause; effective sample spacing is several seconds, not exactly one second. Raw rows include timestamps. CPU 100% means one logical CPU core, not 100% of the 10-core VM. A 0.5-CPU cap is approximately 50% on this scale. Means are arithmetic means of sampled observations, not continuously integrated CPU totals; maxima can miss short spikes.

Memory is Docker's Linux working-set-style usage (cache-adjusted), **not Java heap usage**, native-memory accounting, or precise billable ECS reservation. PIDs include threads. NetIO/BlockIO values are cumulative container counters; retained raw values are not bandwidth or IOPS benchmarks. Images share layers, so summing image sizes does not equal unique disk usage. Startup resource sampling covers only part of startup and includes temporary bootstrap overlap; use application logs for startup durations and do not treat the startup samples as clean isolated peaks.

No production dataset, multi-hour soak, employee-role mixed workload, PTO approval contention, clock-in burst, database failover, cross-AZ network, or Fargate task was tested. The notification module is not in the running reactor/Compose stack and has no runtime measurements.

## Reproduction

The files `compose.json` and `compose-capped.json` contain only deterministic integration credentials and local certificate paths; they are **test configurations**. Do not deploy them to AWS. Their bind paths are absolute to this checkout. Build application images with `docker compose build` from the services root first.

To repeat on a **fresh benchmark volume**, start PostgreSQL with the benchmark Compose file, run `/opt/ems/init-databases.sh` inside it, start all services, and bootstrap the test administrator as shown below. The seed scripts are intended for a fresh database and are not idempotent; do not rerun them on the retained populated volume. Never reset or delete an existing volume without checking that its data is disposable.

```sh
# Run from ems-services. Existing populated benchmark volumes need no reseeding.
docker compose -p ems-benchmark -f reports/benchmark-2026-09-30/compose.json up -d --wait postgres
docker compose -p ems-benchmark -f reports/benchmark-2026-09-30/compose.json exec -T postgres bash /opt/ems/init-databases.sh
docker compose -p ems-benchmark -f reports/benchmark-2026-09-30/compose.json up -d --wait
# Fresh database only:
docker compose -p ems-benchmark -f reports/benchmark-2026-09-30/compose.json run --rm --no-deps -e BOOTSTRAP_ADMIN_EMAIL=bench@integration.test -e BOOTSTRAP_ADMIN_PASSWORD=BenchmarkOnly123! auth-service --spring.profiles.active=bootstrap --server.port=0 --spring.grpc.server.enabled=false
python3 reports/benchmark-2026-09-30/benchmark.py --seed
docker compose -p ems-benchmark -f reports/benchmark-2026-09-30/compose.json exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d ems_attendance_db < reports/benchmark-2026-09-30/seed-attendance.sql
# Run after fixtures exist; archive old result files before repeating.
python3 reports/benchmark-2026-09-30/benchmark.py
docker compose -p ems-benchmark -f reports/benchmark-2026-09-30/compose-capped.json up -d --wait --wait-timeout 360
python3 reports/benchmark-2026-09-30/run-capped.py
python3 reports/benchmark-2026-09-30/auth-benchmark.py
python3 reports/benchmark-2026-09-30/summarize.py
```

`resources.jsonl` is appended; request/summary files are overwritten on rerun. Archive results first, then remove only the old **metrics file** from the next run's output directory to avoid mixing runs. No production secret is required by the benchmark scripts.
