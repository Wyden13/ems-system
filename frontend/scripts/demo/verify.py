#!/usr/bin/env python3
"""Verify real local logins, role scopes, fixture integrity, and a manual attendance lifecycle."""
import json
import time
import urllib.parse
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from seed import API, PRIVATE, SECRET, ZONE, psql, stamp

manifest = json.loads((PRIVATE / 'manifest.json').read_text())
admin = API(SECRET['BOOTSTRAP_ADMIN_EMAIL'], SECRET['BOOTSTRAP_ADMIN_PASSWORD'])
assert admin.request('/api/employees?size=100')['totalElements'] == 100
assert admin.request('/api/v1/admin/accounts?size=100')['totalElements'] == 100
assert len(admin.request('/api/locations')) == 3
assert len(admin.request('/api/departments')) == 6
query = '?' + urllib.parse.urlencode({'from': stamp(datetime.fromisoformat(manifest['from']).date(), 0).isoformat(), 'to': stamp(datetime.fromisoformat(manifest['toExclusive']).date(), 0).isoformat()})
verified = []
for worker in [row for row in manifest['staff'] if row['demoRole'] != 'EMPLOYEE'] + [next(row for row in manifest['staff'] if row['demoRole'] == 'EMPLOYEE')]:
    client = API(worker['loginEmail'], SECRET['BOOTSTRAP_ADMIN_PASSWORD'] if worker['loginEmail'] == SECRET['BOOTSTRAP_ADMIN_EMAIL'] else SECRET['DEMO_ACCOUNT_PASSWORD'])
    me = client.request('/api/v1/accounts/me')
    assert me['id'] == worker['accountId'] and me['role'] == worker['demoRole']
    rates = client.request('/api/shifts/wage-estimates' + query)['estimates']
    allowed = {row['employeeId'] for row in rates}
    assert len(allowed) == 100 if worker['demoRole'] in ('MANAGER', 'ADMIN') else allowed == {worker['id']}
    selectors = client.request('/api/shifts/options')['people']
    assert all('payRate' not in person and 'hourlyRate' not in person for person in selectors)
    visible = client.request('/api/shifts' + query)
    if worker['demoRole'] == 'SUPERVISOR': assert all(shift['departmentId'] == worker['departmentId'] for shift in visible)
    if worker['demoRole'] == 'EMPLOYEE': assert all(all(assignment['employeeId'] == worker['id'] for assignment in shift['assignments']) for shift in visible)
    verified.append({'role': worker['demoRole'], 'email': worker['loginEmail'], 'wageScope': 'all' if len(allowed) > 1 else 'self'})
    if len(verified) % 5 == 0: print(f'Verified real login and wage scope for {len(verified)} accounts.', flush=True)
