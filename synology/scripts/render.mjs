import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {parse, stringify} from 'yaml';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path=resolve(root,'dsm-package.yaml');
const manifest=parse(readFileSync(path,'utf8'));
manifest.compose.services.webserver.storage_init.runtime.files[0].content=readFileSync(resolve(root,'container/bootstrap.py'),'utf8');
manifest.compose.services.broker.storage_init.runtime.files[0].content=readFileSync(resolve(root,'container/redis.conf'),'utf8');
const rendered=stringify(manifest,{lineWidth:0});
if (process.argv.includes('--check')) {
  if (readFileSync(path,'utf8') !== rendered) throw new Error('Stale bootstrap; run node scripts/render.mjs');
} else writeFileSync(path,rendered);
