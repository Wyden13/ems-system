from pathlib import Path
import json,re
r=Path(__file__).resolve().parent
load=lambda n:json.loads((r/n).read_text())
summary=load('resource-summary.json'); lookup={(x['service'],x['phase']):x for x in summary}
services=sorted({x['service'] for x in summary if x['service']!='postgres'})
base=load('workload-summary.json'); capped=load('capped-workload-summary.json'); auth=load('auth-summary.json'); costs=load('cost-estimates.json')
get=lambda s,p,k:lookup[s,p][k]
idle=sum(get(s,'idle','memory_mean_mib') for s in services)
loaded=sum(get(s,'load50','memory_mean_mib') for s in services)
peak=sum(get(s,'load50','memory_max_mib') for s in services)
cpu=sum(get(s,'load50','cpu_mean_percent_of_one_core') for s in services)/100
startup={}
for filename,key in [('startup.log','unrestricted'),('capped-startup.log','capped')]:
 for line in (r/filename).read_text().splitlines():
  m=re.search(r'^(\S+)-1\s+\|.*Started .* in ([\d.]+) seconds',line)
  if m:startup.setdefault(m[1],{})[key]=float(m[2])
lines=['# EMS resource benchmark and AWS Fargate assessment','',
'**Measured 2026-09-30 UTC / September 29 Edmonton. No AWS deployment was performed.**','',
'**Recommendation: consolidate toward four applications: gateway, auth, people, and workforce.** Merge employee + organization first; merge scheduling + leave next. Include attendance and the current payroll-estimate feature in workforce once those boundaries are stable. Do not deploy the notification scaffold yet. The strongest reasons are reduced runtime overhead and simpler business transactions, not an assumption that fewer containers automatically run faster.','',
f'The eight current applications consumed **{idle/1024:.2f} GiB at idle** and **{loaded/1024:.2f} GiB on average during the 50 requests/s phase**, excluding PostgreSQL. Their sampled CPU means summed to **{cpu:.2f} cores** under that workload. Fargate charges for reserved capacity, so idle usage does not translate into an idle-price discount. [AWS pricing](https://aws.amazon.com/fargate/pricing/)','',
'## Measured resources by service','',
'CPU percentages below are relative to **one CPU core**: 100% = one core. Memory is Docker cache-adjusted usage, not Java heap size. “Load” is the unrestricted mixed workload offering 50 requests/s. Values are sampled means and maxima, not continuous peak capture.','',
'| Service | Idle RAM MiB | Load mean RAM MiB | Load max RAM MiB | Idle CPU % | Load mean CPU % | Load max CPU % |',
'|---|---:|---:|---:|---:|---:|---:|']
for s in services+['postgres']:
 a=lookup[s,'idle'];b=lookup[s,'load50'];lines.append(f"| {s.replace('-service','')} | {a['memory_mean_mib']:.1f} | {b['memory_mean_mib']:.1f} | {b['memory_max_mib']:.1f} | {a['cpu_mean_percent_of_one_core']:.2f} | {b['cpu_mean_percent_of_one_core']:.2f} | {b['cpu_max_percent_of_one_core']:.2f} |")
lines += ['',f'The sum of individual application memory maxima was {peak/1024:.2f} GiB; this is not a simultaneous system peak. PostgreSQL used {get("postgres","idle","memory_mean_mib"):.1f} MiB idle and {get("postgres","load50","memory_max_mib"):.1f} MiB at its sampled maximum in this phase. Notification is **not measured** because it is absent from the deployable stack.', '',
'**Database connections:** 70 application connections at idle, 10 per database-backed service. **Image sizes:** roughly 119–159 MiB per application according to Docker image inspection; layers may be shared. Raw statistics also retain cumulative network/block I/O and thread/process counts, but this was not an I/O capacity benchmark.','',
'## Request performance','',
'Fixtures: 50 employees, 20 shifts, 700 attendance entries, one department/location/PTO type, and no PTO requests. Nine equally weighted GET routes through the gateway include payroll estimates for all 50 employees. The traffic mix is deliberately report-heavy.','',
'| Scenario | Requests | Success | Achieved req/s including drain | p50 ms | p95 ms | p99 ms | Payroll p95 ms |',
'|---|---:|---:|---:|---:|---:|---:|---:|']
for x in [a for a in base if a['phase'] in ['load20','load50']]+[a for a in capped if a['phase']=='capped50']:
 payroll=x['endpoints']['/api/payroll/estimates?periodStart=2026-09-25']['p95_ms']
 lines.append(f"| {x['phase']} | {x['completed']} | {x['statuses'].get('200',0)} | {x['achieved_rps']:.2f} | {x['p50_ms']:.0f} | {x['p95_ms']:.0f} | {x['p99_ms']:.0f} | {payroll:.0f} |")
