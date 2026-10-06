#!/usr/bin/env python3
"""Build additive fictional business history for the existing AWS cloud-demo staff."""
import argparse
from collections import Counter
from datetime import datetime, date, time, timedelta, timezone
import json
from pathlib import Path
import uuid
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / '.cloud-demo.local'
ZONE = ZoneInfo('America/Edmonton')
RUN = 'prairie-cloud-operations-v1'
CATEGORIES = [
    ('opening', 'Cloud Demo · Retail opening', '#5B4BE1', 7, 15),
    ('closing', 'Cloud Demo · Retail closing', '#A66B13', 14, 22),
    ('overnight', 'Cloud Demo · Overnight inventory', '#167B80', 22, 6),
    ('leadership', 'Cloud Demo · Store leadership', '#62626C', 9, 17),
]
TYPES = [('vacation', 'Cloud Demo · Vacation', 80), ('sick', 'Cloud Demo · Sick leave', 24)]

def stamp(day, hour=0):
    return datetime.combine(day, time(hour), ZONE).astimezone(timezone.utc)

def key_uuid(key):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, RUN + ':' + key))

def sql(value):
    if value is None: return 'NULL'
    if isinstance(value, bool): return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)): return str(value)
    if isinstance(value, (date, datetime)): value = value.isoformat()
    return "'" + str(value).replace("'", "''") + "'"

