import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=resolve(import.meta.dirname,'../..');
const cli=process.env.PAPERLESS_CLI_DIR??join(root,'node_modules/@synopackageland/cli');
const module=name=>import(pathToFileURL(join(cli,'dist/ctl',name+'.js')));
const {validateNativeRegistry}=await module('native-registry');
const {validateNativeArtifacts}=await module('native-metadata');
const {executeNative,nativeRequest}=await module('native-executor');
const {operationInput,requestPlan,confirmOperation}=await module('input');
const {enrollNative}=await module('native-protocol');
const r=JSON.parse(readFileSync(join(root,'operations.json')));
const d=JSON.parse(readFileSync(join(root,'generated/synopkgland-api.json')));
const inventory=JSON.parse(readFileSync(join(root,'generated/synopkgland-http-inventory.json')));
const ctx={basePath:r.nativeHttp.basePath,entry:'app-privilege',upstreamAuthPaths:['/api/profile','/api/documents','/api/tags','/api/correspondents','/api/document_types','/api/tasks']};
const reply=(data,status=200,type='application/json')=>({status,headers:{'content-type':type},body:Readable.from([JSON.stringify(data)])});
const invoke=(name,params,transport,options)=>executeNative(r.operations[name],params,r.nativeHttp,transport,options);
const input=(name,value)=>operationInput(r.operations[name],['--input','-'],JSON.stringify(value));

test('SDK metadata and HTTP inventory match all 25 selected operations and original admission',()=>{
 validateNativeRegistry(r,ctx);validateNativeArtifacts(d,inventory);
 assert.equal(Object.keys(r.operations).length,25);
 assert.equal(d.payload.package.version,'3.4.0-0010');
 assert.equal(d.payload.entry,'app-privilege');
 assert.deepEqual(d.payload.execution.auth,r.nativeHttp.auth);
 assert.deepEqual(Object.keys(inventory.bindings).sort(),Object.keys(r.operations).sort());
 const tools=JSON.parse(readFileSync(join(root,'generated/tools.json'))).tools;
 assert.ok(tools.every(t=>r.operations[t.name].effect==='read'));
 for(const op of Object.values(r.operations))assert.equal(op.http.headers?.Accept??'application/json; version=10','application/json; version=10');
 for(const change of [c=>c.nativeHttp.basePath='/other/',c=>c.operations['documents.get'].http.path='/outside/{id}/',c=>c.operations['documents.get'].http.headers.Authorization='Token fake']){
  const c=structuredClone(r);change(c);assert.throws(()=>validateNativeRegistry(c,ctx));
 }
});

test('first-use verifies GET profile and emits only selected identity, never the profile token',async()=>{
 const calls=[];
 const credential=await enrollNative(r.nativeHttp,{token:'fixture-native-token'},authorization=>async request=>{
  calls.push({authorization,request});return reply({email:'reader@example.invalid',first_name:'Reader',last_name:'Fixture',auth_token:'fixture-native-token',social_accounts:[]});
 });
 assert.equal(calls.length,1);assert.equal(calls[0].request.method,'GET');assert.equal(calls[0].request.path,'/api/profile/');
 assert.equal(calls[0].authorization,'Token fixture-native-token');
 assert.deepEqual(credential.identity,{email:'reader@example.invalid',firstName:'Reader',lastName:'Fixture'});
 assert.equal(r.nativeHttp.auth.credentialPage,'dashboard');
 assert.match(r.nativeHttp.auth.instructions,/My Profile.*API Auth Token.*Copy/);
 assert.match(r.nativeHttp.auth.instructions,/invalidates your other clients/);
 assert.ok(Object.values(r.operations).every(o=>!o.http.path.includes('profile')&&!o.http.path.includes('token')));
});

