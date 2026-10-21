import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
import {dsmPage} from '@synopackageland/cli/e2e';
import {desktop} from './desktop.ts';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';

test('public upstream delegates API tokens and anonymous browser login to Paperless',
 {session:'admin',timeout:180_000},async({app})=>{
  await desktop(app);const dsm=dsmPage();
  const origin=new URL(dsm.url());origin.port='28993';origin.pathname='/';origin.search='';
  const page=await dsm.context().newPage();
  const anonymous=await dsm.context().browser()!.newContext({ignoreHTTPSErrors:process.env.PAPERLESS_E2E_TRUST_CERTIFICATE==='1'});
  try {
   if(process.env.PAPERLESS_E2E_TRUST_CERTIFICATE==='1') {
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Security.setIgnoreCertificateErrors',{ignore:true});
   }
   await page.goto(origin.href,{waitUntil:'domcontentloaded'});
   await expect.poll(()=>page.evaluate(async()=>(await fetch('/api/profile/')).status),{timeout:60_000}).toBe(200);
   // Token stays in memory. Persist status evidence only, never token/profile bodies.
   const token=await page.evaluate(async()=>{
    const p=await fetch('/api/profile/').then(r=>r.json());
    if(p.auth_token)return p.auth_token;
    const csrf=document.cookie.split('; ').find(x=>x.startsWith('csrftoken='))?.slice('csrftoken='.length);
    if(!csrf)throw new Error('Missing native CSRF cookie');
    const r=await fetch('/api/profile/generate_auth_token/',{method:'POST',headers:{'X-CSRFToken':decodeURIComponent(csrf)}});
    if(!r.ok)throw new Error('Native token generation failed');return r.json();
   });
   // Use the same pinned runner ledger as the CLI DSM helper, including failure logs.
   const {processSecrets}=await import(new URL('run/secrecy.js',import.meta.resolve('e2e')).href);
   processSecrets.register('paperless.apiToken',token);
   const unauthenticated=await anonymous.request.get(origin.origin+'/api/documents/',{maxRedirects:0});
   expect(unauthenticated.status()).toBe(401);
   const authenticated=await anonymous.request.get(origin.origin+'/api/documents/',{headers:{Authorization:'Token '+token},maxRedirects:0});
   expect(authenticated.status()).toBe(200);
   const invalid=await anonymous.request.get(origin.origin+'/api/documents/',{headers:{Authorization:'Token invalid-acceptance-token'},maxRedirects:0});
   expect(invalid.status()).toBe(401);
   const web=await anonymous.newPage();
   const paths:string[]=[];
   web.on('request',r=>{if(r.isNavigationRequest())paths.push(new URL(r.url()).pathname);});
   await web.goto(origin.href,{waitUntil:'domcontentloaded'});
   await expect.poll(()=>paths.some(p=>p.startsWith('/_sso/')),{timeout:45_000}).toBe(true);
   expect(paths.some(p=>p.startsWith('/accounts/oidc/dsm/login/'))).toBe(true);
   expect(await web.locator('form[action*="accounts/login"] input[type=password]').count()).toBe(0);
   writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'native-api.json'),JSON.stringify({withoutToken:unauthenticated.status(),withToken:authenticated.status(),invalidToken:invalid.status(),noDsmCookiesSent:true,ssoRedirect:true,nativeOidcRedirect:true}),{mode:0o600});
   await web.screenshot({path:join(process.env.DSM_E2E_OUTPUT_DIR!,'anonymous-sso.png')});
  }finally{await anonymous.close();await page.close();}
 });
