#!/usr/bin/env python3
"""Build on a Linux Docker host using only published dependencies."""
import os
import json
from pathlib import Path
import re
import shlex
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PKG = ROOT / 'synology'

def run(*args, **kwargs):
    return subprocess.run(args, cwd=ROOT, check=True, **kwargs)

for key in ['SYNOPKGLAND_SDK_DIR', 'SYNOPKGLAND_TEMPLATES_DIR', 'SPL_CLI_DIR']:
    if os.environ.get(key):
        raise SystemExit('Source overrides are not allowed')
host = os.environ.get('SPL_BUILD_SSH')
image = os.environ.get('SPL_BUILDER_IMAGE')
remote = os.environ.get('SPL_BUILD_DIR', '/tmp/paperless-build')
prefix = os.environ.get('SPL_RESOURCE_PREFIX', 'paperless-build')
if not host or not image:
    raise SystemExit('Set SPL_BUILD_SSH and SPL_BUILDER_IMAGE')
if not re.fullmatch(r'/tmp/[A-Za-z0-9_-]+', remote) or not re.fullmatch(r'[a-z0-9-]+', prefix):
    raise SystemExit('Use an isolated /tmp build directory and a simple resource prefix')
run('node', str(PKG / 'scripts/render.mjs'), '--check')
run('ssh', host, shlex.join(['mkdir', '-p', remote + '/synology']))
run('rsync', '-az', '--exclude=node_modules', '--exclude=dist', '--exclude=evidence',
    '--exclude=.e2e', '--exclude=.artifacts', '--exclude=.synopkgland', '--exclude=__pycache__',
    str(PKG) + '/', host + ':' + remote + '/synology/')
program = '''set -eu
mkdir -p evidence
npm ci --ignore-scripts --registry=https://registry.npmjs.org
python3 tests/bootstrap_test.py > evidence/bootstrap.txt 2>&1
node --test tests/*.test.mjs > evidence/contracts.txt 2>&1
node scripts/render.mjs --check
node_modules/.bin/synopkgland check --json > evidence/check.json
node_modules/.bin/synopkgland build --arch x86_64 --json > evidence/build.json
spk=$(node --input-type=module -e "import fs from 'node:fs';import {parse} from 'yaml';const m=parse(fs.readFileSync('dsm-package.yaml','utf8'));console.log('dist/'+m.package+'-'+m.version+'-'+String(m.build).padStart(4,'0')+'-x86_64.spk')")
node_modules/.bin/synopkgland inspect "$spk" --json > evidence/inspect.json
'''
args = ['docker', 'run', '--rm', '--name', prefix + '-cli', '--network', 'host',
    '-v', remote + ':/work', '-w', '/work/synology',
    '-v', 'synopkgland-cache-npm:/cache/npm', '-e', 'npm_config_cache=/cache/npm',
    '-v', 'synopkgland-cache-gomod:/cache/gomod', '-e', 'GOMODCACHE=/cache/gomod',
    '-v', 'synopkgland-cache-gobuild:/var/cache/go-build', '-e', 'GOCACHE=/var/cache/go-build']
for key in ['SYNOPKGLAND_COMPOSE_REGISTRY_MIRRORS']:
    if os.environ.get(key):
        args += ['-e', key + '=' + os.environ[key]]
# Configure private-module credentials and optional CA mounts in the builder image/host.
# No token or credential is accepted as a command-line argument by this script.
args += [image, 'sh', '-ec', program]
run('ssh', host, shlex.join(args))
for name in ['dist', 'evidence']:
    run('rsync', '-az', host + ':' + remote + '/synology/' + name, str(PKG) + '/')
selected = json.loads((PKG / 'evidence/build.json').read_text())['data']['outputs'][0]
run('python3', str(PKG / 'scripts/provenance.py'), str(PKG / 'dist' / Path(selected).name))
print('Build/check/inspect results are in synology/evidence; SPK is in synology/dist.')
