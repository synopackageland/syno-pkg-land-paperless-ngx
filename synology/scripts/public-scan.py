#!/usr/bin/env python3
"""Scan integration files and optional external denylist without printing matched values."""
import argparse
from pathlib import Path
import re
import subprocess

parser=argparse.ArgumentParser()
parser.add_argument('--denylist',type=Path)
parser.add_argument('--history',action='store_true')
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
patterns=[r't-' + r'0[0-9]{3}', 'vt-'+'nas', 'vt-'+'62', 'nas'+'96', 'fran'+'cis', 'sa'+'3400', 'sa'+'3200', 'new'+'admin',r'normal' + r'[1-3]',r'10' + r'\.17\.', 'vin'+'centt', 'her'+'dr', 'ku'+'ma',r'synology' + r'\.com','for'+'ti',r'gh[pousr]_[A-Za-z0-9]{20,}',r'github_pat_[A-Za-z0-9_]{20,}',r'-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----']
pattern=re.compile('|'.join(patterns),re.IGNORECASE)
denylist=[] if args.denylist is None else [line for line in args.denylist.read_text().splitlines() if line]
failures=[]
def scan(label,data):
    value=data.decode(errors='replace')
    if pattern.search(value) or any(word in value for word in denylist):
        failures.append(label)
ignored={'.git','node_modules','dist','evidence','.e2e','.synopkgland','.artifacts','__pycache__'}
for path in root.rglob('*'):
    if not path.is_file() or any(part in ignored for part in path.relative_to(root).parts):continue
    scan(str(path.relative_to(root)),path.read_bytes())
if args.history:
    commits=subprocess.check_output(['git','rev-list','HEAD','--not','--remotes=upstream','--tags'],cwd=root,text=True).splitlines()
    for commit in commits:
        scan(commit[:12]+' message',subprocess.check_output(['git','show','-s','--format=%B',commit],cwd=root))
        identity=subprocess.check_output(['git','show','-s','--format=%an <%ae>%n%cn <%ce>',commit],cwd=root,text=True).splitlines()
        if any(person!='synopackageland <synopackageland@gmail.com>' for person in identity):failures.append(commit[:12]+' identity')
        scan(commit[:12]+' patch',subprocess.check_output(['git','show','--format=','--no-ext-diff',commit,'--','synology/'],cwd=root))
if failures:raise SystemExit('Public scan failed: '+', '.join(failures))
print('Public integration scan passed')