# Historical fixtures must be internally consistent and have no overlapping active assignments.
assert psql("SELECT count(*) FROM shift_assignments a JOIN shift_assignments b ON a.employee_id=b.employee_id AND a.id<b.id JOIN shifts x ON x.id=a.shift_id JOIN shifts y ON y.id=b.shift_id WHERE a.status IN ('ASSIGNED','ACCEPTED') AND b.status IN ('ASSIGNED','ACCEPTED') AND x.status<>'CANCELLED' AND y.status<>'CANCELLED' AND x.starts_at<y.ends_at AND y.starts_at<x.ends_at;").strip() == '0'
assert psql("SELECT count(*) FROM leave_holds h JOIN shift_assignments a ON a.employee_id=h.employee_id JOIN shifts s ON s.id=a.shift_id WHERE a.status IN ('ASSIGNED','ACCEPTED') AND s.status<>'CANCELLED' AND (s.starts_at AT TIME ZONE 'America/Edmonton')::date<=h.end_date AND (s.ends_at AT TIME ZONE 'America/Edmonton')::date>=h.start_date;").strip() == '0'
# Exercise actual clock-in/out and another person's manager approval, leaving an audited demo record.
worker = next(row for row in manifest['staff'] if row['demoRole'] == 'EMPLOYEE')
client = API(worker['loginEmail'], SECRET['DEMO_ACCOUNT_PASSWORD'])
assert not client.request('/api/time-entries/state').get('active')
entry = client.request('/api/time-entries/clock-in', {'requestId': str(uuid.uuid4())})
time.sleep(1.2)
completed = client.request('/api/time-entries/clock-out', {'entryId': entry['id']})
assert completed['status'] == 'PENDING_APPROVAL'
manager_worker = next(row for row in manifest['staff'] if row['demoRole'] == 'MANAGER')
manager = API(manager_worker['loginEmail'], SECRET['DEMO_ACCOUNT_PASSWORD'])
approved = manager.request(f'/api/time-entries/{entry["id"]}/approve', {'version': completed['version'], 'comment': 'Local retail demo end-to-end verification'})
assert approved['status'] == 'APPROVED' and approved['workedSeconds'] >= 1
assert len(manager.request(f'/api/time-entries/{entry["id"]}/history')) >= 1
report = manager.request('/api/shifts/wage-estimates' + query)
for estimate in report['estimates']:
    assert Decimal(str(estimate['scheduledGrossPay'])) == (Decimal(str(estimate['hourlyRate'])) * Decimal(estimate['scheduledSeconds']) / Decimal(3600)).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
    assert Decimal(str(estimate['approvedWorkedGrossPay'])) == (Decimal(str(estimate['hourlyRate'])) * Decimal(estimate['approvedWorkedSeconds']) / Decimal(3600)).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
# Confirm that normal public scheduling APIs work after the historical import.
previous = json.loads((PRIVATE / 'verification.json').read_text()) if (PRIVATE / 'verification.json').exists() else {}
check_shift_id = previous.get('schedulingLifecycle', {}).get('shiftId')
if check_shift_id:
    scheduled = manager.request(f'/api/shifts/{check_shift_id}')
else:
    future_day = datetime.fromisoformat(manifest['from']).date() + timedelta(days=21)
    options = manager.request('/api/shifts/options')
    department = next(row for row in options['departments'] if row['id'] == worker['departmentId'])
    category = next(row for row in manager.request('/api/shift-categories') if row['name'] == 'Retail opening')
    scheduled = manager.request('/api/shifts', {'categoryId': category['id'], 'departmentId': department['id'], 'locationId': department['locationId'], 'startsAt': stamp(future_day, 7).isoformat(), 'endsAt': stamp(future_day, 15).isoformat(), 'requiredEmployees': 2})
    scheduled = manager.request(f'/api/shifts/{scheduled["id"]}/assign', {'employeeId': worker['id'], 'version': scheduled['version']})
    scheduled = manager.request(f'/api/shifts/{scheduled["id"]}/publish', {'version': scheduled['version']})
assert scheduled['status'] == 'PUBLISHED'
assert any(row['employeeId'] == worker['id'] and row['status'] in ('ASSIGNED','ACCEPTED') for row in scheduled['assignments'])
result = {'realAccountLoginsVerified': len(verified), 'verifiedRoleCounts': {role: sum(row['role'] == role for row in verified) for role in ['ADMIN','MANAGER','SUPERVISOR','EMPLOYEE']}, 'wagePrivacyVerified': True, 'scheduleDepartmentScopesVerified': True, 'overlappingAssignments': 0, 'approvedPtoConflicts': 0, 'attendanceLifecycle': {'employee': worker['loginEmail'], 'entryId': entry['id'], 'status': approved['status']}, 'baseWageCalculationsVerified': len(report['estimates']), 'schedulingLifecycle': {'shiftId': scheduled['id'], 'status': scheduled['status'], 'assignedEmployee': worker['loginEmail']}}
(PRIVATE / 'verification.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2), flush=True)
