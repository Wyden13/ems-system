#!/usr/bin/env python3
"""Isolated EMS benchmark. No dependencies; results never include tokens or records."""
import concurrent.futures, collections, datetime, http.client, http.cookiejar, json, pathlib, statistics, subprocess, threading, time, urllib.request
ROOT=pathlib.Path(__file__).resolve().parent
BASE='http://127.0.0.1:28080'
jar=http.cookiejar.CookieJar(); opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def api(path,data=None,token=None):
 headers={'Content-Type':'application/json'}
 if token: headers['Authorization']='Bearer '+token
 if path.endswith('/login'):
  csrf=api('/api/v1/auth/csrf');headers[csrf['headerName']]=csrf['token']
 r=opener.open(urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers=headers),timeout=30)
 body=r.read();return json.loads(body) if body else None
def login(): return api('/api/v1/auth/login',{'email':'bench@integration.test','password':'BenchmarkOnly123!'})['accessToken']
def seed(token):
 location=api('/api/locations',{'name':'Benchmark office'},token)
 department=api('/api/departments',{'name':'Benchmark team','locationId':location['id']},token)
 for i in range(50):
  api('/api/employees',{'firstName':'Benchmark','lastName':f'Worker{i}','email':f'worker{i}@benchmark.test','hireDate':'2026-01-01','departmentId':department['id'],'role':'EMPLOYEE','payRate':'25.00'},token)
 category=api('/api/shift-categories',{'name':'Benchmark day','color':'#abcdef','defaultStartTime':'09:00','defaultEndTime':'17:00'},token)
 for i in range(20):
  day=(datetime.date(2026,10,1)+datetime.timedelta(days=i)).isoformat()
  api('/api/shifts',{'categoryId':category['id'],'departmentId':department['id'],'locationId':location['id'],'startsAt':day+'T15:00:00Z','endsAt':day+'T23:00:00Z','requiredEmployees':5},token)
 api('/api/pto/types',{'name':'Benchmark vacation','paid':True,'accrualRatePerPeriod':0,'maxCarryover':0},token)
 return {'employees':50,'shifts':20,'departments':1,'locations':1,'pto_types':1,'attendance_entries':0,'pto_requests':0}
PATHS=['/api/employees','/api/departments','/api/locations','/api/shifts?from=2026-10-01T00:00:00Z&to=2026-11-01T00:00:00Z','/api/pto/types','/api/pto/requests','/api/time-entries?employeeId=1&from=2026-09-25T00:00:00Z&to=2026-10-09T00:00:00Z','/api/payroll/estimates?periodStart=2026-09-25','/api/v1/auth/csrf']
def sample(stop,phase):
 names=subprocess.check_output(['docker','ps','--filter','label=com.docker.compose.project=ems-benchmark','--format','{{.Names}}'],text=True).split()
 with (ROOT/'resources.jsonl').open('a') as f:
  while not stop.is_set():
   start=time.time()
   p=subprocess.run(['docker','stats','--no-stream','--format','{{json .}}',*names],capture_output=True,text=True)
   for line in p.stdout.splitlines():
    row=json.loads(line);row.update(phase=phase,timestamp=start);f.write(json.dumps(row)+'\n')
   f.flush();stop.wait(1)
def request(path,token,scheduled=None):
 start=time.perf_counter();status=0;size=0
 try:
  c=http.client.HTTPConnection('127.0.0.1',28080,timeout=30)
  c.request('GET',path,headers={'Authorization':'Bearer '+token});r=c.getresponse();status=r.status;size=len(r.read());c.close()
 except Exception: status=0
 return {'path':path,'status':status,'ms':(time.perf_counter()-start)*1000,'bytes':size,'end_to_end_ms':(time.monotonic()-scheduled)*1000 if scheduled is not None else (time.perf_counter()-start)*1000}
def phase(name,seconds,rps,token):
 stop=threading.Event();t=threading.Thread(target=sample,args=(stop,name));t.start();rows=[];start=time.monotonic()
 if rps:
  with concurrent.futures.ThreadPoolExecutor(max_workers=32) as pool:
   fs=[]
   for i in range(int(seconds*rps)):
    delay=start+i/rps-time.monotonic()
    if delay>0:time.sleep(delay)
    fs.append(pool.submit(request,PATHS[i%len(PATHS)],token,start+i/rps))
   rows=[f.result() for f in fs]
 else: time.sleep(seconds)
 elapsed=time.monotonic()-start;stop.set();t.join()
 (ROOT/(name+'-requests.json')).write_text(json.dumps(rows))
 def pct(a,q):return sorted(a)[min(len(a)-1,int(len(a)*q))] if a else 0
 result={'phase':name,'seconds':elapsed,'target_rps':rps,'completed':len(rows),'achieved_rps':len(rows)/elapsed,'statuses':dict(collections.Counter(r['status'] for r in rows)),'p50_ms':pct([r['ms'] for r in rows],.5),'p95_ms':pct([r['ms'] for r in rows],.95),'p99_ms':pct([r['ms'] for r in rows],.99),'end_to_end_p95_ms':pct([r.get('end_to_end_ms',r['ms']) for r in rows],.95),'endpoints':{}}
 for path in PATHS:
  rs=[r for r in rows if r['path']==path]
  if rs:result['endpoints'][path]={'requests':len(rs),'statuses':dict(collections.Counter(r['status'] for r in rs)),'p95_ms':pct([r['ms'] for r in rs],.95)}
 print(json.dumps(result),flush=True);return result
if __name__=='__main__':
 import sys
 token=login()
 if '--seed' in sys.argv:
  print(json.dumps(seed(token)));sys.exit()
 for p in PATHS:
  r=request(p,token)
  if r['status']!=200:raise RuntimeError(f'Preflight failed: {r}')
 results=[]
 for name,seconds,rps in [('warmup',30,10),('idle',60,0),('load20',60,20),('load50',60,50),('recovery',30,0)]:
  results.append(phase(name,seconds,rps,token))
 (ROOT/'workload-summary.json').write_text(json.dumps(results,indent=2))
