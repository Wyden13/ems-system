# Fargate deployment assessment

Pricing reference: checked 2026-09-30, Linux on-demand, US East (N. Virginia), USD, 730 hours/month, no discounts. This is an explicit comparison region, not a recommendation to move Canadian employee data to the US. Reprice the selected Canadian region if residency or latency requires it. No AWS resources were deployed.

## What changes in AWS

Each separate ECS service reserves task CPU and memory, whether busy or idle. A Linux task supports 0.25 vCPU with 0.5/1/2 GiB; 0.5 vCPU with 1–4 GiB; and 1 vCPU with 2–8 GiB. These are allocation choices, not measured consumption. [AWS task requirements](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html)

The existing Compose file is a local development setup, not a ready ECS deployment:

- Push versioned application images to ECR, pin image digests, and use a matching ARM64 or X86_64 task architecture. The measured images are Linux ARM64; do not assume the same measured performance on x86 or Graviton hardware.
- Run PostgreSQL as a managed database, typically RDS PostgreSQL, rather than using the current local named volume in an application task. Start with one instance containing separate logical databases/users if retaining current service boundaries; seven database names do not require seven RDS instances. Size memory, storage, IOPS, backups, and connection capacity separately. [RDS PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- Replace Compose service names with Cloud Map DNS names, set each `*_URL` and `*_GRPC_TARGET`, and allow HTTP 8080 and internal gRPC 9090 only between appropriate security groups. Tasks use `awsvpc` networking. DNS and existing long-lived gRPC channels require failure/reconnect testing. [ECS discovery](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html)
- The developer machine's `.local/certs` paths do not exist in Fargate. Supply secrets and certificate files through a controlled runtime mechanism, with IAM access and rotation. Reissue certificates with SANs matching the chosen service DNS names and retain the identities expected by `ServiceIdentityInterceptor`; changing only DNS can break mutual TLS. ECS supports task volumes, but the existing host-file paths are not portable. [ECS volumes](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/bind-mounts.html)
- Place an HTTPS ALB in front of the gateway, configure real frontend origins, and enable secure cookies. Retain application authorization and CSRF behavior. Local configuration deliberately uses test credentials and insecure cookies and must never be promoted as-is.
- Use readiness checks, an appropriate startup grace period, graceful shutdown, and deployment rollback. Compose `depends_on` ordering is not a cross-service startup orchestrator in ECS. Expect dependency retries and partial failures during rolling changes. Readiness in this application checks database availability, but does not prove that every downstream RPC is usable.
- Reserve memory for the whole JVM: heap, metaspace, JIT code, direct buffers, thread stacks, and process overhead. A heap equal to the task's memory budget will leave no room for these. Start by bounding heap to a portion of memory, then tune using GC and native-memory measurements. CPU quotas can materially slow startup and report processing.
- For availability, deploy at least two application tasks per service across availability zones and choose appropriate database redundancy. One task per service is a cost reference with single-instance failure exposure, not an HA design. Account for extra tasks during rolling deployment.
- Set total pool capacity against the database connection budget. This run observed 10 connections per database-backed application: 70 with one replica, approximately 140 with two if unchanged, and potentially 280 during full duplication in a rollout, plus operations/migrations. Those latter numbers are arithmetic projections, not measured multi-replica tests.

Use Cloud Map without proxy sidecars for the base cost model. Service Connect is an alternative, but AWS recommends adding 256 CPU units and at least 64 MiB per task for its proxy. That overhead can force a larger task tier; it is not included below. [Service Connect sizing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect-concepts-deploy.html)

## Pricing model

The AWS pricing examples imply these hourly rates:

| Architecture | USD/vCPU-hour | USD/GiB-hour |
|---|---:|---:|
| Linux ARM64 | 0.03237984 | 0.00356004 |
| Linux x86 | 0.0404784 | 0.004446 |

Monthly application compute = `730 × replicas × sum(vCPU × CPU rate + GiB × memory rate)`. Allocation is billed even when idle; 20 GiB ephemeral storage per task is included. [AWS Fargate pricing](https://aws.amazon.com/fargate/pricing/)

Cost scenarios and measured sizing recommendations are in the main report. A merged-service scenario is a planning hypothesis, not a benchmark of code that has been merged.

## Charges outside application compute

| Item | Illustrative monthly arithmetic / budget treatment |
|---|---|
| ALB | $16.43 base at $0.0225/hour, plus $5.84 per average LCU at $0.008/LCU-hour. Do not assume one LCU without measuring traffic. |
| Public IPv4 | $3.65/address-month at $0.005/hour; an internet-facing ALB commonly has at least two addresses ($7.30). Include NAT/public-task addresses as applicable. |
| NAT | Illustrative $32.85/month per provisioned gateway/AZ at $0.045/hour, plus data processing and address charges. Two such AZs cost $65.70 base. Verify region-specific rates. |
| RDS | Not quoted here: instance class, engine/version, region, Single/Multi-AZ, storage, IOPS, and retention are not specified. This remains an additional bill, not zero. |
| Other | CloudWatch logs/metrics, ECR storage, Secrets Manager, DNS/discovery, backups, data transfer, frontend hosting, and optional interface endpoints. |

Sources: [ALB pricing](https://aws.amazon.com/elasticloadbalancing/pricing/), [VPC/NAT/IPv4 pricing](https://aws.amazon.com/vpc/pricing/). The NAT example on the AWS page is region-specific; treat the amount above as illustrative rather than a universal rate.

For a small system, compare private-subnet NAT against the actual set of VPC endpoints needed for image pulls, logs, and secrets; endpoints have their own costs. Avoid eight public application endpoints just to avoid network design. Use one public ingress with internal application communication.

## Before selecting final production capacity

Repeat the workload on the chosen Fargate architecture and region, with RDS, realistic network latency, populated PTO data, employee logins, write operations, shift-change clock-in bursts, and realistic historical attendance volume. Test at least a longer soak, startup under CPU limits, rolling replacement, downstream failure, and two-replica database contention. Capture p95/p99 by route, errors, CPU throttling, GC pauses, memory after warm-up, connection waits, and database performance. Autoscaling must leave enough headroom to survive one replica loss; it cannot eliminate the serial per-employee payroll calls.
