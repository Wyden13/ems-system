import json
from benchmark import phase,login,ROOT
results=[]
token=login()
for name,seconds,rps in [('cappedwarmup',30,10),('cappedidle',30,0),('capped50',60,50)]:
 results.append(phase(name,seconds,rps,token))
(ROOT/'capped-workload-summary.json').write_text(json.dumps(results,indent=2))
