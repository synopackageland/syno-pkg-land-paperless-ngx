#!/usr/bin/env python3
"""Merge an upstream release and rebuild without publishing or deploying."""
import json
from pathlib import Path
import re
import subprocess
import sys
root=Path(__file__).resolve().parents[2]
pkg=root/'synology'
def output(*args):
    return subprocess.check_output(args,cwd=root,text=True).strip()
def run(*args):
    subprocess.run(args,cwd=root,check=True)
if len(sys.argv)!=2 or not re.fullmatch(r'v\d+\.\d+\.\d+',sys.argv[1]):
    raise SystemExit('Usage: python3 synology/scripts/upgrade.py vX.Y.Z')
if output('git','status','--porcelain','--untracked-files=no'):
    raise SystemExit('Commit tracked changes before merging an upstream release')
tag=sys.argv[1]
run('git','fetch','upstream','tag',tag)
run('git','merge','--no-ff',tag,'-m','Merge upstream '+tag+' [skip ci]')
# Build numbers reset for a new upstream version, and increase for the same one.
program=r'''
import fs from 'node:fs';
import {parse,stringify} from 'yaml';
const version=process.argv[1].slice(1);
const p='dsm-package.yaml',m=parse(fs.readFileSync(p,'utf8'));
m.build=m.version===version?m.build+1:1;
if(m.build>9999)throw new Error('Build number exceeds 9999');
m.version=version;fs.writeFileSync(p,stringify(m,{lineWidth:0}));
const c='compose.yaml',compose=parse(fs.readFileSync(c,'utf8'));
compose.services.webserver.image='docker.io/paperlessngx/paperless-ngx:'+version;
fs.writeFileSync(c,stringify(compose,{lineWidth:0}));
'''
subprocess.run(['node','--input-type=module','-e',program,tag],cwd=pkg,check=True)
subprocess.run([str(pkg/'node_modules/.bin/synopkgland'),'images','pin'],cwd=pkg,check=True)
run('python3',str(pkg/'scripts/build.py'))
