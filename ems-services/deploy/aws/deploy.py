#!/usr/bin/env python3
"""Deploy the four EMS services to the existing development AWS environment.

Requires built/pushed service images and an ECR auth-service provisioning image.
Secrets are passed through Secrets Manager references, never stored in task files.
"""
import json
import os
from pathlib import Path
import secrets
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.local/aws-deploy'
OUT.mkdir(parents=True, exist_ok=True)
REGION = 'us-east-2'
CLUSTER = 'ems-dev-cluster'
ACCOUNT = '353747665772'
VPC = 'vpc-01a74730146a71f9d'
BACKEND_SG = 'sg-021fa3db2f9938a21'
GATEWAY_SG = 'sg-056761d1de1eb2fdf'
PRIVATE_SUBNETS = ['subnet-0b7b29741ad31f260', 'subnet-049376ee479537e34']
PUBLIC_SUBNETS = ['subnet-0e85d99c792bed316', 'subnet-0fb96ede30891330f']
HOST = 'ems-db.cpgmcecgiodj.us-east-2.rds.amazonaws.com'
TAG = os.environ.get('IMAGE_TAG', '20261005-deploy')
REGISTRY = f'{ACCOUNT}.dkr.ecr.{REGION}.amazonaws.com'
ROLE = f'arn:aws:iam::{ACCOUNT}:role/ems-dev-ecs-execution-role'
NAMESPACE = f'arn:aws:servicediscovery:{REGION}:{ACCOUNT}:namespace/ns-2ruppavsgjkqbmqv'

def aws(*args, payload=None):
    command = ['aws', *args, '--region', REGION, '--output', 'json']
    if payload is not None:
        # The temporary CLI input may contain secrets; restrict access and remove it immediately.
        path = OUT / 'request.json'
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, 'w') as f: json.dump(payload, f)
        command += ['--cli-input-json', f'file://{path}']
    try:
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode: raise RuntimeError(result.stderr.strip())
        return json.loads(result.stdout) if result.stdout.strip() else {}
    finally:
        if payload is not None: path.unlink(missing_ok=True)

def secret_arn(name):
    return aws('secretsmanager', 'describe-secret', '--secret-id', name)['ARN']

def create_secret(name, value):
    try: return secret_arn(name)
    except RuntimeError as e:
        if 'ResourceNotFoundException' not in str(e): raise
    return aws('secretsmanager', 'create-secret', payload={'Name': name, 'SecretString': value})['ARN']

def save(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2) + '\n')

def logs(service):
    return {'logDriver': 'awslogs', 'options': {'awslogs-group': f'/ecs/ems-{service}',
            'awslogs-region': REGION, 'awslogs-stream-prefix': 'ecs'}}

def network(sg):
    return {'awsvpcConfiguration': {'subnets': PRIVATE_SUBNETS,
            'securityGroups': [sg], 'assignPublicIp': 'DISABLED'}}

def base_task(family, containers):
    return {'family': family, 'networkMode': 'awsvpc', 'requiresCompatibilities': ['FARGATE'],
            'executionRoleArn': ROLE, 'cpu': '1024', 'memory': '3072',
            'runtimePlatform': {'cpuArchitecture': 'X86_64', 'operatingSystemFamily': 'LINUX'},
            'containerDefinitions': containers}

def log_group(service):
    try: aws('logs', 'create-log-group', '--log-group-name', f'/ecs/ems-{service}')
    except RuntimeError as e:
        if 'ResourceAlreadyExistsException' not in str(e): raise
    aws('logs', 'put-retention-policy', '--log-group-name', f'/ecs/ems-{service}', '--retention-in-days', '14')

def allow(sg, permission):
    try: aws('ec2', 'authorize-security-group-ingress', payload={'GroupId': sg, 'IpPermissions': [permission]})
    except RuntimeError as e:
        if 'InvalidPermission.Duplicate' not in str(e): raise

def private_network():
    # Existing ECR, logs, and secrets endpoints use the backend security group.
    allow(BACKEND_SG, {'IpProtocol': 'tcp', 'FromPort': 443, 'ToPort': 443,
                      'UserIdGroupPairs': [{'GroupId': GATEWAY_SG}]})