test('API v10 page mapping is bounded, never follows the upstream next URL, and retains native task UUID',async()=>{
 const requests=[];
 const result=await invoke('documents.search',input('documents.search',{query:'fixture',tags:7}),async request=>{
  requests.push(request);return reply({results:[{id:requests.length,title:'fixture'}],next:requests.length===1?'https://elsewhere.invalid/private':null});
 });
 assert.equal(result.incomplete,false);assert.equal(result.items.length,2);
 assert.deepEqual(requests.map(q=>q.path),['/api/documents/','/api/documents/']);
 assert.deepEqual(requests.map(q=>q.query.get('page')),['1','2']);
 assert.ok(requests.every(q=>q.query.get('page_size')==='25'&&q.query.get('tags__id__all')==='7'));
 let count=0;
 const capped=await invoke('documents.list',{},async()=>reply({results:Array.from({length:25},()=>({id:++count,title:'fixture'})),next:'next'}));
 assert.equal(capped.items.length,1000);assert.equal(capped.incomplete,true);
 const taskId='01234567-89ab-4cde-8fab-0123456789ab';
 const tasks=await invoke('tasks.get',{taskId},async request=>{
  assert.equal(request.path,'/api/tasks/');assert.equal(request.query.get('task_id'),taskId);
  return reply({results:[{task_id:taskId,status:'success',related_document_ids:[42],owner:7}],next:null});
 });
 assert.deepEqual(tasks.items[0].related_document_ids,[42]);assert.equal(tasks.items[0].owner,7);
});

test('complete OCR and unpaginated notes reject bounds instead of silently slicing',async()=>{
 assert.equal(await invoke('documents.text',{id:1},async()=>reply({content:'a'.repeat(8000)})),'a'.repeat(8000));
 await assert.rejects(invoke('documents.text',{id:1},async()=>reply({content:'a'.repeat(8001)})));
 await assert.rejects(invoke('notes.list',{id:1},async()=>reply(Array.from({length:51},(_,i)=>({id:i+1,note:'x'})))));
 await assert.rejects(invoke('notes.list',{id:1},async()=>reply([{id:1,note:'a'.repeat(16001)}])));
 assert.throws(()=>input('documents.update',{id:1,tags:Array.from({length:26},(_,i)=>i+1)}));
 assert.throws(()=>input('documents.update',{id:1,owner:9}));assert.throws(()=>input('documents.update',{id:1}));
});

test('every selected mutation has a redacted nonmutating plan, confirmation, native request and readback',async()=>{
 for(const [name,op] of Object.entries(r.operations).filter(([,o])=>o.effect!=='read'&&o.flow.type==='invoke')){
  const resource=name.split('.')[0],verb=name.split('.')[1];
  const params=name==='documents.update'?{id:1,title:'private fixture'}:resource==='notes'?{id:1,...(verb==='add'?{note:'private fixture'}:{noteId:1})}:verb==='create'?{name:'private fixture'}:{id:1,name:'private fixture'};
  const checked=input(name,params),plan=requestPlan(d,name,checked);
  confirmOperation(op,false,true,plan);
  assert.throws(()=>confirmOperation(op,false,false,plan),e=>e.code==='CTL_CONFIRM_REQUIRED');
  confirmOperation(op,true,false,plan);
  assert.ok(!JSON.stringify(plan).includes('private fixture'));
  let current=resource==='notes'?[]:resource==='documents'?{id:1,title:'private fixture',correspondent:null,document_type:null,tags:[],owner:7}:{id:1,name:'private fixture',owner:7};
  const transport=async request=>{
   assert.equal(request.effect,op.effect);
   assert.ok(!Object.keys(request.headers??{}).some(k=>/cookie|authorization|synotoken|remote.user/i.test(k)));
   if(request.body){const body=JSON.parse(Buffer.from(request.body));assert.equal(body.owner,undefined);}
   if(resource==='notes'){
    if(verb==='add'){assert.deepEqual(JSON.parse(request.body),{note:'private fixture'});current=[{id:1,note:'private fixture'}];}
    else {assert.equal(request.method,'DELETE');assert.equal(request.query.get('id'),'1');current=[];}
   }
   return reply(current,verb==='create'?201:200);
  };
  const receipt=await invoke(name,checked,transport);
  assert.deepEqual(receipt,current);
  const readbackName=resource==='notes'?'notes.list':resource+'.get';
  const readback=await invoke(readbackName,{id:1},async request=>{assert.equal(request.method,'GET');return reply(current);});
  assert.equal(resource==='notes'?readback.length:readback.id,resource==='notes'?current.length:1);
 }
});