def build_plan(inspection, now):
    staff = inspection['staff']
    if len(staff) != 25 or any(not row['email'].startswith('cloud-demo.') or not row['email'].endswith('@prairie.demo.test') for row in staff):
        raise ValueError('The existing 25 cloud-demo employees are required.')
    today = now.astimezone(ZONE).date()
    saturday = today - timedelta(days=(today.weekday()+2)%7)
    first, last = saturday-timedelta(weeks=8), saturday+timedelta(weeks=3)
    employees = sorted([row for row in staff if row['role']=='EMPLOYEE'],key=lambda row:row['id'])
    supervisors = [row for row in staff if row['role']=='SUPERVISOR']
    people = {row['id']:row for row in staff}
    departments = sorted({row['departmentId'] for row in staff})
    requests = []
    scenarios = [
        (employees[0], 'vacation', today-timedelta(days=26), 2, 'APPROVED', 'Family holiday'),
        (employees[1], 'sick', today-timedelta(days=43), 1, 'APPROVED', 'Medical leave'),
        (employees[2], 'vacation', today-timedelta(days=18), 1, 'REJECTED', 'Coverage unavailable'),
        (employees[3], 'vacation', today-timedelta(days=8), 1, 'CANCELLED', 'Travel plans changed'),
        (employees[4], 'vacation', today+timedelta(days=6), 1, 'PENDING', 'Family reason'),
        (employees[5], 'vacation', today+timedelta(days=7), 2, 'PENDING', 'Family holiday'),
        (employees[6], 'vacation', today+timedelta(days=9), 2, 'APPROVED', 'Planned vacation'),
        (employees[7], 'vacation', today+timedelta(days=13), 1, 'APPROVED', 'Personal leave'),
        (employees[0], 'sick', today+timedelta(days=2), 1, 'PENDING', 'Medical appointment'),
        (supervisors[0], 'vacation', today+timedelta(days=4), 1, 'PENDING', 'Family reason'),
        (employees[8], 'sick', today-timedelta(days=12), 1, 'APPROVED', 'Medical leave'),
        (employees[9], 'vacation', today+timedelta(days=10), 1, 'REJECTED', 'Alternative dates requested'),
    ]
    approved_days, pending_days = set(), set()
    for index,(worker,kind,start,length,status,reason) in enumerate(scenarios):
        end = start+timedelta(days=length-1)
        created = min(now-timedelta(days=2),stamp(start-timedelta(days=7),12))
        row={'key':f'leave-{index}','employeeId':worker['id'],'type':kind,'startDate':start.isoformat(),'endDate':end.isoformat(),'hours':length*8,'days':length,'status':status,'reason':reason,'createdAt':created.isoformat(),'reviewedAt':(created+timedelta(hours=4)).isoformat()}
        requests.append(row)
        target=approved_days if status=='APPROVED' else pending_days if status=='PENDING' else None
        if target is not None:
            target.update((worker['id'],start+timedelta(days=offset)) for offset in range(length))
    occupied=[]
    for shift in inspection['shifts']:
        if shift['status']=='CANCELLED': continue
        for assignment in shift['assignments']:
            if assignment['status'] in ('ASSIGNED','ACCEPTED'):
                occupied.append((assignment['employeeId'],datetime.fromisoformat(shift['startsAt']),datetime.fromisoformat(shift['endsAt'])))
    prior_end={}
    shifts=[]
    for offset in range((last-first).days):
        day=first+timedelta(days=offset)
        night_workers=set()
        for department in departments:
            team=[row for row in staff if row['departmentId']==department and row['role'] not in ('ADMIN','MANAGER')]
            leaders=[row for row in staff if row['departmentId']==department and row['role'] in ('ADMIN','MANAGER')]
            stock=any('inventory' in row.get('jobTitle','').lower() for row in team)
            definitions=['opening','closing']
            if stock and day.weekday() in (0,2,4): definitions=['overnight']+definitions
            if leaders and day.weekday()<5: definitions+=['leadership']
            for category in definitions:
                cat=next(row for row in CATEGORIES if row[0]==category)
                start=stamp(day,cat[3]); end=stamp(day+timedelta(days=1 if cat[4]<cat[3] else 0),cat[4])
                future=start>now
                state='DRAFT' if future and (offset+department+CATEGORIES.index(cat))%9==0 else 'PUBLISHED'
                if future and (offset+department+CATEGORIES.index(cat))%31==0:state='CANCELLED'
                pool=leaders if category=='leadership' else team
                selected=[]
                for position,worker in enumerate(pool):
                    wid=worker['id']
                    if (wid,day) in approved_days or (category=='overnight' and (wid,day+timedelta(days=1)) in approved_days): continue
                    if wid in night_workers and category!='overnight':continue
                    if category!='leadership' and (wid,day) not in pending_days:
                        if worker['role']=='SUPERVISOR' and day.weekday() in (5,6):continue
                        if worker['role']=='EMPLOYEE' and (offset+wid)%7 in (0,1):continue
                    if category in ('opening','closing') and position%2 != (0 if category=='opening' else 1):continue
                    if prior_end.get(wid,first-timedelta(days=1)) != first-timedelta(days=1):
                        if start < prior_end[wid]+timedelta(hours=11):continue
                    if any(wid==eid and start<old_end and end>old_start for eid,old_start,old_end in occupied):continue
                    if category=='overnight' and len(selected)>=1:continue
                    assignment='CANCELLED' if state=='CANCELLED' else 'DECLINED' if future and (wid+offset)%23==0 else 'ASSIGNED' if future else 'ACCEPTED'
                    selected.append({'employeeId':wid,'status':assignment})
                    if assignment in ('ASSIGNED','ACCEPTED'):
                        prior_end[wid]=end
                        if category=='overnight':night_workers.add(wid)
                required=max(1,len(selected))+(1 if state!='CANCELLED' and category!='leadership' and (offset+department)%5==0 else 0)
                shifts.append({'key':f'shift-{offset}-{department}-{category}','category':category,'departmentId':department,'locationId':2 if department in (3,4) else 3,'startsAt':start.isoformat(),'endsAt':end.isoformat(),'requiredEmployees':required,'status':state,'assignments':selected})
    attendance=[]
    open_employees=set()
    missed=[]
    for shift in sorted(shifts,key=lambda row:row['startsAt']):
        start=datetime.fromisoformat(shift['startsAt']); end=datetime.fromisoformat(shift['endsAt'])
        if shift['status']!='PUBLISHED' or start>=now:continue
        day=start.astimezone(ZONE).date();offset=(day-first).days
        for assignment in shift['assignments']:
            wid=assignment['employeeId'];worker=people[wid]
            if assignment['status'] not in ('ASSIGNED','ACCEPTED') or wid in open_employees:continue
            if (wid+offset)%41==0:continue  # missed clock-in, while scheduled shift remains visible
            late=15 if (wid+offset)%11==0 else 0
            clock_in=start+timedelta(minutes=late)
            if clock_in>=now:continue
            clock_out=end-timedelta(minutes=10 if (wid+offset)%17==0 else 0)
            overtime=worker['role'] in ('MANAGER','SUPERVISOR') and day.weekday()==4 and offset%21<7
            if overtime:clock_out+=timedelta(hours=2)
            missing=wid==employees[8]['id'] and today-timedelta(days=3)<=day<today and not missed
            if missing or clock_out>now:
                status='OPEN';clock_out=None;open_employees.add(wid)
                if missing:missed.append(wid)
            elif day>=today-timedelta(days=7) and (wid+offset)%5==0:status='PENDING_APPROVAL'
            elif (wid+offset)%67==0:status='REJECTED'
            else:status='APPROVED'
            seconds=0 if clock_out is None else int((clock_out-clock_in).total_seconds())
            attendance.append({'key':f'attendance-{shift["key"]}-{wid}','shiftKey':shift['key'],'employeeId':wid,'clockIn':clock_in.isoformat(),'clockOut':clock_out.isoformat() if clock_out else None,'status':status,'workedSeconds':seconds,'late':late>0,'overtime':overtime,'missedClockOut':missing})
    availability=[]
    for worker in staff:
        for weekday in ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']:
            if worker['role'] in ('ADMIN','MANAGER') and weekday in ('SATURDAY','SUNDAY'):continue
            stock='inventory' in worker.get('jobTitle','').lower()
            availability.append({'employeeId':worker['id'],'day':weekday,'start':'07:00','end':'22:00','type':'PREFERRED' if stock else 'AVAILABLE'})
            if stock:availability.append({'employeeId':worker['id'],'day':weekday,'start':'00:00','end':'07:00','type':'PREFERRED'})
    counts={'shifts':len(shifts),'assignments':sum(len(row['assignments']) for row in shifts),'attendance':len(attendance),'attendanceByStatus':dict(Counter(row['status'] for row in attendance)),'lateArrivals':sum(row['late'] for row in attendance),'overtimeEntries':sum(row['overtime'] for row in attendance),'missedClockOuts':sum(row['missedClockOut'] for row in attendance),'ptoRequests':len(requests),'ptoByStatus':dict(Counter(row['status'] for row in requests))}
    return {'name':RUN,'generatedAt':now.isoformat(),'from':first.isoformat(),'toExclusive':last.isoformat(),'staff':staff,'shifts':shifts,'attendance':attendance,'requests':requests,'availability':availability,'plannedCounts':counts}

