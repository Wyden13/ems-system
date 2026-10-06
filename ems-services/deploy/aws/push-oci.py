#!/usr/bin/env python3
"""Upload an OCI archive through ECR APIs when Docker registry uploads time out."""
import json
import sys
import tarfile
try:
    import botocore.session as session
except ImportError:
    import awscli.botocore.session as session

archive, repository, tag = sys.argv[1:]
ecr = session.get_session().create_client('ecr', region_name='us-east-2')
with tarfile.open(archive) as tar:
    def blob(digest): return tar.extractfile('blobs/sha256/' + digest.split(':')[1]).read()
    index = json.load(tar.extractfile('index.json'))
    descriptor = index['manifests'][0]
    manifest_bytes = blob(descriptor['digest'])
    manifest = json.loads(manifest_bytes)
    if 'manifests' in manifest:
        descriptor = next(v for v in manifest['manifests'] if v.get('platform', {}).get('architecture') == 'amd64')
        manifest_bytes = blob(descriptor['digest'])
        manifest = json.loads(manifest_bytes)
    for layer in [manifest['config'], *manifest['layers']]:
        digest = layer['digest']
        available = ecr.batch_check_layer_availability(repositoryName=repository, layerDigests=[digest]).get('layers', [])
        if any(v['layerAvailability']=='AVAILABLE' for v in available): continue
        data = blob(digest)
        upload = ecr.initiate_layer_upload(repositoryName=repository)
        size = upload['partSize']
        print(f'Uploading {digest}: {len(data)} bytes', flush=True)
        for offset in range(0, len(data), size):
            part = data[offset:offset+size]
            ecr.upload_layer_part(repositoryName=repository, uploadId=upload['uploadId'],
                                  partFirstByte=offset, partLastByte=offset+len(part)-1, layerPartBlob=part)
        ecr.complete_layer_upload(repositoryName=repository, uploadId=upload['uploadId'], layerDigests=[digest])
    try:
        result = ecr.put_image(repositoryName=repository, imageTag=tag, imageManifest=manifest_bytes.decode(),
                               imageManifestMediaType=manifest['mediaType'])
        print(result['image']['imageId'], flush=True)
    except ecr.exceptions.ImageAlreadyExistsException:
        print('Image already uploaded', flush=True)
