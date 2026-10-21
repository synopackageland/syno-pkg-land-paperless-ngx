import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, writeFileSync, rmSync, copyFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parse,stringify} from 'yaml';

const root=resolve(import.meta.dirname,'..');
const manifest=parse(readFileSync(join(root,'dsm-package.yaml'),'utf8'));
const compose=parse(readFileSync(join(root,'compose.yaml'),'utf8'));
const cli=join(root,'node_modules/.bin/synopkgland');
function check(path=root) {
  const reply=spawnSync(cli,['--project',path,'check','--json'],{encoding:'utf8'});
  assert.ok(reply.stdout,reply.stderr);
  return JSON.parse(reply.stdout);
}

test('released CLI accepts the actual three-service plan and enforces nonroot/loopback',()=>{
  const reply=check();assert.equal(reply.ok,true,reply.message);
  const services=reply.data.compose.services;
  assert.equal(services.length,3);
  for (const s of services) {
    assert.equal(s.container_root,false);
    assert.equal(s.host_elevation,false);
    assert.deepEqual(s.cap_drop,['ALL']);
    assert.match(s.user,/SYNOPKGLAND_UID/);
    assert.ok(!s.ports?.length);
  }
  assert.equal(services.find(s=>s.service==='webserver').network,'host');
  assert.equal(manifest.identity_gateway.access,'dsm-users');
  assert.equal(manifest.identity_gateway.sdk,'0.21.0');
  assert.equal(manifest.compose.sdk,'0.21.0');
  assert.equal(manifest.identity_gateway.oidc.clients[0].pkce,true);
  for(const s of Object.values(compose.services)) assert.match(s.image,/@sha256:[0-9a-f]{64}$/);
});

test('bootstrap/config output is fresh, native local login is disabled, and API bypass is absent',()=>{
  const runtime=manifest.compose.services.webserver.storage_init.runtime;
  assert.equal(runtime.files[0].content,readFileSync(join(root,'container/bootstrap.py'),'utf8'));
  assert.equal(manifest.compose.services.broker.storage_init.runtime.files[0].content,readFileSync(join(root,'container/redis.conf'),'utf8'));
  assert.equal(compose.services.webserver.environment.PAPERLESS_DISABLE_REGULAR_LOGIN,'true');
  assert.equal(compose.services.webserver.environment.PAPERLESS_ACCOUNT_ALLOW_SIGNUPS,'false');
  assert.equal(compose.services.webserver.environment.PAPERLESS_OCR_LANGUAGE,'eng+chi_tra+chi_sim');
  assert.equal(manifest.identity_gateway.passthrough,undefined);
});

test('published SDK refuses bridge-only access to the loopback OIDC issuer',()=>{
  const directory=mkdtempSync(join(tmpdir(),'paperless-contract-'));
  try {
    const modified=structuredClone(manifest);
    delete modified.icon;
    delete modified.compose.services.webserver.network;
    delete modified.compose.services.webserver.listener;
    writeFileSync(join(directory,'dsm-package.yaml'),stringify(modified));
    copyFileSync(join(root,'compose.yaml'),join(directory,'compose.yaml'));
    const reply=check(directory);
    assert.equal(reply.ok,false);
    assert.equal(reply.code,'COMPOSE_OIDC_TOPOLOGY_UNSUPPORTED');
  } finally {rmSync(directory,{recursive:true,force:true});}
});
