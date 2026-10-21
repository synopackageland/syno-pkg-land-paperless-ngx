import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
import {dsmPage} from '@synopackageland/cli/e2e';
import {desktop} from './desktop.ts';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
for(const session of ['admin','nonadmin']) {
 test(`OIDC ${session} creates a distinct native account without local password`,{session,timeout:180_000},async ({app})=>{
  await desktop(app);const dsm=dsmPage();const page=await dsm.context().newPage();
  if(process.env.PAPERLESS_E2E_TRUST_CERTIFICATE==='1'){const c=await page.context().newCDPSession(page);await c.send('Security.setIgnoreCertificateErrors',{ignore:true});}
  const origin=new URL(dsm.url());origin.port='28993';origin.pathname='/';origin.search='';
  try{
   await page.goto(origin.href,{waitUntil:'domcontentloaded'});
   await expect.poll(()=>page.evaluate(async()=>(await fetch('/api/profile/')).status),{timeout:90_000}).toBe(200);
   const result=await page.evaluate(async()=>{
    const p=await fetch('/api/profile/').then(r=>r.json());
    const ui=await fetch('/api/ui_settings/').then(r=>r.json());
    return {hasPassword:p.has_usable_password,providers:p.social_accounts.map((a:any)=>a.provider),ui};
   });
   expect(result.hasPassword).toBe(false);
   expect(result.providers).toContain('dsm');
   // Never persist auth_token or unfiltered profile data.
   writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,session+'-identity.json'),JSON.stringify({hasPassword:result.hasPassword,providers:result.providers,userId:result.ui.user?.id,isSuperuser:result.ui.user?.is_superuser}),{mode:0o600});
   await page.screenshot({path:join(process.env.DSM_E2E_OUTPUT_DIR!,session+'-identity.png')});
  } finally{await page.close();}
 });
}