c=next(x for x in capped if x['phase']=='capped50')
lines += ['',f"The constrained run's p95 measured from **scheduled arrival**, including client queueing, was **{c['end_to_end_p95_ms']:.0f} ms**. Its status counts were `{c['statuses']}`. Baseline latency starts when an executor worker begins the HTTP request and excludes client queueing. The client has 32 workers; these results are not a maximum-capacity certification.",'',
'The constrained warm-up had **12 HTTP 503 responses out of 300 requests** (six leave, six payroll), despite healthy containers. The later capped load completed all requests successfully, but accumulated client queueing. All baseline load requests returned HTTP 200. Payroll p95 improved in the later, heavier phase; warm-up/JIT, cache effects, run order, GC, and desktop variability mean this is **not** evidence that heavier load improves performance. Even without errors, multi-second report latency needs attention.','',
'**Most actionable code bottleneck:** `PayrollEstimateService.report()` lists employees, then makes one sequential attendance RPC per employee. With 50 employees, each report makes 50 attendance calls plus the employee lookup. At the offered 50 req/s mix, payroll alone can generate about 278 attendance RPC/s. The observed high attendance CPU is consistent with this amplification; the benchmark does not isolate it as the sole cause of all latency. Bulk attendance retrieval should be tested before merely increasing task sizes. A batch RPC can address this in the existing architecture; consolidation is not a prerequisite for that optimization.','',
'## Constrained deployment check','',
'All application containers were recreated with **0.5 vCPU, 1 GiB RAM**, and heap percentages of 60% maximum / 15% initial. PostgreSQL stayed unrestricted. This is a local resource-limit test, not an AWS hardware or network emulation. The heap configuration and JVM CPU ergonomics also changed, so it is not a controlled CPU-only comparison.','',
'| Service | Capped load mean CPU % of one core | Capped load max RAM MiB | Startup unrestricted seconds | Startup capped seconds |',
'|---|---:|---:|---:|---:|']
for s in services:
 b=lookup[s,'capped50'];st=startup.get(s,{})
 lines.append(f"| {s.replace('-service','')} | {b['cpu_mean_percent_of_one_core']:.2f} | {b['memory_max_mib']:.1f} | {st.get('unrestricted',0):.1f} | {st.get('capped',0):.1f} |")
lines += ['',f"A separate capped login probe completed **{auth['success']}/{auth['requests']}** login flows successfully, at an offered two flows/s; p95 including CSRF retrieval was **{auth['p95_ms']:.0f} ms**. Auth CPU in the mixed GET run mostly represents CSRF handling and background activity, not password hashing.",'',
'No application container was OOM-killed or restarted during the capped run; all eight were healthy at its end. Cgroup counter deltas across the capped measurement window show attendance throttled in **74.7% of active quota periods**, gateway in 36.7%, and employee in 36.1%. These percentages are not percentages of wall time spent stalled. Together with the request results, they support prioritizing CPU and payroll call amplification over simply adding memory. See `throttling-summary.json` for the raw deltas.','',
'Startup durations above are Spring application log durations, not image-pull-to-ready times. Startup ordering and simultaneous work differ between runs. Full readiness also requires health-check detection.','',
'## Fargate sizing and cost scenarios','',
'**Do not choose eight minimum 0.25-vCPU / 0.5-GiB tasks based on idle averages.** Some unrestricted services already exceed 512 MiB, and several services need more than half a CPU during the report-heavy phase. The tested 0.5-vCPU / 1-GiB configuration did not sustain the offered 50 requests/s: completion fell to 39.7 requests/s with substantial queueing. It is not a validated production size for that workload. Final sizing requires an agreed latency target and a cloud workload test. For a next capacity test, increase CPU on attendance first and then gateway/payroll/employee as indicated by throttling and route latency. Consider 1 vCPU / 2 GiB per busy service, or 2 vCPU / 4 GiB for attendance if targeting this workload with headroom; none of those larger Fargate allocations were benchmarked here.','',
'Application compute only, USD/month, 730 hours, US East (N. Virginia), on-demand. “Two replicas” doubles application allocation; it does not include database redundancy or prove failover capacity.','',
'| Allocation scenario | Total vCPU / GiB per replica set | ARM one replica | ARM two replicas | x86 one replica |',
'|---|---:|---:|---:|---:|']
labels={'eight_minimum_025cpu_05gib':'8 × 0.25 CPU / 0.5 GiB — arithmetic floor, not recommended','eight_05cpu_1gib':'8 × 0.5 CPU / 1 GiB — locally tested','eight_1cpu_2gib':'8 × 1 CPU / 2 GiB — untested capacity allowance','four_merged_planning':'4 merged apps — unbuilt planning scenario'}
for k,label in labels.items():
 a=costs['scenarios'][k];lines.append(f"| {label} | {a['vcpu']:g} / {a['gib']:g} | ${a['arm_one_replica']:.2f} | ${a['arm_two_replicas']:.2f} | ${a['x86_one_replica']:.2f} |")