test('native errors do not cause mutation replay or administrator fallback',async()=>{
 for(const status of [401,403,503,302]){
  let calls=0;await assert.rejects(invoke('notes.add',{id:1,note:'fixture'},async()=>{calls++;return reply({},status);}));assert.equal(calls,1);
 }
 let calls=0;
 await assert.rejects(invoke('notes.add',{id:1,note:'fixture'},async()=>{calls++;return {status:200,headers:{'content-type':'application/json'},body:Readable.from((async function*(){yield '[';throw Error('private upstream exception');})())};}),e=>e.code==='CTL_NATIVE_OUTCOME_UNKNOWN'&&!e.message.includes('private'));
 assert.equal(calls,1);
});

test('upload/download are human-only client file flows and remain closed without the transfer module',async()=>{
 for(const name of ['documents.upload','documents.download']){
  const op=r.operations[name];assert.equal(op.ai,'human-only');assert.equal(op.kind,'stream');
  const local=op.flow.fileParam??op.flow.outputParam;
  assert.equal(op.paramsSchema.properties[local].writeOnly,true);
  const params=name.endsWith('upload')?{file:'fixture.pdf',title:'fixture'}:{id:1,output:'fixture.pdf'};
  const request=nativeRequest(op.http,params);assert.ok(!request.query.has(local));assert.ok(!request.body?.toString().includes('fixture.pdf'));
  await assert.rejects(invoke(name,params,async()=>{throw Error('must not request');}),e=>e.code==='CTL_NATIVE_TRANSFER_UNAVAILABLE');
 }
 assert.equal(r.operations['documents.upload'].flow.part,'document');
 assert.equal(r.operations['documents.download'].http.query.original.literal,'true');
});

