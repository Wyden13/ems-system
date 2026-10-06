#!/usr/bin/env python3
"""Add a labeled fictional retail dataset through the deployed EMS API, preserving existing records."""
import argparse
import csv
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import urllib.parse

ROOT = Path(__file__).resolve().parents[2]
BASE = 'https://d2z6z22jatofwt.cloudfront.net'
PRIVATE = ROOT / '.cloud-demo.local'
CREDENTIALS = ROOT.parent / 'ems-services/.local/aws-admin-credentials.txt'

class CloudAPI:
    def __init__(self, email, password):
        self.token = None
        self.email, self.password = email, password
        self.cookies = tempfile.NamedTemporaryFile(prefix='ems-cloud-demo-cookies-', delete=False)
        self.cookies.close()
        os.chmod(self.cookies.name, 0o600)
        self.login()
    def request(self, path, data=None, extra=None, method=None, retry=True):
        method = method or ('POST' if data is not None else 'GET')
        headers = ['Origin: ' + BASE, 'Content-Type: application/json'] + list(extra or [])
        if self.token: headers.append('Authorization: Bearer ' + self.token)
        # Pass credentials/tokens via private config and stdin rather than command arguments or logs.
        with tempfile.NamedTemporaryFile(mode='w', prefix='ems-cloud-demo-request-', delete=True) as config:
            for header in headers: config.write('header = ' + json.dumps(header) + '\n')
            config.flush()
            command = ['/usr/bin/curl', '-q', '-sS', '--max-time', '45', '--config', config.name, '--cookie', self.cookies.name, '--cookie-jar', self.cookies.name, '-X', method, '-w', '\n%{http_code}']
            if data is not None: command += ['--data-binary', '@-']
            command.append(BASE + path)
            result = subprocess.run(command, input=None if data is None else json.dumps(data), capture_output=True, text=True)
        if result.returncode: raise RuntimeError(f'{method} {path.split("?")[0]}: cloud connection failed')
        body, _, status = result.stdout.rpartition('\n')
        code = int(status)
        if code == 401 and self.token and retry:
            self.token = None; self.login()
            return self.request(path, data, extra, method, False)
        if not 200 <= code < 300: raise RuntimeError(f'{method} {path.split("?")[0]} failed with HTTP {code}')
        return json.loads(body) if body else None
    def login(self):
        csrf = self.request('/api/v1/auth/csrf')
        self.token = self.request('/api/v1/auth/login', {'email': self.email, 'password': self.password}, [csrf['headerName'] + ': ' + csrf['token']])['accessToken']
    def close(self):
        try:
            csrf = self.request('/api/v1/auth/csrf')
            self.request('/api/v1/auth/logout', {}, [csrf['headerName'] + ': ' + csrf['token']])
        finally: Path(self.cookies.name).unlink(missing_ok=True)
    def named(self, path, data):
        rows = self.request(path)
        match = next((row for row in rows if row['name'] == data['name']), None)
        if match:
            if 'locationId' in data and match['locationId'] != data['locationId']: raise RuntimeError('Existing demo department belongs to a different location; nothing was overwritten.')
            return match, False
        return self.request(path, data), True