def build_sql(plan):
    statements=[]
    run=sql(RUN)
    people={row['id']:row for row in plan['staff']}
    managers=[row for row in plan['staff'] if row['role']=='MANAGER']
    allocation_actor=next(row['userAccountId'] for row in plan['staff'] if row['role']=='ADMIN')
    def reviewer(wid): return managers[1 if people[wid]['userAccountId']==managers[0]['userAccountId'] else 0]['userAccountId']
    def ref(kind,key): return f'(select record_id from cloud_demo_fixture_records where run_name={run} and kind={sql(kind)} and fixture_key={sql(key)})'
    def mapped(kind,key,command):
        statements.append(f'WITH fixture_row AS ({command} RETURNING id) INSERT INTO cloud_demo_fixture_records(run_name,kind,fixture_key,record_id) SELECT {run},{sql(kind)},{sql(key)},id FROM fixture_row;')
    def insert(table,values): return f'INSERT INTO {table} ({",".join(values)}) VALUES ({",".join(sql(value) for value in values.values())})'
    statements.append('CREATE TABLE IF NOT EXISTS cloud_demo_fixture_records(run_name text not null,kind text not null,fixture_key text not null,record_id bigint not null,PRIMARY KEY(run_name,kind,fixture_key));')
    ids=','.join(str(wid) for wid in sorted(people))
    statements += [f'INSERT INTO attendance_employee_locks(employee_id) SELECT unnest(ARRAY[{ids}]::bigint[]) ON CONFLICT DO NOTHING;',f'SELECT employee_id FROM attendance_employee_locks WHERE employee_id IN ({ids}) ORDER BY employee_id FOR UPDATE;']
    for key,name,color,start,end in CATEGORIES:
        statements.append(insert('shift_categories',{'name':name,'color':color,'default_start_time':f'{start:02d}:00','default_end_time':f'{end:02d}:00'})+' ON CONFLICT DO NOTHING;')
        statements.append(f"DO $$ BEGIN IF EXISTS (SELECT 1 FROM shift_categories WHERE lower(name)=lower({sql(name)}) AND NOT active) THEN RAISE EXCEPTION 'Existing demo category is inactive; import refused'; END IF; END $$;")
        statements.append(f'INSERT INTO cloud_demo_fixture_records VALUES ({run},\'category\',{sql(key)},(SELECT id FROM shift_categories WHERE lower(name)=lower({sql(name)})));')
    for key,name,_ in TYPES:
        statements.append(insert('pto_types',{'name':name,'accrual_rate_per_period':0,'max_carryover':0,'paid':True})+' ON CONFLICT DO NOTHING;')
        statements.append(f'INSERT INTO cloud_demo_fixture_records VALUES ({run},\'type\',{sql(key)},(SELECT id FROM pto_types WHERE lower(name)=lower({sql(name)})));')
    # Requests and balances share a single, internally consistent set of usage/reservations.
    for worker in plan['staff']:
        for kind,_,allocated in TYPES:
            rows=[row for row in plan['requests'] if row['employeeId']==worker['id'] and row['type']==kind]
            used=sum(row['hours'] for row in rows if row['status']=='APPROVED')
            reserved=sum(row['hours'] for row in rows if row['status']=='PENDING')
            type_id=ref('type',kind)
            mapped('balance',f'{worker["id"]}-{kind}',f"INSERT INTO pto_balances(employee_id,pto_type_id,accrued_hours,used_hours,reserved_hours) SELECT {worker['id']},{type_id},{allocated},{used},{reserved} WHERE NOT EXISTS (SELECT 1 FROM pto_balances WHERE employee_id={worker['id']} AND pto_type_id={type_id})")
            statements.append(f"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM cloud_demo_fixture_records WHERE run_name={run} AND kind='balance' AND fixture_key={sql(str(worker['id'])+'-'+kind)}) THEN RAISE EXCEPTION 'Existing demo balance was preserved; fresh type required'; END IF; END $$;")
            mapped('ledger',f'allocation-{worker["id"]}-{kind}',f"INSERT INTO pto_ledger_entries(employee_id,pto_type_id,hours_delta,entry_type,occurred_at,actor,reason,request_key) VALUES ({worker['id']},{type_id},{allocated},'ADJUSTMENT',{sql(stamp(date.fromisoformat(plan['from'])))},{sql(allocation_actor)},'Fictional cloud-demo opening allocation',{sql(key_uuid('allocation-'+str(worker['id'])+'-'+kind))})")
    for row in plan['requests']:
        wid=row['employeeId'];worker=people[wid];reviewed=row['status'] in ('APPROVED','REJECTED')
        values={'employee_id':wid,'start_date':row['startDate'],'end_date':row['endDate'],'hours':row['hours'],'status':row['status'],'reviewed_by':reviewer(wid) if reviewed else None,'reviewed_at':row['reviewedAt'] if reviewed else None,'created_at':row['createdAt'],'request_key':key_uuid(row['key']),'reason':'Fictional business simulation: '+row['reason'],'reason_category':'Medical leave' if row['type']=='sick' else 'Vacation','request_unit':'DAYS','requested_amount':row['days'],'employee_signature':worker['firstName']+' '+worker['lastName'],'signed_at':row['createdAt'],'comment':'Cloud-demo '+row['reason'] if reviewed else None}
        columns='pto_type_id,'+','.join(values)
        command=f'INSERT INTO pto_requests({columns}) VALUES ({ref("type",row["type"])},{",".join(sql(value) for value in values.values())})'
        mapped('request',row['key'],command)
        rid=ref('request',row['key'])
        statements.append(f"INSERT INTO pto_audits(request_id,action,actor,reason,occurred_at) VALUES ({rid},'CREATE',{sql(worker['userAccountId'])},'Fictional cloud-demo request',{sql(row['createdAt'])});")
        if reviewed or row['status']=='CANCELLED':
            actor=worker['userAccountId'] if row['status']=='CANCELLED' else reviewer(wid)
            statements.append(f"INSERT INTO pto_audits(request_id,action,actor,reason,occurred_at) VALUES ({rid},{sql(row['status'])},{sql(actor)},{sql('Fictional cloud-demo '+row['reason'])},{sql(row['reviewedAt'])});")
        if row['status']=='APPROVED':
            statements.append(f"INSERT INTO leave_holds(request_id,employee_id,start_date,end_date) VALUES ({rid},{wid},{sql(row['startDate'])},{sql(row['endDate'])});")
            mapped('ledger','usage-'+row['key'],f"INSERT INTO pto_ledger_entries(employee_id,pto_type_id,hours_delta,entry_type,source_request_id,occurred_at,actor,reason) VALUES ({wid},{ref('type',row['type'])},-{row['hours']},'USAGE',{rid},{sql(row['reviewedAt'])},{sql(reviewer(wid))},'Fictional approved leave')")
    for row in plan['shifts']:
        values={'department_id':row['departmentId'],'location_id':row['locationId'],'starts_at':row['startsAt'],'ends_at':row['endsAt'],'required_employees':row['requiredEmployees'],'status':row['status']}
        mapped('shift',row['key'],f'INSERT INTO shifts(shift_category_id,{",".join(values)}) VALUES ({ref("category",row["category"])},{",".join(sql(value) for value in values.values())})')
        sid=ref('shift',row['key'])
        for assignment in row['assignments']:
            wid=assignment['employeeId'];state=assignment['status']
            no_overlap=f"NOT EXISTS (SELECT 1 FROM shift_assignments a JOIN shifts s ON s.id=a.shift_id WHERE a.employee_id={wid} AND a.status IN ('ASSIGNED','ACCEPTED') AND s.status<>'CANCELLED' AND s.starts_at<{sql(row['endsAt'])}::timestamptz AND s.ends_at>{sql(row['startsAt'])}::timestamptz)"
            no_leave=f"NOT EXISTS (SELECT 1 FROM leave_holds h WHERE h.employee_id={wid} AND h.start_date<=(({sql(row['endsAt'])}::timestamptz-interval '1 second') AT TIME ZONE 'America/Edmonton')::date AND h.end_date>=({sql(row['startsAt'])}::timestamptz AT TIME ZONE 'America/Edmonton')::date)"
            mapped('assignment',row['key']+'-'+str(wid),f"INSERT INTO shift_assignments(shift_id,employee_id,status,responded_at) SELECT {sid},{wid},{sql(state)},{sql(row['startsAt'] if state=='ACCEPTED' else None)} WHERE {no_overlap} AND {no_leave}")
    for row in plan['attendance']:
        wid=row['employeeId'];sid=ref('shift',row['shiftKey'])
        end=sql(row['clockOut'])+'::timestamptz' if row['clockOut'] else "'infinity'::timestamptz"
        no_overlap=f"NOT EXISTS (SELECT 1 FROM time_entries t WHERE t.employee_id={wid} AND t.clock_in<{end} AND coalesce(t.clock_out,'infinity'::timestamptz)>{sql(row['clockIn'])}::timestamptz)"
        fields={'employee_id':wid,'clock_in':row['clockIn'],'clock_out':row['clockOut'],'source':'WEB','status':row['status'],'worked_seconds':row['workedSeconds'],'worked_minutes':row['workedSeconds']//60,'request_id':key_uuid(row['key'])}
        mapped('attendance',row['key'],f"INSERT INTO time_entries({','.join(fields)}) SELECT {','.join(sql(value) for value in fields.values())} WHERE {no_overlap} AND EXISTS (SELECT 1 FROM shift_assignments WHERE shift_id={sid} AND employee_id={wid} AND status IN ('ASSIGNED','ACCEPTED'))")
        if row['status'] in ('APPROVED','REJECTED'):
            action='APPROVE' if row['status']=='APPROVED' else 'REJECT'
            occurred=min(datetime.fromisoformat(plan['generatedAt']),datetime.fromisoformat(row['clockOut'])+timedelta(hours=2))
            statements.append(f"INSERT INTO attendance_audits(entry_id,reviewer,action,reason,old_clock_in,old_clock_out,new_clock_in,new_clock_out,old_status,new_status,occurred_at) SELECT {ref('attendance',row['key'])},{sql(reviewer(wid))},{sql(action)},'Fictional cloud-demo attendance review',{sql(row['clockIn'])},{sql(row['clockOut'])},{sql(row['clockIn'])},{sql(row['clockOut'])},'PENDING_APPROVAL',{sql(row['status'])},{sql(occurred)} WHERE {ref('attendance',row['key'])} IS NOT NULL;")
    for index,row in enumerate(plan['availability']):
        mapped('availability',str(index),f"INSERT INTO employee_availability(employee_id,day_of_week,start_time,end_time,type) SELECT {row['employeeId']},{sql(row['day'])},{sql(row['start'])},{sql(row['end'])},{sql(row['type'])} WHERE NOT EXISTS (SELECT 1 FROM employee_availability WHERE employee_id={row['employeeId']} AND day_of_week={sql(row['day'])})")
    # Guard the consistency that the application relies on before committing.
    statements.append(f"DO $$ BEGIN IF EXISTS (SELECT 1 FROM cloud_demo_fixture_records r JOIN time_entries t ON t.id=r.record_id WHERE r.run_name={run} AND r.kind='attendance' AND (t.clock_in>now() OR t.clock_out>now() OR t.worked_seconds<>coalesce(extract(epoch from t.clock_out-t.clock_in)::bigint,0))) THEN RAISE EXCEPTION 'Invalid attendance fixture'; END IF; IF EXISTS (SELECT 1 FROM cloud_demo_fixture_records r JOIN shift_assignments a ON a.id=r.record_id JOIN shifts s ON s.id=a.shift_id JOIN leave_holds h ON h.employee_id=a.employee_id WHERE r.run_name={run} AND r.kind='assignment' AND a.status IN ('ASSIGNED','ACCEPTED') AND s.status<>'CANCELLED' AND h.start_date<=((s.ends_at-interval '1 second') AT TIME ZONE 'America/Edmonton')::date AND h.end_date>=(s.starts_at AT TIME ZONE 'America/Edmonton')::date) THEN RAISE EXCEPTION 'Approved leave conflicts with a seeded assignment'; END IF; END $$;")
    # Exact row counts are calculated in the database, not assumed from the plan.
    manifest={'name':RUN,'from':plan['from'],'toExclusive':plan['toExclusive'],'generatedAt':plan['generatedAt'],'employees':25,'historicalPayroll':'Approved-attendance gross-pay estimates; no payments or net-pay records created'}
    statements.append(f"INSERT INTO cloud_demo_fixture_runs(name,manifest) SELECT {run},{sql(json.dumps(manifest))}::jsonb || jsonb_build_object('counts',(SELECT jsonb_object_agg(kind,total) FROM (SELECT kind,count(*) total FROM cloud_demo_fixture_records WHERE run_name={run} GROUP BY kind) c),'attendanceByStatus',(SELECT jsonb_object_agg(status,total) FROM (SELECT t.status,count(*) total FROM time_entries t JOIN cloud_demo_fixture_records r ON r.record_id=t.id AND r.kind='attendance' AND r.run_name={run} GROUP BY t.status) a));")
    return '\n'.join(statements)+'\n'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--at',help='Reproduce a fixed UTC timestamp for fixture testing.')
    args=parser.parse_args()
    now=datetime.fromisoformat(args.at) if args.at else datetime.now(timezone.utc).replace(microsecond=0)
    plan=build_plan(json.loads((PRIVATE/'operations-inspection.json').read_text()),now)
    (PRIVATE/'operations-plan.json').write_text(json.dumps(plan,indent=2));(PRIVATE/'operations-plan.json').chmod(0o600)
    source=build_sql(plan)
    (PRIVATE/'operations.sql').write_text(source);(PRIVATE/'operations.sql').chmod(0o600)
    print(json.dumps({key:plan[key] for key in ['name','from','toExclusive','plannedCounts']},indent=2))
    print(f'Generated {len(source):,} SQL bytes. No AWS records have been changed.')

if __name__=='__main__':main()