test('inventory remains tied to every upstream router, explicit URL, decorated action and UI route',()=>{
 const result=spawnSync('python3',[join(root,'tests/ctl/inventory_test.py')],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
});

test('official client keeps both profiles separate, dry-run avoids secret reads, and denied entry stops native requests',async()=>{
 const {CtlClient}=await module('service');
 const {CtlStore}=await import(pathToFileURL(join(cli,'dist/nas/store.js')));
 const {NativeCredentialStore,nativeScope,nativeHostScope}=await module('native-store');
 const {CtlError}=await module('errors');
 const dir=mkdtempSync(join(tmpdir(),'paperless-ctl-'));
 const sessions=new Map(),secrets=new Map();let reads=0,calls=0,deny=false;
 const native=new NativeCredentialStore(dir,{get:async key=>{reads++;return secrets.get(key)??null;},set:async(key,value)=>{secrets.set(key,value);},delete:async key=>{secrets.delete(key);}});
 const store=new CtlStore(dir,{get:async key=>sessions.get(key)??null,set:async(key,value)=>{sessions.set(key,value);},delete:async key=>{sessions.delete(key);}},native);
 try{
  for(const name of ['reader','other']){
   const host={name,origin:'https://example.invalid',username:name,approved:{[d.payload.package.id]:{version:d.payload.package.version,hash:d.sha256}}};
   await store.add(host,{origin:host.origin,username:name,cookie:'id=fixture-dsm',token:'fixture-dsm'});
  }
  const request=async(_path,body)=>body instanceof URLSearchParams?{success:true,data:{total:1,packages:[{id:d.payload.package.id,version:d.payload.package.version}]}}:deny?{success:false,error:{code:'app_privilege_denied'}}:{success:true,data:d};
  const client=name=>new CtlClient(store,store.get(name),request,60000,{transportFor:(_app,authorization)=>async req=>{
   calls++;assert.equal(authorization,'Token fixture-native');
   if(req.path==='/api/documents/99/')throw new CtlError('CTL_NATIVE_ACCESS_DENIED','Forbidden native fixture','Inspect permissions',4);
   return reply({id:1,title:'fixture',correspondent:null,document_type:null,tags:[],owner:7});
  }});
  const first=client('reader');
  const planned=await first.execute(d.payload.package.id,['documents','update'],['--id','1','--title','fixture'],{dryRun:true});
  assert.equal(planned.dryRun,true);assert.equal(reads,0);assert.equal(calls,0);
  const key=nativeScope(store.get('reader'),d.payload.package.id,{authSha256:d.payload.authSha256});
  await native.set(key,nativeHostScope(store.get('reader')),{version:1,kind:'header',token:'fixture-native',verifiedAt:'fixture'});
  await assert.rejects(client('other').execute(d.payload.package.id,['documents','get'],['--id','1']),e=>e.code==='CTL_NATIVE_AUTH_REQUIRED');
  assert.equal(calls,0);
  assert.equal((await first.execute(d.payload.package.id,['documents','get'],['--id','1'])).owner,7);
  await assert.rejects(first.execute(d.payload.package.id,['documents','get'],['--id','99']),e=>e.code==='CTL_NATIVE_ACCESS_DENIED');assert.equal(calls,2);
  const before=reads;deny=true;
  await assert.rejects(first.execute(d.payload.package.id,['documents','get'],['--id','1']),e=>e.code==='CTL_PERMISSION_DENIED');
  assert.equal(reads,before);assert.equal(calls,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('published CLI accepts an authored empty native mutation acknowledgement; resource deletion stays excluded',async()=>{
 const deletion=structuredClone(r.operations['documents.get']);
 deletion.effect='destructive';deletion.ai='human-only';deletion.http.method='DELETE';
 deletion.http.response={statuses:[204],decode:'text',maxBytes:1,contentTypes:['application/json']};deletion.resultSchema={type:'object',properties:{ok:{const:true},status:{const:204}},required:['ok','status'],additionalProperties:false};
 assert.deepEqual(await executeNative(deletion,{id:1},r.nativeHttp,async()=>({status:204,headers:{},body:Readable.from([])})),{ok:true,status:204});
 assert.ok(!Object.values(r.operations).some(op=>op.http.response.statuses.includes(204)));
});


test('published file-flow callback uploads multipart, retains the UUID and downloads the exact original',async()=>{
 const {createNativeTransfer}=await module('native-transfers');
 const dir=mkdtempSync(join(tmpdir(),'paperless-files-'));
 const original=Buffer.from('%PDF-1.4\nfixture original\n%%EOF\n');
 const file=join(dir,'source.pdf'),output=join(dir,'original.pdf');
 const taskId='01234567-89ab-4cde-8fab-0123456789ab';
 writeFileSync(file,original,{mode:0o600});
 const transfer=createNativeTransfer();
 try{
  const receipt=await invoke('documents.upload',{file,title:'fixture'},async request=>{
   assert.equal(request.path,'/api/documents/post_document/');
   assert.match(request.headers['content-type'],/^multipart\/form-data; boundary=/);
   const chunks=[];for await(const chunk of request.body)chunks.push(chunk);
   const body=Buffer.concat(chunks);
   assert.equal(body.length,Number(request.headers['content-length']));
   assert.ok(body.includes(original));
   assert.match(body.toString(),/name="document"; filename="source.pdf"/);
   assert.ok(!body.toString().includes(dir));
   return reply(taskId);
  },{transfer});
  assert.deepEqual(receipt,{taskId});
  const downloaded=await invoke('documents.download',{id:42,output},async request=>{
   assert.equal(request.query.get('original'),'true');
   assert.ok(!request.query.has('output'));
   return {status:200,headers:{'content-type':'application/pdf','content-length':String(original.length)},body:Readable.from([original])};
  },{transfer});
  assert.equal(downloaded.bytes,original.length);
  assert.equal(downloaded.sha256,createHash('sha256').update(original).digest('hex'));
  assert.deepEqual(readFileSync(output),original);
  let calls=0;
  await assert.rejects(invoke('documents.download',{id:42,output},async()=>{calls++;throw Error('must not overwrite');},{transfer}));
  assert.equal(calls,0);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
