import json,pathlib,collections,statistics,re,csv
root=pathlib.Path(__file__).resolve().parent

def mib(s):
 v,u=re.match(r'([\d.]+)(\w+)',s.strip()).groups()
 return float(v)*{'B':1/1048576,'KiB':1/1024,'MiB':1,'GiB':1024}[u]
rows=[json.loads(l) for l in (root/'resources.jsonl').read_text().splitlines()]
groups=collections.defaultdict(list)
for row in rows:groups[(row['Name'].removeprefix('ems-benchmark-').removesuffix('-1'),row['phase'])].append(row)
out=[]
for (name,phase),rs in sorted(groups.items()):
 cpu=[float(r['CPUPerc'].strip('%')) for r in rs];mem=[mib(r['MemUsage'].split('/')[0]) for r in rs]
 out.append({'service':name,'phase':phase,'samples':len(rs),'cpu_mean_percent_of_one_core':round(statistics.mean(cpu),2),'cpu_max_percent_of_one_core':round(max(cpu),2),'memory_mean_mib':round(statistics.mean(mem),1),'memory_max_mib':round(max(mem),1),'pids_max':max(int(r['PIDs']) for r in rs)})
(root/'resource-summary.json').write_text(json.dumps(out,indent=2))
with (root/'resource-summary.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(out[0]));w.writeheader();w.writerows(out)
for r in out:
 if r['phase'] in ('idle','load50','capped50','auth2'):print(r)
