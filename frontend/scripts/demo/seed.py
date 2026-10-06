#!/usr/bin/env python3
"""Seed only the dedicated ems-retail-demo project with fictional API accounts and historical fixtures."""
import csv
import http.cookiejar
import json
import os
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, date, time as walltime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / '.demo.local'
ENV = PRIVATE / 'environment.env'
BASE = 'http://localhost:28080'
ZONE = ZoneInfo('America/Edmonton')
COMPOSE = ['docker', 'compose', '--env-file', str(ENV), '-f', str(ROOT / 'scripts/demo/compose.yml')]
SECRET = dict(line.split('=', 1) for line in ENV.read_text().splitlines() if '=' in line)

class API:
    def __init__(self, email, password):
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.token = None
        self.email, self.password = email, password
        self.login()
    def request(self, path, data=None, headers=None, method=None):
        h = {'Content-Type': 'application/json', **(headers or {})}
        if self.token:
            h['Authorization'] = 'Bearer ' + self.token
        req = urllib.request.Request(BASE + path, headers=h, data=json.dumps(data).encode() if data is not None else None, method=method)
        try:
            with self.opener.open(req, timeout=45) as response:
                raw = response.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as error:
            if error.code == 401 and self.token:
                self.token = None
                self.login()
                return self.request(path, data, headers, method)
            raise RuntimeError(f'{method or ("POST" if data is not None else "GET")} {path}: {error.code} {error.read().decode()}') from error
    def login(self):
        csrf = self.request('/api/v1/auth/csrf')
        self.token = self.request('/api/v1/auth/login', {'email': self.email, 'password': self.password}, {csrf['headerName']: csrf['token']})['accessToken']
    def named(self, path, data):
        return next((row for row in self.request(path) if row['name'] == data['name']), None) or self.request(path, data)

def sql(value):
    if value is None: return 'NULL'
    if isinstance(value, bool): return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)): return str(value)
    return "'" + str(value).replace("'", "''") + "'"

def insert(table, values, returning=None):
    command = f'INSERT INTO {table} ({",".join(values)}) VALUES ({",".join(sql(v) for v in values.values())})'
    return command + (f' RETURNING {returning}' if returning else '')

def stamp(day, hour):
    return datetime.combine(day, walltime(hour), ZONE).astimezone(timezone.utc)

def psql(command):
    return subprocess.run(COMPOSE + ['exec', '-T', 'postgres', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'ems_workforce_db', '-At'], input=command, text=True, capture_output=True, check=True).stdout


