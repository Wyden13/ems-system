#!/usr/bin/env python3
"""Run the guarded import in the existing private AWS network; no service deployment."""
import argparse
import base64
import gzip
import json
import os
import secrets
from pathlib import Path
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / '.cloud-demo.local'
AWS = '/tmp/ems-aws-tools/bin/aws' if Path('/tmp/ems-aws-tools/bin/aws').exists() else 'aws'
REGION = 'us-east-2'
CLUSTER = 'ems-dev-cluster'
LOG_GROUP = '/ecs/ems-cloud-demo-fixtures'
RUN_NAME = 'prairie-cloud-operations-v1'

def aws(*args, payload=None):
    command = [AWS, *args, '--region', REGION, '--output', 'json']
    with tempfile.NamedTemporaryFile(mode='w', prefix='ems-demo-aws-', delete=True) as file:
        os.chmod(file.name, 0o600)
        if payload is not None:
            json.dump(payload, file); file.flush()
            command += ['--cli-input-json', 'file://' + file.name]
        result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout) if result.stdout.strip() else {}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['inspect', 'apply'])
    parser.add_argument('--repair-allocation-actor',action='store_true',help="Attribute only this seed's opening-allocation audit entries to its demo administrator.")
    args = parser.parse_args()
    run_name = 'prairie-cloud-allocation-actor-v1' if args.repair_allocation_actor else RUN_NAME
    if args.repair_allocation_actor and args.mode != 'apply':
        raise RuntimeError('The audit correction requires apply mode.')
    if aws('sts', 'get-caller-identity')['Account'] != '353747665772':
        raise RuntimeError('Refusing a different AWS account.')
    staff = json.loads((PRIVATE / 'operations-inspection.json').read_text())['staff']
    expected = '\n'.join('\t'.join(str(row[key]) for key in ['id','email','role','userAccountId','departmentId']) for row in staff)
    build = PRIVATE / 'import-class'; build.mkdir(mode=0o700, exist_ok=True)
    subprocess.run(['javac','--release','17','-d',str(build),str(ROOT/'scripts/demo/CloudDemoImport.java')],check=True)
    template = aws('ecs','describe-task-definition','--task-definition','ems-db-provision')['taskDefinition']
    source = template['containerDefinitions'][0]
    if '/ems/auth-service:provision-' not in source['image']:
        raise RuntimeError('Unexpected database utility image; refusing to repurpose it.')
    environment = [row for row in source['environment'] if row['name'] == 'DB_HOST']
    if environment != [{'name':'DB_HOST','value':'ems-db.cpgmcecgiodj.us-east-2.rds.amazonaws.com'}]:
        raise RuntimeError('Unexpected database host.')
    values = {'IMPORT_CLASS':base64.b64encode((build/'CloudDemoImport.class').read_bytes()).decode(), 'EXPECTED_PEOPLE':base64.b64encode(expected.encode()).decode(), 'FIXTURE_MODE':args.mode, 'FIXTURE_RUN':run_name}
    payload_parts = []
    if args.mode == 'apply':
        sql = (PRIVATE/('operations-allocation-actor.sql' if args.repair_allocation_actor else 'operations.sql')).read_bytes()
        encoded = base64.b64encode(gzip.compress(sql)).decode()
        if len(encoded) > 400_000:
            raise RuntimeError('Compressed import exceeds the environment payload limit.')
        payload_parts = [encoded[offset:offset+60_000] for offset in range(0,len(encoded),60_000)]
        values['FIXTURE_PARTS'] = str(len(payload_parts))
    try:
        aws('logs','create-log-group','--log-group-name',LOG_GROUP)
    except RuntimeError as failure:
        if 'ResourceAlreadyExistsException' not in str(failure): raise
    aws('logs','put-retention-policy','--log-group-name',LOG_GROUP,'--retention-in-days','7')
    container = {'name':'fixtures','image':source['image'],'essential':True,
        'entryPoint':['sh','-c'], 'command':['printf \'%s\' "$IMPORT_CLASS" | base64 -d > /tmp/CloudDemoImport.class && exec java -cp /tmp:/app/driver.jar CloudDemoImport'],
        'environment':environment + [{'name':name,'value':value} for name,value in values.items()],
        'secrets':[row for row in source['secrets'] if row['name'] in ['PEOPLE_PASSWORD','WORKFORCE_PASSWORD']],
        'logConfiguration':{'logDriver':'awslogs','options':{'awslogs-group':LOG_GROUP,'awslogs-region':REGION,'awslogs-stream-prefix':'ecs'}}}
    definition = {'family':'ems-cloud-demo-fixtures','networkMode':'awsvpc','requiresCompatibilities':['FARGATE'],'executionRoleArn':template['executionRoleArn'],'cpu':'512','memory':'1024','runtimePlatform':{'cpuArchitecture':'X86_64','operatingSystemFamily':'LINUX'},'containerDefinitions':[container]}
    arn = None
    task = None
    temporary_secrets = []
    try:
        # Private short-lived payloads avoid ECS's 64 KiB task-definition limit.
        batch = secrets.token_hex(8)
        for index, part in enumerate(payload_parts):
            result = aws('secretsmanager','create-secret',payload={'Name':f'ems/dev/demo-fixtures/{batch}/{index}','SecretString':part,'Tags':[{'Key':'Purpose','Value':'temporary-cloud-demo-fixtures'}]})
            temporary_secrets.append(result['ARN'])
            container['secrets'].append({'name':f'FIXTURE_SQL_GZIP_{index}','valueFrom':result['ARN']})
        arn = aws('ecs','register-task-definition',payload=definition)['taskDefinition']['taskDefinitionArn']
        result = aws('ecs','run-task',payload={'cluster':CLUSTER,'taskDefinition':arn,'launchType':'FARGATE','networkConfiguration':{'awsvpcConfiguration':{'subnets':['subnet-0b7b29741ad31f260','subnet-049376ee479537e34'],'securityGroups':['sg-021fa3db2f9938a21'],'assignPublicIp':'DISABLED'}}})
        if result.get('failures'): raise RuntimeError(str(result['failures']))
        task = result['tasks'][0]['taskArn']
        state = {'mode':args.mode,'taskArn':task,'definitionArn':arn,'run':run_name}
        (PRIVATE/'operations-task-state.json').write_text(json.dumps(state,indent=2))
        print(f'Cloud fixture {args.mode}: task started.',flush=True)
        last = None
        deadline = time.monotonic()+600
        while time.monotonic() < deadline:
            current = aws('ecs','describe-tasks','--cluster',CLUSTER,'--tasks',task)['tasks'][0]
            if current['lastStatus'] != last:
                last = current['lastStatus']; print('Task status: '+last,flush=True)
            if last == 'STOPPED': break
            time.sleep(5)
        else:
            aws('ecs','stop-task','--cluster',CLUSTER,'--task',task,'--reason','Fixture utility timeout')
            raise RuntimeError('Fixture task timed out; review transaction outcome before retrying.')
        stream = 'ecs/fixtures/'+task.rsplit('/',1)[1]
        messages = []
        for attempt in range(6):
            try:
                messages = [row['message'] for row in aws('logs','get-log-events','--log-group-name',LOG_GROUP,'--log-stream-name',stream,'--start-from-head')['events']]
                if messages: break
            except RuntimeError as failure:
                if 'ResourceNotFoundException' not in str(failure): raise
            time.sleep(2)
        (PRIVATE/f'operations-{args.mode}-task.log').write_text('\n'.join(messages)+'\n')
        for message in messages: print(message,flush=True)
        if current['containers'][0].get('exitCode') != 0:
            raise RuntimeError('Fixture task failed: '+current.get('stoppedReason','unknown'))
        state['status']='STOPPED';state['exitCode']=0
        (PRIVATE/'operations-task-state.json').write_text(json.dumps(state,indent=2))
    finally:
        if arn:
            aws('ecs','deregister-task-definition','--task-definition',arn)
        for reference in temporary_secrets:
            aws('secretsmanager','delete-secret','--secret-id',reference,'--force-delete-without-recovery')

if __name__ == '__main__': main()