def administrator():
    values = {}
    for line in CREDENTIALS.read_text().splitlines():
        if ': ' in line:
            key, value = line.split(': ', 1); values[key] = value
    if not values.get('Email') or not values.get('Temporary password'): raise RuntimeError('The saved cloud administrator credentials are missing.')
    return values['Email'], values['Temporary password']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inspect', action='store_true', help='Authenticate and inspect counts only; create no records.')
    args = parser.parse_args()
    email, password = administrator()
    api = CloudAPI(email, password)
    try:
        me = api.request('/api/v1/accounts/me')
        if me['role'] != 'ADMIN': raise RuntimeError('Cloud administrator access is required.')
        before = {'employees': api.request('/api/employees?size=1')['totalElements'], 'accounts': api.request('/api/v1/admin/accounts?size=1')['totalElements'], 'locations': len(api.request('/api/locations')), 'departments': len(api.request('/api/departments'))}
        if args.inspect:
            print(json.dumps({'gateway': BASE, 'authenticatedRole': me['role'], 'existingCounts': before, 'existingLocationNames': [row['name'] for row in api.request('/api/locations')], 'existingDepartmentNames': [row['name'] for row in api.request('/api/departments')]}, indent=2)); return
        PRIVATE.mkdir(exist_ok=True); PRIVATE.chmod(0o700)
        created = {'employees': 0, 'accounts': 0, 'locations': 0, 'departments': 0}
        locations = []
        for city in ['Edmonton', 'Calgary']:
            row, new = api.named('/api/locations', {'name': 'Cloud Demo · Prairie Market · ' + city})
            locations.append(row); created['locations'] += int(new)
        departments = []
        for index, city in enumerate(['Edmonton', 'Calgary']):
            for team in ['Sales floor', 'Stockroom']:
                row, new = api.named('/api/departments', {'name': 'Cloud Demo · ' + city + ' · ' + team, 'locationId': locations[index]['id']})
                departments.append(row); created['departments'] += int(new)
        existing_credentials = {}
        if (PRIVATE / 'accounts.csv').exists():
            with (PRIVATE / 'accounts.csv').open() as file:
                existing_credentials = {row['email']: row['password'] for row in csv.DictReader(file)}
        firsts = ['Avery', 'Jordan', 'Maya', 'Noah', 'Priya', 'Ethan', 'Sofia', 'Jamie', 'Alex', 'Taylor']
        lasts = ['Morgan', 'Chen', 'Patel']
        counters = {'ADMIN': 0, 'MANAGER': 0, 'SUPERVISOR': 0, 'EMPLOYEE': 0}
        staff, credentials = [], []
        for index in range(25):
            role = 'ADMIN' if index < 2 else 'MANAGER' if index < 4 else 'SUPERVISOR' if index < 8 else 'EMPLOYEE'
            counters[role] += 1
            number = counters[role]
            login = f'cloud-demo.{role.lower()}{number}@prairie.demo.test'
            department_index = index * 2 if role == 'ADMIN' else (number - 1) * 2 if role == 'MANAGER' else number - 1 if role == 'SUPERVISOR' else (number - 1) % 4
            query = '?' + urllib.parse.urlencode({'search': login, 'size': 100})
            account = next((row for row in api.request('/api/v1/admin/accounts' + query)['content'] if row['email'] == login), None)
            account_password = existing_credentials.get(login)
            if account is None:
                account_password = 'RetailDemo2026!' + secrets.token_hex(8)
                account = api.request('/api/v1/admin/accounts', {'email': login, 'password': account_password, 'role': role})
                created['accounts'] += 1
                # Record each generated credential immediately so interrupted runs can resume safely.
                existing_credentials[login] = account_password
                save_credentials(PRIVATE / 'accounts.csv', [{'email': key, 'password': value} for key, value in existing_credentials.items()])
            if account['role'] != role or account['status'] != 'ACTIVE': raise RuntimeError('An existing demo login has changed role/status; it was not overwritten.')
            worker = next((row for row in api.request('/api/employees' + query)['content'] if row['email'] == login), None)
            rate = {'ADMIN': 42, 'MANAGER': 34, 'SUPERVISOR': 27, 'EMPLOYEE': 18}[role] + index % 5 * .75
            title = {'ADMIN': 'Demo regional administrator', 'MANAGER': 'Demo store manager', 'SUPERVISOR': 'Demo team supervisor', 'EMPLOYEE': 'Demo sales associate' if department_index % 2 == 0 else 'Demo inventory associate'}[role]
            if worker is None:
                worker = api.request('/api/employees', {'firstName': firsts[index % 10], 'lastName': lasts[index // 10], 'email': login, 'phoneNumber': f'+1 587 555 {100 + index:04d}', 'hireDate': '2026-01-05', 'departmentId': departments[department_index]['id'], 'role': role, 'userAccountId': account['id'], 'payRate': f'{rate:.2f}', 'jobTitle': title})
                created['employees'] += 1
            if worker['userAccountId'] != account['id'] or worker['departmentId'] != departments[department_index]['id'] or not worker['active']: raise RuntimeError('An existing demo employee differs from the seed; it was not overwritten.')
            staff.append(worker)
            credentials.append({'email': login, 'password': account_password or 'Existing password retained', 'role': role, 'employeeNumber': worker['employeeNumber'], 'department': departments[department_index]['name']})
            print(f'Cloud demo: verified {index + 1}/25 linked employees and accounts.', flush=True)
        save_credentials(PRIVATE / 'accounts.csv', credentials)
        directory = api.request('/api/shifts/options')
        assert {worker['id'] for worker in staff}.issubset({row['id'] for row in directory['people']})
        assert {row['id'] for row in departments}.issubset({row['id'] for row in directory['departments']})
        logins = 0
        for credential in credentials:
            if credential['password'] == 'Existing password retained': continue
            client = CloudAPI(credential['email'], credential['password'])
            try:
                verified = client.request('/api/v1/accounts/me')
                assert verified['role'] == credential['role']
                logins += 1
            finally: client.close()
        after = {'employees': api.request('/api/employees?size=1')['totalElements'], 'accounts': api.request('/api/v1/admin/accounts?size=1')['totalElements'], 'locations': len(api.request('/api/locations')), 'departments': len(api.request('/api/departments'))}
        result = {'gateway': BASE, 'dataset': 'Cloud Demo · Prairie Market', 'datasetCounts': {'employees': len(staff), 'accounts': len(credentials), 'locations': len(locations), 'departments': len(departments)}, 'roles': counters, 'createdThisRun': created, 'before': before, 'after': after, 'realLoginsVerified': logins, 'scheduleDirectoryVerified': True, 'locations': locations, 'departments': departments, 'employees': staff}
        (PRIVATE / 'manifest.json').write_text(json.dumps(result, indent=2)); (PRIVATE / 'manifest.json').chmod(0o600)
        print(json.dumps({key: value for key, value in result.items() if key not in ('employees','departments','locations')}, indent=2))
    finally: api.close()


def save_credentials(path, rows):
    with path.open('w') as file:
        writer = csv.DictWriter(file, fieldnames=list(rows[0])); writer.writeheader(); writer.writerows(rows)
    path.chmod(0o600)

if __name__ == '__main__': main()
