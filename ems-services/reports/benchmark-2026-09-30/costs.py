import json,pathlib
rates={'arm':{'cpu':0.0000089944*3600,'memory':0.0000009889*3600},'x86':{'cpu':0.000011244*3600,'memory':0.000001235*3600}}
scenarios={
 'eight_minimum_025cpu_05gib':[(.25,.5)]*8,
 'eight_05cpu_1gib':[(.5,1)]*8,
 'eight_05cpu_1gib_except_attendance_1cpu_2gib':[(.5,1)]*7+[(1,2)],
 'eight_1cpu_2gib':[(1,2)]*8,
 'four_merged_planning':[(.5,1),(.5,1),(.5,1),(2,4)],
 'six_pairwise_merges_planning':[(.25,.5),(.5,1),(.5,1),(1,2),(.5,1),(.5,1)]}
out={'assumptions':{'region':'us-east-1','currency':'USD','hours':730,'pricing_checked':'2026-09-30','source':'https://aws.amazon.com/fargate/pricing/','excludes':'RDS, ALB, networking, logging, secrets, images, DNS, backups, frontend, tax, sidecars'},'rates':rates,'scenarios':{}}
for name,sizes in scenarios.items():
 row={'tasks':len(sizes),'vcpu':sum(x[0] for x in sizes),'gib':sum(x[1] for x in sizes)}
 for arch,r in rates.items():
  cost=730*sum(cpu*r['cpu']+mem*r['memory'] for cpu,mem in sizes)
  row[arch+'_one_replica']=round(cost,2);row[arch+'_two_replicas']=round(2*cost,2)
 out['scenarios'][name]=row
pathlib.Path(__file__).with_name('cost-estimates.json').write_text(json.dumps(out,indent=2))
print(json.dumps(out,indent=2))
