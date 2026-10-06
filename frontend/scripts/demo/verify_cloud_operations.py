#!/usr/bin/env python3
"""Verify seeded AWS history, payroll estimates, original records, and role isolation."""
import csv
from datetime import datetime, timedelta
from decimal import Decimal
import importlib.util
import json
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT=Path(__file__).resolve().parents[2]
PRIVATE=ROOT/'.cloud-demo.local'
spec=importlib.util.spec_from_file_location('cloud_api',ROOT/'scripts/demo/seed-cloud.py')
cloud=importlib.util.module_from_spec(spec);spec.loader.exec_module(cloud)
ZONE=ZoneInfo('America/Edmonton')

def midnight(day):return datetime.fromisoformat(day).replace(tzinfo=ZONE).isoformat()

def ranged(api,path,first,last):
    start=datetime.fromisoformat(first).date();stop=datetime.fromisoformat(last).date();rows={}
    while start<stop:
        end=min(stop,start+timedelta(days=42))
        separator='&' if '?' in path else '?'
        for row in api.request(f'{path}{separator}from={midnight(start.isoformat())}&to={midnight(end.isoformat())}'):
            rows[row['id']]=row
        start=end
    return list(rows.values())

def main():
    plan=json.loads((PRIVATE/'operations-plan.json').read_text())
    before=json.loads((PRIVATE/'operations-inspection.json').read_text())
    people={row['id']:row for row in plan['staff']}
    expected={(row['employeeId'],datetime.fromisoformat(row['clockIn'])):row for row in plan['attendance']}
    admin=cloud.CloudAPI(*cloud.administrator())
    try:
        shifts=ranged(admin,'/api/shifts',plan['from'],plan['toExclusive'])
        after_shifts={row['id']:row for row in shifts}
        for row in before['shifts']:
            assert after_shifts[row['id']]==row,'An existing shift changed during verification.'
        categories=admin.request('/api/shift-categories')
        category_ids={row['id'] for row in categories if row['name'].startswith('Cloud Demo · ')}
        demo_shifts=[row for row in shifts if row['shiftCategoryId'] in category_ids]
        assert len(demo_shifts)==plan['plannedCounts']['shifts']
        attendance=[]
        for wid in people:
            rows=ranged(admin,f'/api/time-entries?employeeId={wid}',plan['from'],plan['toExclusive'])
            for row in rows:
                planned=expected.get((wid,datetime.fromisoformat(row['clockIn'])))
                if not planned:continue
                assert row['status']==planned['status']
                assert row['workedSeconds']==planned['workedSeconds']
                assert (datetime.fromisoformat(row['clockOut']) if row.get('clockOut') else None)==(datetime.fromisoformat(planned['clockOut']) if planned['clockOut'] else None)
                attendance.append(row)
        assert len(attendance)==plan['plannedCounts']['attendance']
        print(f'Verified {len(demo_shifts)} shifts and {len(attendance)} attendance entries through the cloud APIs.',flush=True)
        requests=[row for row in admin.request('/api/pto/requests') if row.get('reason','').startswith('Fictional business simulation:')]
        assert len(requests)==len(plan['requests'])
        for row in requests:
            assert row['requestUnit']=='DAYS' and row['hours']==row['requestedAmount']*8
            assert row['employeeSignature'] and row['signedAt']
        balance_count=0
        for wid in people:
            balances=admin.request(f'/api/pto/balances/employees/{wid}')
            ledger=admin.request(f'/api/pto/ledger/{wid}')
            for balance in [row for row in balances if row['ptoTypeName'].startswith('Cloud Demo · ')]:
                allocated=Decimal(str(balance['accruedHours']));used=Decimal(str(balance['usedHours']));reserved=Decimal(str(balance['reservedHours']));available=Decimal(str(balance['availableHours']))
                assert available==allocated-used-reserved and available>=0
                movement=sum(Decimal(str(row['hoursDelta'])) for row in ledger if row['ptoTypeId']==balance['ptoTypeId'])
                assert movement==available+reserved
                balance_count+=1
        assert balance_count==50
        historical=[]
        for start in ['2026-08-14','2026-08-28','2026-09-11','2026-09-25']:
            report=admin.request('/api/payroll/estimates?periodStart='+start)
            assert len(report['estimates'])==25
            total=sum(Decimal(str(row['grossPay'])) for row in report['estimates'])
            assert total>0
            overtime=sum(row['overtimeSeconds'] for row in report['estimates'])
            if start!='2026-09-25':assert not any(row['provisional'] for row in report['estimates'])
            historical.append({'periodStart':start,'periodEnd':report['periodEnd'],'grossPayCAD':str(total),'overtimeSeconds':overtime,'provisionalEmployees':sum(row['provisional'] for row in report['estimates'])})
        assert any(row['overtimeSeconds']>0 for row in historical)
        current=admin.request('/api/time-entries/current')
        assert len([row for row in current['employees'] if row['employeeId'] in people])==3
        statuses={status:sum(row['status']==status for row in attendance) for status in ['APPROVED','REJECTED','PENDING_APPROVAL','OPEN']}
        result={'dataset':plan['name'],'from':plan['from'],'toExclusive':plan['toExclusive'],'shifts':len(demo_shifts),'assignments':sum(len(row['assignments']) for row in demo_shifts),'attendance':len(attendance),'attendanceByStatus':statuses,'ptoRequests':len(requests),'balances':balance_count,'existingShiftsPreserved':len(before['shifts']),'historicalPayrollEstimates':historical}
    finally:admin.close()
    with (PRIVATE/'accounts.csv').open() as file:credentials={row['email']:row for row in csv.DictReader(file)}
    isolation=[]
    for role,email in [('EMPLOYEE','cloud-demo.employee1@prairie.demo.test'),('SUPERVISOR','cloud-demo.supervisor1@prairie.demo.test'),('MANAGER','cloud-demo.manager1@prairie.demo.test')]:
        worker=next(row for row in people.values() if row['email']==email)
        client=cloud.CloudAPI(email,credentials[email]['password'])
        try:
            account=client.request('/api/v1/accounts/me');assert account['role']==role
            report=client.request('/api/payroll/estimates?periodStart=2026-09-11')
            if role=='MANAGER':assert len(report['estimates'])==25
            else:
                assert [row['employeeId'] for row in report['estimates']]==[worker['id']]
                other=next(wid for wid in people if wid!=worker['id'])
                try:client.request(f'/api/payroll/estimates?periodStart=2026-09-11&employeeId={other}')
                except RuntimeError as failure:assert 'HTTP 403' in str(failure)
                else:raise AssertionError('Other-employee payroll was exposed.')
            own_shifts=ranged(client,'/api/shifts',plan['from'],plan['toExclusive'])
            if role=='EMPLOYEE':
                assert own_shifts and all(row['status']=='PUBLISHED' and row['assignments'] and all(a['employeeId']==worker['id'] for a in row['assignments']) for row in own_shifts)
            if role=='SUPERVISOR':assert own_shifts and all(row['departmentId']==worker['departmentId'] for row in own_shifts)
            own_requests=client.request('/api/pto/requests')
            if role=='EMPLOYEE':assert own_requests and all(row['employeeId']==worker['id'] for row in own_requests)
            if role=='SUPERVISOR':assert all(people[row['employeeId']]['departmentId']==worker['departmentId'] for row in own_requests)
            isolation.append({'role':role,'verified':True})
        finally:client.close()
    result['roleIsolation']=isolation
    output=PRIVATE/'operations-verification.json';output.write_text(json.dumps(result,indent=2));output.chmod(0o600)
    print(json.dumps(result,indent=2),flush=True)

if __name__=='__main__':main()
