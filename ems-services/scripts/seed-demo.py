#!/usr/bin/env python3
"""Idempotent disposable demo fixtures created through the public APIs."""
import http.cookiejar
import json
import os
import urllib.parse
import urllib.request
import uuid

BASE = os.environ.get('EMS_BASE_URL', 'http://localhost:18080').rstrip('/')
EMAIL = os.environ['BOOTSTRAP_ADMIN_EMAIL']
PASSWORD = os.environ['BOOTSTRAP_ADMIN_PASSWORD']
MOCK_PASSWORD = os.environ['DEMO_ACCOUNT_PASSWORD']
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
token = None


def api(path, data=None, headers=None):
    h = {'Content-Type': 'application/json', **(headers or {})}
    if token:
        h['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(BASE + path, headers=h,
                                    data=json.dumps(data).encode() if data is not None else None)
    with opener.open(request, timeout=30) as response:
        body = response.read()
        return json.loads(body) if body else None


def named(path, data):
    rows = api(path)
    return next((r for r in rows if r['name'] == data['name']), None) or api(path, data)


csrf = api('/api/v1/auth/csrf')
token = api('/api/v1/auth/login', {'email': EMAIL, 'password': PASSWORD},
            {csrf['headerName']: csrf['token']})['accessToken']
location = named('/api/locations', {'name': 'Demo office'})
department = named('/api/departments', {'name': 'Demo operations', 'locationId': location['id']})
workers = []
for role, label in [('SUPERVISOR', 'supervisor'), ('EMPLOYEE', 'employee')]:
    email = f'{label}@demo.test'
    query = urllib.parse.urlencode({'search': email})
    accounts = api('/api/v1/admin/accounts?' + query)['content']
    account = next((a for a in accounts if a['email'] == email), None)
    if account is None:
        account = api('/api/v1/admin/accounts', {'email': email, 'password': MOCK_PASSWORD, 'role': role})
    employees = api('/api/employees?' + query)['content']
    worker = next((e for e in employees if e['email'] == email), None)
    if worker is None:
        worker = api('/api/employees', {'firstName': 'Demo', 'lastName': label.title(), 'email': email,
                    'hireDate': '2026-01-01', 'departmentId': department['id'], 'role': role,
                    'userAccountId': account['id'], 'payRate': '25.00'})
    assert worker['userAccountId'] == account['id'] and worker['departmentId'] == department['id']
    workers.append(worker)
category = named('/api/shift-categories', {'name': 'Demo day', 'color': '#abcdef',
                 'defaultStartTime': '09:00', 'defaultEndTime': '17:00'})
pto = named('/api/pto/types', {'name': 'Demo vacation', 'paid': True,
            'accrualRatePerPeriod': 0, 'maxCarryover': 0})
api('/api/pto/balances/adjust', {'requestKey': str(uuid.uuid5(uuid.NAMESPACE_URL,
    f'ems-demo-opening:{workers[1]["id"]}:{pto["id"]}')), 'employeeId': workers[1]['id'],
    'ptoTypeId': pto['id'], 'hoursDelta': 40, 'reason': 'Disposable demo opening allocation'})
# A fixed future date makes repeat runs deterministic rather than creating daily fixtures.
start, end = '2030-10-01T15:00:00Z', '2030-10-01T23:00:00Z'
shifts = api('/api/shifts?' + urllib.parse.urlencode({'from': start, 'to': end}))
shift = next((s for s in shifts if s['shiftCategoryId'] == category['id'] and s['departmentId'] == department['id']), None)
if shift is None:
    shift = api('/api/shifts', {'categoryId': category['id'], 'departmentId': department['id'],
                'locationId': location['id'], 'startsAt': start, 'endsAt': end, 'requiredEmployees': 1})
if not any(a['employeeId'] == workers[1]['id'] and a['status'] != 'CANCELLED' for a in shift['assignments']):
    shift = api(f'/api/shifts/{shift["id"]}/assign', {'employeeId': workers[1]['id'], 'version': shift['version']})
if shift['status'] == 'DRAFT':
    shift = api(f'/api/shifts/{shift["id"]}/publish', {'version': shift['version']})
print(json.dumps({'employees': [w['employeeNumber'] for w in workers],
                  'departmentId': department['id'], 'publishedShiftId': shift['id'],
                  'ptoTypeId': pto['id'], 'accountLinksVerified': True}))
