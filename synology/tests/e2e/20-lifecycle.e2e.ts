import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
import {dsmPage} from '@synopackageland/cli/e2e';
import {desktop} from './desktop.ts';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

for(const step of ['restart','upgrade','reinstall-keep'] as const) {
  test(`native ${step} preserves OCR document identities and content`,{session:'admin',timeout:900_000},async ({app})=>{
    const control=process.env.PAPERLESS_E2E_CONTROL;
    if(!control) throw new Error('Set PAPERLESS_E2E_CONTROL to the private lifecycle driver');
    const baseline=JSON.parse(readFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'documents-baseline.json'),'utf8'));
    expect(baseline.length).toBeGreaterThanOrEqual(2);
    execFileSync('python3',[control,step],{stdio:'inherit',timeout:600_000});
    await desktop(app);
    const page=dsmPage();
    await page.locator('#sds-taskbar button.start-button-img').click();
    const [paperless]=await Promise.all([
      page.context().waitForEvent('page',{timeout:30_000}),
      page.getByRole('menuitem',{name:'Paperless-ngx',exact:true}).click(),
    ]);
    try {
      if(process.env.PAPERLESS_E2E_TRUST_CERTIFICATE==='1') {
        const cdp=await paperless.context().newCDPSession(paperless);
        await cdp.send('Security.setIgnoreCertificateErrors',{ignore:true});
        const gateway=new URL(page.url());gateway.port='28993';gateway.pathname='/';gateway.search='';
        await paperless.goto(gateway.href,{waitUntil:'domcontentloaded'});
      }
      await expect.poll(()=>paperless.evaluate(async()=>(await fetch('/api/profile/')).status),{timeout:90_000}).toBe(200);
      const actual=await paperless.evaluate(async()=>{
        const r=await fetch('/api/documents/?ordering=id');
        if(!r.ok) throw new Error('Document inventory request failed');
        return (await r.json()).results.map((d:any)=>({id:d.id,content:d.content}));
      });
      expect(actual).toEqual(baseline);
      await paperless.screenshot({path:join(process.env.DSM_E2E_OUTPUT_DIR!,step+'.png')});
    } finally {await paperless.close();}
  });
}
