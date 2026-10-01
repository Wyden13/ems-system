import subprocess,json,time,pathlib
out=pathlib.Path(__file__).resolve().parent/'startup-resources.jsonl'
end=time.monotonic()+90
with out.open('w') as f:
 while time.monotonic()<end:
  names=subprocess.check_output(['docker','ps','--filter','label=com.docker.compose.project=ems-benchmark','--format','{{.Names}}'],text=True).split()
  p=subprocess.run(['docker','stats','--no-stream','--format','{{json .}}',*names],capture_output=True,text=True)
  for line in p.stdout.splitlines():
   r=json.loads(line);r['timestamp']=time.time();f.write(json.dumps(r)+'\n')
  f.flush();time.sleep(1)