def certs():
    path = OUT / 'certs'
    path.mkdir(mode=0o700, exist_ok=True)
    def openssl(*args): subprocess.run(['openssl', *args], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if not (path / 'ca.key').exists():
        openssl('req', '-x509', '-newkey', 'rsa:3072', '-nodes', '-days', '365', '-subj', '/CN=EMS AWS dev CA',
                '-keyout', str(path/'ca.key'), '-out', str(path/'ca.crt'))
    for svc in ['auth', 'people', 'workforce']:
        if (path/f'{svc}.crt').exists(): continue
        openssl('req', '-newkey', 'rsa:2048', '-nodes', '-subj', f'/CN={svc}-service',
                '-keyout', str(path/f'{svc}.key'), '-out', str(path/f'{svc}.csr'))
        (path/f'{svc}.ext').write_text(f'subjectAltName=DNS:{svc}-service\nextendedKeyUsage=serverAuth,clientAuth\n')
        openssl('x509', '-req', '-days', '365', '-in', str(path/f'{svc}.csr'), '-CA', str(path/'ca.crt'),
                '-CAkey', str(path/'ca.key'), '-CAcreateserial', '-extfile', str(path/f'{svc}.ext'), '-out', str(path/f'{svc}.crt'))
    for p in path.iterdir(): p.chmod(0o600)
    refs = {'ca': create_secret('ems/dev/tls/ca', (path/'ca.crt').read_text())}
    for svc in ['auth', 'people', 'workforce']:
        refs[svc] = {kind: create_secret(f'ems/dev/tls/{svc}/{kind}', (path/f'{svc}.{ext}').read_text())
                     for kind, ext in [('cert', 'crt'), ('key', 'key')]}
    return refs

def provision(passwords):
    log_group('provision')
    provision_tag = os.environ.get('PROVISION_IMAGE_TAG', f'provision-{TAG}-v2')
    c = {'name': 'provision', 'image': f'{REGISTRY}/ems/auth-service:{provision_tag}', 'essential': True,
         'environment': [{'name': 'DB_HOST', 'value': HOST}], 'secrets': [
             {'name': 'ADMIN_PASSWORD', 'valueFrom': secret_arn('ems/dev/db/auth') + ':password::'},
             *[{'name': svc.upper()+'_PASSWORD', 'valueFrom': ref} for svc, ref in passwords.items()]],
         'logConfiguration': logs('provision')}
    task = base_task('ems-db-provision', [c]); save('provision-task.json', task)
    arn = aws('ecs', 'register-task-definition', payload=task)['taskDefinition']['taskDefinitionArn']
    result = aws('ecs', 'run-task', payload={'cluster': CLUSTER, 'taskDefinition': arn,
                 'launchType': 'FARGATE', 'networkConfiguration': network(BACKEND_SG)})
    if result.get('failures'): raise RuntimeError(str(result['failures']))
    task_arn = result['tasks'][0]['taskArn']; print('Provisioning databases:', task_arn, flush=True)
    while True:
        t = aws('ecs', 'describe-tasks', '--cluster', CLUSTER, '--tasks', task_arn)['tasks'][0]
        if t['lastStatus'] == 'STOPPED':
            if t['containers'][0].get('exitCode') != 0:
                raise RuntimeError('Database provisioning failed; inspect /ecs/ems-provision. ' + t.get('stoppedReason', ''))
            break
        time.sleep(15)
    print('Database provisioning succeeded', flush=True)

def deploy_services(passwords, tls):
    jwt = secret_arn('ems/dev/jwt') + ':JWT_SECRET::'
    for port in [8080, 9090]:
        allow(BACKEND_SG, {'IpProtocol': 'tcp', 'FromPort': port, 'ToPort': port,
                           'UserIdGroupPairs': [{'GroupId': BACKEND_SG}]})
    for svc in ['auth', 'people', 'workforce', 'gateway']:
        log_group(svc)
        env = {'SECURE_COOKIE': 'true', 'SERVER_PORT': '8080',
               'ALLOWED_ORIGINS': os.environ.get('FRONTEND_ORIGIN', 'https://d2z6z22jatofwt.cloudfront.net')}
        refs = [{'name': 'JWT_SECRET', 'valueFrom': jwt}]
        ports = [{'name': f'{svc}-http', 'containerPort': 8080, 'protocol': 'tcp', 'appProtocol': 'http'}]
        if svc != 'gateway':
            env.update({'SPRING_DATASOURCE_URL': f'jdbc:postgresql://{HOST}:5432/ems_{svc}_db?sslmode=require',
                        'SPRING_DATASOURCE_USERNAME': f'{svc}_user', 'TLS_CERT': f'file:/certs/{svc}.crt',
                        'TLS_KEY': f'file:/certs/{svc}.key', 'TLS_CA': 'file:/certs/ca.crt'})
            refs += [{'name': 'SPRING_DATASOURCE_PASSWORD', 'valueFrom': passwords[svc]}]
        if svc in ['auth', 'people']:
            ports += [{'name': f'{svc}-grpc', 'containerPort': 9090, 'protocol': 'tcp'}]
        if svc == 'people': env['AUTH_GRPC_TARGET'] = 'auth-service:9090'
        if svc == 'workforce': env['PEOPLE_GRPC_TARGET'] = 'people-service:9090'
        if svc == 'gateway':
            env.update({f'{s.upper()}_URL': f'http://{s}-http:8080' for s in ['auth', 'people', 'workforce']})
        check = 'curl -fsS http://localhost:8080/actuator/health/readiness >/dev/null'
        if svc == 'gateway':
            check += ''.join(f' && curl -fsS http://{s}-http:8080/actuator/health/readiness >/dev/null' for s in ['auth','people','workforce'])
        main = {'name': 'app', 'image': f'{REGISTRY}/ems/{svc}-service:{TAG}', 'essential': True,
                'portMappings': ports, 'environment': [{'name': k, 'value': v} for k,v in env.items()],
                'secrets': refs, 'logConfiguration': logs(svc),
                'healthCheck': {'command': ['CMD-SHELL', check], 'interval': 30, 'timeout': 10, 'retries': 3, 'startPeriod': 120}}
        containers = [main]
        if svc != 'gateway':
            main['mountPoints'] = [{'sourceVolume': 'tls', 'containerPath': '/certs', 'readOnly': True}]
            main['dependsOn'] = [{'containerName': 'tls-init', 'condition': 'SUCCESS'}]
            containers += [{'name': 'tls-init', 'image': main['image'], 'essential': False, 'user': '0',
                'entryPoint': ['/bin/sh', '-c'], 'command': [f'set -eu; umask 077; printf "%s\\n" "$CERT" > /certs/{svc}.crt; printf "%s\\n" "$KEY" > /certs/{svc}.key; printf "%s\\n" "$CA" > /certs/ca.crt; chown -R spring:spring /certs'],
                'secrets': [{'name': 'CERT', 'valueFrom': tls[svc]['cert']}, {'name': 'KEY', 'valueFrom': tls[svc]['key']}, {'name': 'CA', 'valueFrom': tls['ca']}],
                'mountPoints': [{'sourceVolume': 'tls', 'containerPath': '/certs', 'readOnly': False}], 'logConfiguration': logs(svc)}]
        task = base_task(f'ems-{svc}', containers)
        if svc != 'gateway': task['volumes'] = [{'name': 'tls'}]
        save(f'{svc}-task.json', task)
        arn = aws('ecs', 'register-task-definition', payload=task)['taskDefinition']['taskDefinitionArn']
        connect = {'enabled': True, 'namespace': NAMESPACE, 'services': [], 'logConfiguration': logs(svc)}
        if svc != 'gateway':
            connect['services'] = [{'portName': p['name'], 'discoveryName': p['name'],
                'clientAliases': [{'dnsName': f'{svc}-service' if p['containerPort']==9090 else f'{svc}-http', 'port': p['containerPort']}]} for p in ports]
        service = f'{svc}-service'
        existing = aws('ecs', 'describe-services', '--cluster', CLUSTER, '--services', service).get('services', [])
        spec = {'cluster': CLUSTER, 'service' if existing else 'serviceName': service,
                'taskDefinition': arn, 'desiredCount': 1, 'networkConfiguration': network(GATEWAY_SG if svc=='gateway' else BACKEND_SG),
                'serviceConnectConfiguration': connect,
                'deploymentConfiguration': {'deploymentCircuitBreaker': {'enable': True, 'rollback': True}, 'minimumHealthyPercent': 100, 'maximumPercent': 200}}
        if existing:
            spec['forceNewDeployment'] = True
            aws('ecs', 'update-service', payload=spec)
        else:
            spec['launchType'] = 'FARGATE'
            aws('ecs', 'create-service', payload=spec)
        print(f'Deployed {service}: {arn}', flush=True)

if __name__ == '__main__':
    private_network()
    passwords = {'auth': create_secret('ems/dev/db/auth-user', secrets.token_urlsafe(36)),
                 'people': secret_arn('ems/dev/db/people') + ':DB_PASSWORD::',
                 'workforce': secret_arn('ems/dev/db/workforce') + ':DB_PASSWORD::'}
    tls = certs()
    provision(passwords)
    deploy_services(passwords, tls)
