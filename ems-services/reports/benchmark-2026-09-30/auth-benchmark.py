import concurrent.futures,http.cookiejar,json,time,threading,urllib.request
from benchmark import ROOT,BASE,sample

def one(_):
 start=time.perf_counter()
 op=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
 try:
  c=json.load(op.open(BASE+'/api/v1/auth/csrf',timeout=20))
  req=urllib.request.Request(BASE+'/api/v1/auth/login',data=json.dumps({'email':'bench@integration.test','password':'BenchmarkOnly123!'}).encode(),headers={'Content-Type':'application/json',c['headerName']:c['token']})
  r=op.open(req,timeout=20);r.read();status=r.status
 except Exception as e:status=getattr(e,'code',0)
 return {'status':status,'ms':(time.perf_counter()-start)*1000}
stop=threading.Event();t=threading.Thread(target=sample,args=(stop,'auth2'));t.start()
start=time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as p:
 fs=[]
 for i in range(60):
  delay=start+i/2-time.monotonic()
  if delay>0:time.sleep(delay)
  fs.append(p.submit(one,i))
 rows=[f.result() for f in fs]
stop.set();t.join()
(ROOT/'auth2-requests.json').write_text(json.dumps(rows,indent=2))
print(json.dumps({'requests':len(rows),'success':sum(r['status']==200 for r in rows),'p95_ms':sorted(r['ms'] for r in rows)[int(len(rows)*.95)]}))
