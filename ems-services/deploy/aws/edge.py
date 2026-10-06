#!/usr/bin/env python3
"""Create an AWS-provided HTTPS address for the private ECS gateway."""
from deploy import *

groups = aws('ec2', 'describe-security-groups', '--filters', f'Name=vpc-id,Values={VPC}', 'Name=group-name,Values=ems-cloudfront-alb')['SecurityGroups']
sg = groups[0]['GroupId'] if groups else aws('ec2', 'create-security-group', '--vpc-id', VPC,
    '--group-name', 'ems-cloudfront-alb', '--description', 'EMS API origin: CloudFront ingress only')['GroupId']
allow(sg, {'IpProtocol': 'tcp', 'FromPort': 80, 'ToPort': 80, 'PrefixListIds': [{'PrefixListId': 'pl-b6a144df'}]})
allow(GATEWAY_SG, {'IpProtocol': 'tcp', 'FromPort': 8080, 'ToPort': 8080, 'UserIdGroupPairs': [{'GroupId': sg}]})
lbs = aws('elbv2', 'describe-load-balancers')['LoadBalancers']
lb = next((v for v in lbs if v['LoadBalancerName']=='ems-dev-api'), None)
if lb is None:
    lb = aws('elbv2', 'create-load-balancer', payload={'Name': 'ems-dev-api', 'Type': 'application',
             'Scheme': 'internet-facing', 'Subnets': PUBLIC_SUBNETS, 'SecurityGroups': [sg]})['LoadBalancers'][0]
groups = aws('elbv2', 'describe-target-groups')['TargetGroups']
tg = next((v for v in groups if v['TargetGroupName']=='ems-dev-gateway'), None)
if tg is None:
    tg = aws('elbv2', 'create-target-group', payload={'Name': 'ems-dev-gateway', 'Protocol': 'HTTP', 'Port': 8080,
             'VpcId': VPC, 'TargetType': 'ip', 'HealthCheckPath': '/actuator/health/readiness',
             'HealthCheckIntervalSeconds': 30, 'HealthyThresholdCount': 2, 'Matcher': {'HttpCode': '200'}})['TargetGroups'][0]
listeners = aws('elbv2', 'describe-listeners', '--load-balancer-arn', lb['LoadBalancerArn'])['Listeners']
if not any(v['Port']==80 for v in listeners):
    aws('elbv2', 'create-listener', payload={'LoadBalancerArn': lb['LoadBalancerArn'], 'Protocol': 'HTTP', 'Port': 80,
        'DefaultActions': [{'Type': 'forward', 'TargetGroupArn': tg['TargetGroupArn']}]})
aws('ecs', 'update-service', payload={'cluster': CLUSTER, 'service': 'gateway-service',
    'loadBalancers': [{'targetGroupArn': tg['TargetGroupArn'], 'containerName': 'app', 'containerPort': 8080}],
    'healthCheckGracePeriodSeconds': 180})
items = aws('cloudfront', 'list-distributions').get('DistributionList', {}).get('Items', [])
dist = next((v for v in items if v.get('Comment')=='EMS development API'), None)
if dist is None:
    config = {'CallerReference': 'ems-api-20261005', 'Comment': 'EMS development API', 'Enabled': True,
        'Origins': {'Quantity': 1, 'Items': [{'Id': 'ems-alb', 'DomainName': lb['DNSName'],
            'CustomOriginConfig': {'HTTPPort': 80, 'HTTPSPort': 443, 'OriginProtocolPolicy': 'http-only',
                                  'OriginSslProtocols': {'Quantity': 1, 'Items': ['TLSv1.2']}}}]},
        'DefaultCacheBehavior': {'TargetOriginId': 'ems-alb', 'ViewerProtocolPolicy': 'redirect-to-https',
            'AllowedMethods': {'Quantity': 7, 'Items': ['GET','HEAD','OPTIONS','PUT','PATCH','POST','DELETE'],
                               'CachedMethods': {'Quantity': 2, 'Items': ['GET','HEAD']}},
            'CachePolicyId': '4135ea2d-6df8-44a3-9df3-4b5a84be39ad',
            'OriginRequestPolicyId': '216adef6-5c7f-47e4-b989-5492eafa07d3',
            'TrustedSigners': {'Enabled': False, 'Quantity': 0}, 'Compress': True},
        'PriceClass': 'PriceClass_100', 'ViewerCertificate': {'CloudFrontDefaultCertificate': True},
        'Restrictions': {'GeoRestriction': {'RestrictionType': 'none', 'Quantity': 0}}, 'HttpVersion': 'http2',
        'CustomErrorResponses': {'Quantity': 3, 'Items': [{'ErrorCode': code, 'ErrorCachingMinTTL': 0} for code in [500,502,503]]}}
    save('cloudfront-config.json', config)
    dist = aws('cloudfront', 'create-distribution', payload={'DistributionConfig': config})['Distribution']
result = {'url': 'https://' + dist['DomainName'], 'distribution': dist['Id'],
          'loadBalancer': lb['LoadBalancerArn'], 'targetGroup': tg['TargetGroupArn']}
save('endpoint.json', result)
print(json.dumps(result, indent=2))
