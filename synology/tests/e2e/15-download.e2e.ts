import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
import {dsmPage} from '@synopackageland/cli/e2e';
import {desktop} from './desktop.ts';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
test('authenticated native download endpoint returns a PDF',{session:'admin',timeout:180_000},async ({app})=>{
 await desktop(app);const dsm=dsmPage();const page=await dsm.context().newPage();
 if(process.env.PAPERLESS_E2E_TRUST_CERTIFICATE==='1'){const c=await page.context().newCDPSession(page);await c.send('Security.setIgnoreCertificateErrors',{ignore:true});}
 const origin=new URL(dsm.url());origin.port='28993';origin.pathname='/';origin.search='';
 await page.goto(origin.href,{waitUntil:'domcontentloaded'});
 try {
  await expect.poll(()=>page.evaluate(async()=>(await fetch('/api/profile/')).status),{timeout:90_000}).toBe(200);
  const result=await page.evaluate(async()=>{
   const list=await fetch('/api/documents/').then(r=>r.json());const docs=list.results;
   const results=[];
   for(const d of docs.slice(0,10)){
    const r=await fetch('/api/documents/'+d.id+'/download/');
    results.push({id:d.id,status:r.status,type:r.headers.get('content-type'),body:r.ok?new TextDecoder().decode((await r.arrayBuffer()).slice(0,5)):await r.text()});
   }
   return results;
  });
  writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'downloads.json'),JSON.stringify(result),{mode:0o600});
  expect(result.length).toBeGreaterThan(0);
  expect(result.every(r=>r.status===200&&r.body==='%PDF-')).toBe(true);
 }finally{await page.close();}
});
