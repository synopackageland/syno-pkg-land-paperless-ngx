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
const cli=process.env.PAPERLESS_TEST_CLI || join(root,'node_modules/.bin/synopkgland');
function check(path=root) {
  const reply=spawnSync(cli,['--project',path,'check','--json'],{encoding:'utf8'});
  assert.ok(reply.stdout,reply.stderr);
  return JSON.parse(reply.stdout);
}

test('CLI accepts the actual three-service plan and enforces nonroot/loopback',()=>{
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
  assert.equal(manifest.identity_gateway.sdk,'0.31.2');
  assert.equal(manifest.compose.sdk,'0.31.2');
  assert.equal(manifest.identity_gateway.oidc.clients[0].pkce,true);
  for(const s of Object.values(compose.services)) assert.match(s.image,/@sha256:[0-9a-f]{64}$/);
});

test('bootstrap/config output is fresh and upstream authenticates public routes with OIDC or token',()=>{
  const runtime=manifest.compose.services.webserver.storage_init.runtime;
  assert.equal(runtime.files[0].content,readFileSync(join(root,'container/bootstrap.py'),'utf8'));
  assert.equal(manifest.compose.services.broker.storage_init.runtime.files[0].content,readFileSync(join(root,'container/redis.conf'),'utf8'));
  assert.equal(compose.services.webserver.environment.PAPERLESS_DISABLE_REGULAR_LOGIN,'true');
  assert.equal(compose.services.webserver.environment.PAPERLESS_ACCOUNT_ALLOW_SIGNUPS,'false');
  assert.equal(compose.services.webserver.environment.PAPERLESS_OCR_LANGUAGE,'eng+chi_tra+chi_sim');
  assert.equal(manifest.identity_gateway.passthrough,undefined);
  assert.equal(manifest.identity_gateway.upstream_access,'public');
});

test('consume uses the single install-selected rw share while export stays private',()=>{
  assert.deepEqual(manifest.install.sharedFolder,{mode:'select',key:'consume',permission:'rw'});
  assert.equal(manifest.capabilities.composeMounts,true);
  assert.deepEqual(manifest.compose.shares,{
    consume:{select:'install',permission:'rw',mounts:[{service:'webserver',target:'/consume'}]},
  });
  assert.equal(compose.services.webserver.environment.PAPERLESS_CONSUMPTION_DIR,'/consume');
  assert.equal(compose.services.webserver.environment.PAPERLESS_CONSUMER_POLLING,'5');
  const modified=structuredClone(manifest);
  modified.compose.shares.consume.permission='ro';
  const directory=mkdtempSync(join(tmpdir(),'paperless-share-'));
  try {
    delete modified.icon;
    writeFileSync(join(directory,'dsm-package.yaml'),stringify(modified));
    copyFileSync(join(root,'compose.yaml'),join(directory,'compose.yaml'));
    const reply=check(directory);
    assert.equal(reply.ok,false);
    assert.equal(reply.code,'COMPOSE_SHARE_INVALID');
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('SDK refuses bridge-only access to the loopback OIDC issuer',()=>{
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
