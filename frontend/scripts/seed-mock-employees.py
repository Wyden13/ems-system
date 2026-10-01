#!/usr/bin/env python3
"""Create 12 fictional employees in the local EMS app through its public API.

Repeated runs reuse the same mock emails. Credentials stay in memory and are
never included in the output. Run from frontend: python3 scripts/seed-mock-employees.py
"""

import argparse
import http.cookiejar
import json
import os
from pathlib import Path
import shlex
import sys
import urllib.error
import urllib.parse
import urllib.request


EMPLOYEES = [
    ('Alex', 'Morgan', 'Operations associate', '25.00'),
    ('Jamie', 'Chen', 'Operations associate', '26.50'),
    ('Priya', 'Shah', 'Senior associate', '30.00'),
    ('Sam', 'Wilson', 'Operations associate', '25.50'),
    ('Taylor', 'Reed', 'Customer support specialist', '27.00'),
    ('Jordan', 'Lee', 'Customer support specialist', '27.50'),
    ('Maya', 'Patel', 'Senior associate', '31.00'),
    ('Ethan', 'Brooks', 'Operations associate', '24.50'),
    ('Sofia', 'Martinez', 'Customer support specialist', '28.00'),
    ('Noah', 'Kim', 'Operations associate', '26.00'),
    ('Avery', 'Thompson', 'Senior associate', '30.50'),
    ('Olivia', 'Bennett', 'Customer support specialist', '28.50'),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://localhost:8080')
    parser.add_argument('--credentials-file', type=Path, default=Path(__file__).resolve().parents[2] / 'ems-services/.local/demo-admin.env')
    parser.add_argument('--department-id', type=int)
    args = parser.parse_args()
    base = args.base_url.rstrip('/')
    if urllib.parse.urlparse(base).hostname not in ('localhost', '127.0.0.1', '::1'):
        raise ValueError('This demo seed script targets a local EMS gateway.')

    credentials = {}
    if args.credentials_file.is_file():
        for line in args.credentials_file.read_text().splitlines():
            line = line.strip().removeprefix('export ')
            if not line or line.startswith('#') or '=' not in line:
                continue
            name, value = line.split('=', 1)
            parts = shlex.split(value, comments=True)
            if len(parts) == 1:
                credentials[name.strip()] = parts[0]
    email = os.environ.get('BOOTSTRAP_ADMIN_EMAIL') or credentials.get('BOOTSTRAP_ADMIN_EMAIL')
    password = os.environ.get('BOOTSTRAP_ADMIN_PASSWORD') or credentials.get('BOOTSTRAP_ADMIN_PASSWORD')
    if not email or not password:
        raise ValueError('Provide BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD or a demo admin credentials file.')

    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    token = None

    def api(path, data=None, extra_headers=None):
        headers = {'Content-Type': 'application/json', **(extra_headers or {})}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        request = urllib.request.Request(base + path, headers=headers, data=None if data is None else json.dumps(data).encode())
        try:
            with opener.open(request, timeout=20) as response:
                body = response.read()
                return json.loads(body) if body else None
        except urllib.error.HTTPError as error:
            # Authentication responses can contain private data; report status only.
            raise RuntimeError(f'{request.get_method()} {path.split("?")[0]} failed with HTTP {error.code}') from None

    csrf = api('/api/v1/auth/csrf')
    token = api('/api/v1/auth/login', {'email': email, 'password': password}, {csrf['headerName']: csrf['token']})['accessToken']
    if api('/api/v1/accounts/me')['role'] != 'ADMIN':
        raise ValueError('Employee creation requires the local administrator account.')

    departments = [d for d in api('/api/departments') if not d.get('archived')]
    department = next((d for d in departments if d['id'] == args.department_id), None) if args.department_id else next((d for d in departments if d['name'] == 'Demo operations'), departments[0] if departments else None)
    if department is None:
        raise ValueError('Choose an existing active department with --department-id.')

    workers = []
    created = 0
    for first, last, title, rate in EMPLOYEES:
        mock_email = f'mock.{first.lower()}.{last.lower()}@demo.test'
        query = urllib.parse.urlencode({'search': mock_email, 'size': 100})
        existing = api('/api/employees?' + query)['content']
        worker = next((w for w in existing if w['email'] == mock_email), None)
        if worker is None:
            worker = api('/api/employees', {
                'firstName': first, 'lastName': last, 'email': mock_email,
                'departmentId': department['id'], 'role': 'EMPLOYEE',
                'hireDate': '2026-01-01', 'payRate': rate, 'jobTitle': title,
            })
            created += 1
        if not worker['active']:
            raise ValueError(f'Mock employee {worker["employeeNumber"]} already exists but is inactive.')
        workers.append(worker)

    directory = {p['id'] for p in api('/api/shifts/options')['people']}
    if any(w['id'] not in directory for w in workers):
        raise RuntimeError('Some mock employees are missing from the schedule directory.')
    print(json.dumps({
        'created': created, 'reused': len(workers) - created, 'verifiedInSchedule': len(workers),
        'department': department['name'],
        'employees': [{'id': w['id'], 'employeeNumber': w['employeeNumber'], 'name': f'{w["firstName"]} {w["lastName"]}'} for w in workers],
    }, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError, urllib.error.URLError) as error:
        print(f'Mock employee seed failed: {error}', file=sys.stderr)
        sys.exit(1)
