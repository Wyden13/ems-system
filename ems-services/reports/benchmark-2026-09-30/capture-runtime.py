import subprocess,json,pathlib,sys
root=pathlib.Path(__file__).resolve().parent
names=subprocess.check_output(['docker','ps','-a','--filter','label=com.docker.compose.project=ems-benchmark','--format','{{.Names}}'],text=True).split()
rows=[]
for n in names:
 d=json.loads(subprocess.check_output(['docker','inspect',n],text=True))[0]
 r={'name':n,'image':d['Image'],'status':d['State']['Status'],'oom_killed':d['State']['OOMKilled'],'restart_count':d['RestartCount'],'started_at':d['State']['StartedAt'],'health':d['State'].get('Health',{}).get('Status'),'cpu_limit':d['HostConfig']['NanoCpus']/1e9,'memory_limit_bytes':d['HostConfig']['Memory']}
 if r['status']=='running':
  p=subprocess.run(['docker','exec',n,'cat','/sys/fs/cgroup/cpu.stat'],capture_output=True,text=True);r['cpu_stat']=p.stdout
 rows.append(r)
(root/(sys.argv[1]+'.json')).write_text(json.dumps(rows,indent=2))
print(json.dumps([{k:v for k,v in r.items() if k!='cpu_stat'} for r in rows],indent=2))