def main():
    config = json.loads(subprocess.check_output(COMPOSE + ['config', '--format', 'json'], text=True))
    if config['name'] != 'ems-retail-demo':
        raise RuntimeError('Refusing to seed any project other than ems-retail-demo.')
    PRIVATE.mkdir(exist_ok=True)
    os.chmod(PRIVATE, 0o700)
    api = API(SECRET['BOOTSTRAP_ADMIN_EMAIL'], SECRET['BOOTSTRAP_ADMIN_PASSWORD'])
    locations = [api.named('/api/locations', {'name': 'Prairie Market · ' + city}) for city in ['Edmonton', 'Calgary', 'Red Deer']]
    departments = [api.named('/api/departments', {'name': city + ' · ' + team, 'locationId': locations[index]['id']}) for index, city in enumerate(['Edmonton', 'Calgary', 'Red Deer']) for team in ['Sales floor', 'Stockroom']]
    categories = [api.named('/api/shift-categories', {'name': name, 'color': color, 'defaultStartTime': start, 'defaultEndTime': end}) for name, color, start, end in [('Retail opening', '#5B4BE1', '07:00', '15:00'), ('Retail closing', '#C47608', '14:00', '22:00'), ('Overnight inventory', '#167B80', '22:00', '06:00')]]
    pto_type = api.named('/api/pto/types', {'name': 'Retail demo vacation', 'paid': True, 'accrualRatePerPeriod': 0, 'maxCarryover': 0})
    firsts = ['Avery', 'Jordan', 'Maya', 'Noah', 'Priya', 'Ethan', 'Sofia', 'Jamie', 'Alex', 'Taylor']
    lasts = ['Morgan', 'Chen', 'Patel', 'Brooks', 'Reed', 'Shah', 'Kim', 'Bennett', 'Wilson', 'Lee']
    staff, accounts = [], []
    counters = {'ADMIN': 0, 'MANAGER': 0, 'SUPERVISOR': 0, 'EMPLOYEE': 0}
    for index in range(100):
        role = 'ADMIN' if index < 3 else 'MANAGER' if index < 9 else 'SUPERVISOR' if index < 21 else 'EMPLOYEE'
        counters[role] += 1
        number = counters[role]
        email = f'{role.lower()}{number}@prairie.demo.test'
        department_index = index * 2 if role == 'ADMIN' else number - 1 if role == 'MANAGER' else (number - 1) // 2 if role == 'SUPERVISOR' else (number - 1) % 6
        password = SECRET['BOOTSTRAP_ADMIN_PASSWORD'] if index == 0 else SECRET['DEMO_ACCOUNT_PASSWORD']
        query = urllib.parse.urlencode({'search': email, 'size': 100})
        account = next((row for row in api.request('/api/v1/admin/accounts?' + query)['content'] if row['email'] == email), None)
        if account is None:
            account = api.request('/api/v1/admin/accounts', {'email': email, 'password': password, 'role': role})
        worker = next((row for row in api.request('/api/employees?' + query)['content'] if row['email'] == email), None)
        title = 'Regional administrator' if role == 'ADMIN' else 'Store manager' if role == 'MANAGER' else 'Team supervisor' if role == 'SUPERVISOR' else 'Sales associate' if department_index % 2 == 0 else 'Inventory associate'
        rate = {'ADMIN': 42, 'MANAGER': 34, 'SUPERVISOR': 27, 'EMPLOYEE': 18}[role] + (index % 5) * 0.75
        if worker is None:
            worker = api.request('/api/employees', {'firstName': firsts[index % 10], 'lastName': lasts[index // 10], 'email': email, 'phoneNumber': f'+1 780 555 {100 + index:04d}', 'hireDate': '2026-01-05', 'departmentId': departments[department_index]['id'], 'role': role, 'userAccountId': account['id'], 'payRate': f'{rate:.2f}', 'jobTitle': title})
        assert worker['userAccountId'] == account['id'] and account['role'] == role
        worker.update({'accountId': account['id'], 'loginEmail': email, 'demoRole': role, 'departmentIndex': department_index})
        staff.append(worker)
        accounts.append({'email': email, 'password': password, 'role': role, 'employeeNumber': worker['employeeNumber'], 'department': departments[department_index]['name']})
        if (index + 1) % 20 == 0: print(f'Created/verified {index + 1}/100 linked employees and accounts.', flush=True)
    with (PRIVATE / 'accounts.csv').open('w') as file:
        writer = csv.DictWriter(file, fieldnames=list(accounts[0]))
        writer.writeheader(); writer.writerows(accounts)
    os.chmod(PRIVATE / 'accounts.csv', 0o600)
    now = datetime.now(timezone.utc).replace(microsecond=0)
    today = now.astimezone(ZONE).date()
    saturday = today - timedelta(days=(today.weekday() - 5) % 7)
    first = saturday - timedelta(days=14)
    last = saturday + timedelta(days=14)
    psql('CREATE TABLE IF NOT EXISTS demo_fixture_runs (name TEXT PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT now());')
    if psql("SELECT name FROM demo_fixture_runs WHERE name='prairie-retail-v1';").strip():
        print('Demo history already exists; preserving all manual changes.', flush=True)
        return
    if int(psql('SELECT count(*) FROM shifts;').strip()):
        raise RuntimeError('The dedicated demo database already contains schedules without a seed marker; refusing to mix or reset data.')
    statements = ['BEGIN;']
    managers = [worker for worker in staff if worker['demoRole'] == 'MANAGER']
    reviewer = managers[0]['accountId']
    admin = staff[0]['accountId']
    counts = {'shifts': 0, 'assignments': 0, 'timeEntries': 0, 'lateArrivals': 0, 'missedClockOuts': 0, 'pendingAttendance': 0, 'ptoRequests': 0}
    # Preplanned approved PTO excludes those workers from the affected dates.
    leave_days = {}
    leave_workers = [worker for worker in staff if worker['demoRole'] == 'EMPLOYEE'][12:18]
    for offset, worker in enumerate(leave_workers):
        day = saturday + timedelta(days=offset % 6)
        leave_days[(worker['id'], day)] = True
        state = 'APPROVED' if offset < 3 else 'PENDING' if offset < 5 else 'REJECTED'
        if state != 'APPROVED': leave_days.pop((worker['id'], day))
        values = {'employee_id': worker['id'], 'pto_type_id': pto_type['id'], 'start_date': day, 'end_date': day, 'hours': 8, 'status': state, 'request_key': str(uuid.uuid5(uuid.NAMESPACE_URL, 'retail-pto-' + str(worker['id']))), 'reason': 'Fictional demo family commitment', 'reason_category': 'Personal', 'request_unit': 'HOURS', 'requested_amount': 8, 'employee_signature': worker['firstName'] + ' ' + worker['lastName'], 'signed_at': now.isoformat(), 'comment': 'Seeded demo leave scenario', 'reviewed_by': reviewer if state != 'PENDING' else None, 'reviewed_at': now.isoformat() if state != 'PENDING' else None}
        statements.append('WITH request AS (' + insert('pto_requests', values, 'id') + ") INSERT INTO pto_audits(request_id,action,actor,reason) SELECT id,'CREATE'," + sql(worker['accountId']) + ",'Seeded demo request' FROM request;")
        counts['ptoRequests'] += 1
    for worker in staff:
        allocated, used, reserved = 80, 0, 0
        for offset, leaver in enumerate(leave_workers):
            if leaver['id'] == worker['id']:
                used = 8 if offset < 3 else 0
                reserved = 8 if 3 <= offset < 5 else 0
        statements.append(insert('pto_balances', {'employee_id': worker['id'], 'pto_type_id': pto_type['id'], 'accrued_hours': allocated, 'used_hours': used, 'reserved_hours': reserved}) + ';')
        statements.append(insert('pto_ledger_entries', {'employee_id': worker['id'], 'pto_type_id': pto_type['id'], 'hours_delta': allocated, 'entry_type': 'ADJUSTMENT', 'occurred_at': now.isoformat(), 'actor': admin, 'reason': 'Fictional opening allocation', 'request_key': str(uuid.uuid5(uuid.NAMESPACE_URL, 'retail-allocation-' + str(worker['id'])))}) + ';')
    statements.append("INSERT INTO leave_holds(request_id,employee_id,start_date,end_date) SELECT id,employee_id,start_date,end_date FROM pto_requests WHERE status='APPROVED';")
    statements.append("INSERT INTO pto_ledger_entries(employee_id,pto_type_id,hours_delta,entry_type,source_request_id,occurred_at,actor,reason) SELECT employee_id,pto_type_id,-hours,'USAGE',id,now(),reviewed_by,'Seeded approved vacation' FROM pto_requests WHERE status='APPROVED';")
    statements.append("INSERT INTO pto_audits(request_id,action,actor,reason) SELECT id,status,reviewed_by,'Seeded review decision' FROM pto_requests WHERE status IN ('APPROVED','REJECTED');")
    open_employees = set()
    scenarios = []
    for day_offset in range(28):
        day = first + timedelta(days=day_offset)
        for department_index, department in enumerate(departments):
            team = [worker for worker in staff if worker['departmentIndex'] == department_index and worker['demoRole'] != 'ADMIN' and (worker['id'], day) not in leave_days]
            # Stagger days off and rotate staff without overlapping assignments.
            team = [worker for worker in team if (day_offset + worker['id']) % 7 not in (0, 1)]
            for category_index, category in enumerate(categories):
                if category_index == 2 and department_index % 2 == 0: continue
                assigned = [worker for worker in team if worker['id'] % (3 if department_index % 2 else 2) == category_index and not (category_index == 2 and (worker['id'], day + timedelta(days=1)) in leave_days)]
                starts = stamp(day, [7, 14, 22][category_index])
                ends = starts + timedelta(hours=8)
                future = starts > now
                state = 'DRAFT' if future and (day_offset + department_index + category_index) % 9 == 0 else 'PUBLISHED'
                cancelled = future and (day_offset + department_index + category_index) % 23 == 0
                if cancelled: state = 'CANCELLED'
                unfilled = 1 if (day_offset + department_index) % 5 == 0 and not cancelled else 0
                values = {'shift_category_id': category['id'], 'department_id': department['id'], 'location_id': department['locationId'], 'starts_at': starts.isoformat(), 'ends_at': ends.isoformat(), 'required_employees': max(1, len(assigned) + unfilled), 'status': state}
                shift_id = counts['shifts'] + 1
                values['id'] = shift_id
                statements.append(insert('shifts', values) + ';')
                counts['shifts'] += 1
                for worker in assigned:
                    assignment_state = 'CANCELLED' if cancelled else 'DECLINED' if future and (worker['id'] + day_offset) % 29 == 0 else 'ASSIGNED' if future else 'ACCEPTED'
                    statements.append(insert('shift_assignments', {'shift_id': shift_id, 'employee_id': worker['id'], 'status': assignment_state, 'responded_at': starts.isoformat() if assignment_state == 'ACCEPTED' else None}) + ';')
                    counts['assignments'] += 1
                    if state != 'PUBLISHED' or assignment_state in ('DECLINED', 'CANCELLED') or starts >= now: continue
                    if worker['id'] % 17 == 0 and day_offset % 8 == 0: continue  # missed attendance
                    late = 15 if (worker['id'] + day_offset) % 13 == 0 else 0
                    clock_in = starts + timedelta(minutes=late)
                    if clock_in >= now: continue
                    clock_out = ends - timedelta(minutes=5 if worker['id'] % 11 == 0 else 0)
                    missed = ends < now and worker['id'] % 19 == 0 and day_offset >= 14 and worker['id'] not in open_employees
                    active = starts <= now < ends and worker['id'] not in open_employees
                    # Keep at most one open record; stop producing later attendance until corrected.
                    if worker['id'] in open_employees: continue
                    status = 'OPEN' if missed or active else 'PENDING_APPROVAL' if (worker['id'] + day_offset) % 11 == 0 else 'REJECTED' if (worker['id'] + day_offset) % 47 == 0 else 'APPROVED'
                    if status == 'OPEN': open_employees.add(worker['id'])
                    seconds = 0 if status == 'OPEN' else int((clock_out - clock_in).total_seconds())
                    entry_id = counts['timeEntries'] + 1
                    statements.append(insert('time_entries', {'id': entry_id, 'employee_id': worker['id'], 'clock_in': clock_in.isoformat(), 'clock_out': None if status == 'OPEN' else clock_out.isoformat(), 'source': 'WEB', 'status': status, 'worked_seconds': seconds, 'worked_minutes': seconds // 60, 'request_id': str(uuid.uuid5(uuid.NAMESPACE_URL, f'retail-clock-{entry_id}'))}) + ';')
                    if status in ('APPROVED', 'REJECTED'):
                        statements.append(insert('attendance_audits', {'entry_id': entry_id, 'reviewer': reviewer if worker['accountId'] != reviewer else managers[1]['accountId'], 'action': 'APPROVE' if status == 'APPROVED' else 'REJECT', 'reason': 'Seeded fictional attendance review', 'old_clock_in': clock_in.isoformat(), 'old_clock_out': clock_out.isoformat(), 'new_clock_in': clock_in.isoformat(), 'new_clock_out': clock_out.isoformat(), 'old_status': 'PENDING_APPROVAL', 'new_status': status, 'occurred_at': min(now, clock_out + timedelta(minutes=20)).isoformat()}) + ';')
                    counts['timeEntries'] += 1
                    counts['lateArrivals'] += int(late > 0)
                    counts['missedClockOuts'] += int(missed)
                    counts['pendingAttendance'] += int(status == 'PENDING_APPROVAL')
                    if missed: scenarios.append({'scenario': 'Missed clock-out', 'email': worker['loginEmail'], 'entryId': entry_id})
                    if status == 'PENDING_APPROVAL' and len(scenarios) < 12: scenarios.append({'scenario': 'Pending attendance review', 'email': worker['loginEmail'], 'entryId': entry_id})
    # Weekly preferences are advisory, compatible with both ordinary and overnight shifts.
    for worker in staff:
        if worker['demoRole'] == 'ADMIN': continue
        for weekday in ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']:
            statements.append(insert('employee_availability', {'employee_id': worker['id'], 'day_of_week': weekday, 'start_time': '07:00', 'end_time': '22:00', 'type': 'AVAILABLE'}) + ';')
    statements += ["SELECT setval(pg_get_serial_sequence('shifts','id'), (SELECT max(id) FROM shifts));", "SELECT setval(pg_get_serial_sequence('time_entries','id'), (SELECT max(id) FROM time_entries));", "INSERT INTO demo_fixture_runs(name) VALUES ('prairie-retail-v1');", 'COMMIT;']
    psql('\n'.join(statements))
    manifest = {'organization': 'Prairie Market', 'employees': 100, 'accountsByRole': counters, 'locations': [row['name'] for row in locations], 'departments': [row['name'] for row in departments], 'from': first.isoformat(), 'toExclusive': last.isoformat(), 'seededAt': now.isoformat(), 'counts': counts, 'scenarios': scenarios, 'staff': staff}
    (PRIVATE / 'manifest.json').write_text(json.dumps(manifest, indent=2))
    os.chmod(PRIVATE / 'manifest.json', 0o600)
    print(json.dumps({key: value for key, value in manifest.items() if key not in ('staff', 'scenarios')}, indent=2), flush=True)
    print('Private account credentials: .demo.local/accounts.csv', flush=True)

if __name__ == '__main__': main()
