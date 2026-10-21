import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
import {dsmPage,profilePath,loadProfile,readAccount} from '@synopackageland/cli/e2e';
import {desktop} from './desktop.ts';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';

test('DSM App privileges admit a member and return 403 after explicit denial',
 {session:'admin',timeout:240_000},async ({app})=>{
  if(process.env.PAPERLESS_E2E_ALLOW_PRIVILEGE_FIXTURE!=='1') throw new Error('Enable only for this package and an authorized disposable member fixture');
  const account=readAccount(process.env.DSM_E2E_ACCOUNT_MEMBER!,'member');
  await desktop(app);const admin=dsmPage();
  const appId='SYNO.SDS.SynoPkgPaperlessNgx.Instance';
  const rule={entity_type:'user',entity_name:account.username,app_id:appId};
  async function rules(method:string,value?:any[]) {
   return admin.evaluate(async ({method,value,appId})=>{
    const body=new URLSearchParams({api:'SYNO.Core.AppPriv.Rule',version:'1',method});
    if(value)body.set('rules',JSON.stringify(value));else body.set('app_id',JSON.stringify(appId));
    const r=await fetch('/webapi/entry.cgi',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-SYNO-TOKEN':(window as any).SYNO.SDS.Session.SynoToken},body});
    return r.json();
   },{method,value,appId});
  }
  const before=await rules('list');expect(before.success).toBe(true);
  const original=before.data.rules.find((r:any)=>r.entity_type==='user'&&r.entity_name===account.username);
  const url=process.env.DSM_E2E_URL!;
  const profile=loadProfile(profilePath(process.env.DSM_E2E_TARGET||'dsm','member'),url);
  if(!profile)throw new Error('Run the member identity setup first to save a live shared DSM profile');
  profile.cookies=profile.cookies.filter((c:any)=>['id','did','_SSID','stay_login'].includes(c.name));
  profile.origins=[];
  const gateway=new URL(url);gateway.port='28993';gateway.pathname='/';gateway.search='';
  async function probe() {
   const context=await admin.context().browser()!.newContext({storageState:profile,ignoreHTTPSErrors:process.env.PAPERLESS_E2E_TRUST_CERTIFICATE==='1'});
   try {
    const page=await context.newPage();
    let navigationStatus:number|undefined;
    page.on('response',response=>{if(response.request().isNavigationRequest()&&new URL(response.url()).origin===gateway.origin)navigationStatus=response.status();});
    const response=await page.goto(gateway.href,{waitUntil:'domcontentloaded',timeout:15_000});
    await page.waitForURL(url=>url.port==='28993',{waitUntil:'domcontentloaded',timeout:15_000});
    await page.waitForFunction(()=>document.querySelector('[data-error-code]')||document.querySelector('#userDropdown'),{timeout:15_000});
    const error=await page.evaluate(()=>document.querySelector('[data-error-code]')?.getAttribute('data-error-code'));
    const status=error?navigationStatus:await page.evaluate(async()=>(await fetch('/api/profile/')).status);
    const result={profile:status,error};
    const current=new URL(page.url());return {initial:response?.status(),path:current.pathname,...result};
   } finally{await context.close();}
  }
  let allowed:any,denied:any;
  try {
   expect((await rules('set',[{...rule,allow_ip:['0.0.0.0'],deny_ip:[]}])).success).toBe(true);
   await expect.poll(async()=>{allowed=await probe();writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'admission-allow.json'),JSON.stringify(allowed),{mode:0o600});return allowed.profile;},{timeout:45_000,intervals:[3_000]}).toBe(200);
   expect((await rules('set',[{...rule,allow_ip:[],deny_ip:['0.0.0.0']}])).success).toBe(true);
   writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'denied-rules.json'),JSON.stringify(await rules('list')),{mode:0o600});
   await expect.poll(async()=>{
    denied=await probe();
    writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'admission.json'),JSON.stringify({allowed,denied}),{mode:0o600});
    return denied.profile;
   },{timeout:45_000,intervals:[3_000]}).toBe(403);
  } finally {
   const restored=original?await rules('set',[original]):await rules('delete',[rule]);
   expect(restored.success).toBe(true);
   const after=await rules('list');expect(after.success).toBe(true);
   expect(after.data.rules.find((r:any)=>r.entity_type==='user'&&r.entity_name===account.username)).toEqual(original);
   writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'admission-restored.json'),JSON.stringify({restored:true}),{mode:0o600});
  }
});
