#!/usr/bin/env python3
"""Verify the built immutable Paperless image matches the retained upstream tag."""
import base64
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile

root=Path(__file__).resolve().parents[2]
spk=Path(sys.argv[1])
with tarfile.open(spk) as outer:
    with tarfile.open(fileobj=io.BytesIO(outer.extractfile('package.tgz').read())) as payload:
        images=json.load(payload.extractfile('compose/images.json'))
        lock=json.load(payload.extractfile('compose/compose.lock.json'))
rows=[]
for source,proof in images.items():
    config=json.loads(base64.b64decode(proof['config']))
    manifest=json.loads(base64.b64decode(proof['manifest']))
    assert 'sha256:'+hashlib.sha256(base64.b64decode(proof['config'])).hexdigest()==manifest['config']['digest']
    rows.append({'source':source,'reference':proof['reference'],'architecture':config['architecture'],'config_digest':manifest['config']['digest']})
    if source.startswith('docker.io/paperlessngx/paperless-ngx:'):
        labels=config['config']['Labels']
        version=labels['org.opencontainers.image.version']
        revision=subprocess.check_output(['git','rev-parse','v'+version+'^{commit}'],cwd=root,text=True).strip()
        assert labels['org.opencontainers.image.revision']==revision
        subprocess.run(['git','merge-base','--is-ancestor',revision,'HEAD'],cwd=root,check=True)
        upstream={'tag':'v'+version,'commit':revision,'source':'https://github.com/paperless-ngx/paperless-ngx'}
if 'upstream' not in locals():raise SystemExit('Missing official Paperless image proof')
record={'upstream':upstream,'spk':spk.name,'spk_sha256':hashlib.sha256(spk.read_bytes()).hexdigest(),'images':rows,'toolchain':json.loads((root/'synology/toolchain.json').read_text())}
(root/'synology/build-proof.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({'source_revision_verified':True,'spk_sha256':record['spk_sha256']}))