lines += ['',
'The four-application model reserves 0.5 CPU / 1 GiB each for gateway, auth, and people, plus 2 CPU / 4 GiB for workforce. At those explicit assumptions, compute is $100.92/month ARM, only $14.42/month below the eight small tasks. Larger savings require proving that consolidation reduces the needed total allocation. Do not promise a 50% bill reduction just because the service count halves. [Rate source](https://aws.amazon.com/fargate/pricing/)','',
'For illustration, eight small ARM tasks ($115.34), one ALB base ($16.43), one average LCU ($5.84), two ALB IPv4 addresses ($7.30), and one $0.045/hour NAT gateway plus its address ($36.50) total **about $181.41/month before RDS, logs, storage, traffic charges, secrets, and frontend hosting**. This is not a complete quote; region and networking choices remain assumptions. See the deployment notes below for sources and exclusions.','',
'## Project breadth','',
'| Module | Main Java files | Physical Java lines | Entity annotations | REST controller implementations | Java test files |',
'|---|---:|---:|---:|---:|---:|']
for s,x in load('source-inventory.json').items():lines.append(f"| {s.removeprefix('ems-').removesuffix('-service')} | {x['java_files']} | {x['java_lines']} | {x['entities']} | {x['rest_controllers']} | {x['test_files']} |")
lines += ['',
'This is one integrated employee-management product: account management, organization/employee administration, scheduling, PTO, attendance, and pay estimates, reflected in the frontend pages. Shared protobuf contracts cover reference lookups, workforce data, and scheduling. The file count overstates implemented feature breadth where interfaces and DTOs are scaffolded. Counts exclude generated source; test-file count is not coverage.','',
'```mermaid','flowchart LR','    UI[Frontend] --> G[Gateway]','    G --> A[Auth]','    G --> P[People: employee + organization]','    G --> W[Workforce: scheduling + leave + attendance + pay estimates]','    W --> P','    P --> A','```','']
lines += [(r/'architecture-notes.md').read_text().replace('# Architecture assessment','## Consolidation recommendations',1),'',(r/'fargate-notes.md').read_text().replace('# Fargate deployment assessment','## AWS deployment details',1),'',
'## Evidence and reproduction','',
f'- [Detailed methodology and reproduction]({r}/METHODOLOGY.md)',f'- [Per-service resource summary CSV]({r}/resource-summary.csv)',f'- [Raw resource samples]({r}/resources.jsonl)',f'- [Baseline route results]({r}/workload-summary.json)',f'- [Constrained route results]({r}/capped-workload-summary.json)',f'- [Cost assumptions and calculations]({r}/cost-estimates.json)',f'- [Runtime limits, health, and throttling evidence]({r}/capped-after.json)','',
'No application code was changed, and no service merge or cloud deployment was performed. Benchmark runtime cleanup and original-stack restoration are recorded in `cleanup-status.txt`. The synthetic database volume and scripts are retained for repeatability.']
(r/'REPORT.md').write_text('\n'.join(lines)+'\n')
print(r/'REPORT.md')
