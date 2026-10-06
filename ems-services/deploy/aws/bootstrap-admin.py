#!/usr/bin/env python3
"""Create the first EMS admin with a one-off Auth task and verify sign-in.

The application's bootstrap profile refuses to overwrite existing accounts or
create another admin when an active admin already exists.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time
from deploy import aws, CLUSTER, OUT, REGION, save

email = sys.argv[1].strip().lower()
verify_only = '--verify-only' in sys.argv[2:]
base = 'https://d2z6z22jatofwt.cloudfront.net'
secret_name = 'ems/dev/bootstrap/initial-admin'
try:
    value = json.loads(aws('secretsmanager', 'get-secret-value', '--secret-id', secret_name)['SecretString'])
    if value['email'] != email:
        raise RuntimeError('Existing bootstrap secret belongs to a different email; it was not modified.')
    secret_arn = aws('secretsmanager', 'describe-secret', '--secret-id', secret_name)['ARN']
except RuntimeError as error:
    if 'ResourceNotFoundException' not in str(error): raise
    value = {'email': email, 'password': secrets.token_urlsafe(30)}
    secret_arn = aws('secretsmanager', 'create-secret', payload={
        'Name': secret_name, 'SecretString': json.dumps(value)})['ARN']

credentials = OUT.parent / 'aws-admin-credentials.txt'
fd = os.open(credentials, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as f:
    f.write(f'EMS administrator\nSign in: {base}/login\nEmail: {email}\nTemporary password: {value["password"]}\n')
    f.write('After signing in, change the password from your profile.\n')
credentials.chmod(0o600)

task_arn = definition = None
if not verify_only:
    service = aws('ecs', 'describe-services', '--cluster', CLUSTER, '--services', 'auth-service')['services'][0]
    task = aws('ecs', 'describe-task-definition', '--task-definition', service['taskDefinition'])['taskDefinition']
    for key in ['taskDefinitionArn', 'revision', 'status', 'requiresAttributes', 'compatibilities', 'registeredAt', 'registeredBy', 'deregisteredAt']:
        task.pop(key, None)
    task['family'] = 'ems-initial-admin-bootstrap'
    app = next(c for c in task['containerDefinitions'] if c['name'] == 'app')
    app['environment'] = [e for e in app.get('environment', []) if e['name'] != 'BOOTSTRAP_ADMIN_EMAIL']
    app['environment'].append({'name': 'BOOTSTRAP_ADMIN_EMAIL', 'value': email})
    app['secrets'] = [s for s in app.get('secrets', []) if s['name'] != 'BOOTSTRAP_ADMIN_PASSWORD']
    app['secrets'].append({'name': 'BOOTSTRAP_ADMIN_PASSWORD', 'valueFrom': secret_arn + ':password::'})
    app['command'] = ['--spring.profiles.active=bootstrap', '--server.port=8080', '--spring.grpc.server.enabled=false']
    save('admin-bootstrap-task.json', task)
    definition = aws('ecs', 'register-task-definition', payload=task)['taskDefinition']['taskDefinitionArn']
    result = aws('ecs', 'run-task', payload={'cluster': CLUSTER, 'taskDefinition': definition,
                 'launchType': 'FARGATE', 'networkConfiguration': service['networkConfiguration']})
    if result.get('failures'): raise RuntimeError(str(result['failures']))
    task_arn = result['tasks'][0]['taskArn']
    save('admin-bootstrap-run.json', {'task': task_arn, 'definition': definition, 'email': email})
    print('Started administrator bootstrap:', task_arn, flush=True)

def curl(url, cookies, headers=(), data=None):
    command = ['/usr/bin/curl', '-q', '-sS', '--max-time', '20', '--cookie', cookies,
               '--cookie-jar', cookies, '-w', '\n%{http_code}']
    for header in headers: command += ['-H', header]
    if data is not None: command += ['-H', 'Content-Type: application/json', '--data-binary', '@-']
    command.append(url)
    response = subprocess.run(command, input=data, capture_output=True, text=True)
    if response.returncode: raise RuntimeError('HTTPS verification connection failed.')
    body, _, status = response.stdout.rpartition('\n')
    return int(status), body

verified = False
try:
    if not verify_only:
        for attempt in range(40):
            state = aws('ecs', 'describe-tasks', '--cluster', CLUSTER, '--tasks', task_arn)['tasks'][0]
            if state['lastStatus'] == 'STOPPED':
                app_state = next(c for c in state['containers'] if c['name'] == 'app')
                if app_state.get('exitCode') == 0: break
                raise RuntimeError('Bootstrap task failed; inspect its Auth logs.')
            if state.get('healthStatus') == 'HEALTHY': break
            time.sleep(15)
        else: raise RuntimeError('Bootstrap startup timed out; inspect the task logs.')
    fd, cookies = tempfile.mkstemp(prefix='ems-admin-verification-'); os.close(fd)
    try:
        status, body = curl(base + '/api/v1/auth/csrf', cookies)
        if status != 200: raise RuntimeError(f'CSRF verification returned HTTP {status}.')
        csrf = json.loads(body)
        headers = ['Origin: ' + base, csrf['headerName'] + ': ' + csrf['token']]
        status, body = curl(base + '/api/v1/auth/login', cookies, headers, json.dumps(value))
        if status != 200:
            raise RuntimeError(f'Admin login returned HTTP {status}; an existing active admin may have prevented bootstrap.')
        access = json.loads(body)['accessToken']
        status, body = curl(base + '/api/v1/accounts/me', cookies, ['Authorization: Bearer ' + access])
        if status != 200: raise RuntimeError(f'Account verification returned HTTP {status}.')
        account = json.loads(body)
        if account.get('email', '').lower() != email or account.get('role') != 'ADMIN':
            raise RuntimeError('Verified account did not have the expected email and ADMIN role.')
        status, body = curl(base + '/api/v1/auth/csrf', cookies)
        if status != 200: raise RuntimeError(f'Logout CSRF retrieval returned HTTP {status}.')
        csrf = json.loads(body)
        logout_headers = ['Origin: ' + base, csrf['headerName'] + ': ' + csrf['token']]
        status, _ = curl(base + '/api/v1/auth/logout', cookies, logout_headers, '{}')
        if status != 204: raise RuntimeError(f'Verification session logout returned HTTP {status}.')
        verified = True
        print(f'Verified administrator login and ADMIN role: {email}', flush=True)
        print('Private credentials file:', credentials, flush=True)
    finally: os.unlink(cookies)
finally:
    if task_arn:
        aws('ecs', 'stop-task', '--cluster', CLUSTER, '--task', task_arn, '--reason', 'Administrator bootstrap completed' if verified else 'Administrator bootstrap verification ended')
        aws('ecs', 'deregister-task-definition', '--task-definition', definition)
        print('Stopped the one-off bootstrap task and deregistered its task definition.', flush=True)
