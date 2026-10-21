import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
import {dsmPage} from '@synopackageland/cli/e2e';
import {desktop} from './desktop.ts';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
test('upstream logout returns to DSM OIDC without a second password',{session:'admin',timeout:180_000},async ({app})=>{
 await desktop(app);const dsm=dsmPage();const page=await dsm.context().newPage();
 if(process.env.PAPERLESS_E2E_TRUST_CERTIFICATE==='1'){const c=await page.context().newCDPSession(page);await c.send('Security.setIgnoreCertificateErrors',{ignore:true});}
 const origin=new URL(dsm.url());origin.port='28993';origin.pathname='/';origin.search='';
 try {
  await page.goto(origin.href,{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(async()=>(await fetch('/api/profile/')).status),{timeout:60_000}).toBe(200);
  const before=(await page.context().cookies()).find(c=>c.name==='sessionid')?.value;
  await page.locator('a[href="accounts/logout/"]').waitFor({state:'attached',timeout:60_000});
  await page.locator('#userDropdown').click();
  const logoutResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/accounts/logout/'&&r.request().method()==='GET');
  await page.getByRole('link',{name:'Logout',exact:true}).click();
  const loggedOut=await logoutResponse;
  expect(loggedOut.status()).toBe(302);
  await page.goto(origin.href,{waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(async()=>(await fetch('/api/profile/')).status),{timeout:60_000}).toBe(200);
  expect(await page.locator('input[type=password]:visible').count()).toBe(0);
  const after=(await page.context().cookies()).find(c=>c.name==='sessionid')?.value;
  expect(!!after&&before!==after).toBe(true);
  writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'logout-result.json'),JSON.stringify({nativeLogoutStatus:loggedOut.status(),sessionRotated:true,reopenedWithoutPassword:true}),{mode:0o600});
  await page.screenshot({path:join(process.env.DSM_E2E_OUTPUT_DIR!,'logout-reopen.png')});
 }finally{await page.close();}
});
