import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
import {dsmPage,registerDsmSecrets} from '@synopackageland/cli/e2e';
import {desktop} from './desktop.ts';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';

async function openPaperless(app:any) {
  await desktop(app);
  const page=dsmPage();
  await registerDsmSecrets(page);
  if (process.env.PAPERLESS_E2E_TRUST_CERTIFICATE === '1') {
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Security.setIgnoreCertificateErrors',{ignore:true});
  }
  await page.locator('#sds-taskbar button.start-button-img').click();
  const [paperless]=await Promise.all([
    page.context().waitForEvent('page',{timeout:30_000}),
    page.getByRole('menuitem',{name:'Paperless-ngx',exact:true}).click(),
  ]);
  if(process.env.PAPERLESS_E2E_TRUST_CERTIFICATE==='1') {
    const cdp=await paperless.context().newCDPSession(paperless);
    await cdp.send('Security.setIgnoreCertificateErrors',{ignore:true});
    const gateway=new URL(page.url());gateway.port='28993';gateway.pathname='/';gateway.search='';
    await paperless.goto(gateway.href,{waitUntil:'domcontentloaded'});
  }
  paperless.setDefaultTimeout(30_000);
  await paperless.screenshot({path:join(process.env.DSM_E2E_OUTPUT_DIR!,'launch-before-ready.png')});
  writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'launch-state.json'),JSON.stringify({urlOrigin:new URL(paperless.url()).origin,path:new URL(paperless.url()).pathname,title:await paperless.title()}),{mode:0o600});
  await paperless.waitForURL(url=>url.port==='28993',{timeout:90_000,waitUntil:'domcontentloaded'});
  await expect.poll(async()=>paperless.evaluate(async()=>{const r=await fetch('/api/profile/');return r.status;}),{timeout:90_000,intervals:[2_000]}).toBe(200);
  await paperless.screenshot({path:join(process.env.DSM_E2E_OUTPUT_DIR!,'signed-in.png')});
  expect(await paperless.locator('input[type=password]:visible').count()).toBe(0);
  return paperless;
}

test('DSM menu signs in with OIDC; PDF upload is searchable and downloadable',
  {session:'admin',timeout:600_000},async ({app})=>{
    const page=await openPaperless(app);
    try {
      const fixture=process.env.PAPERLESS_E2E_PDF;
      const query=process.env.PAPERLESS_E2E_SEARCH;
      if (!fixture||!query) throw new Error('Set PAPERLESS_E2E_PDF to a scanned PDF and PAPERLESS_E2E_SEARCH to its OCR text');
      const previousIds=await page.evaluate(async()=>{const r=await fetch('/api/documents/');if(!r.ok)throw new Error('Cannot read upload baseline');return (await r.json()).results.map((d:any)=>d.id);});
      const input=page.locator('input[type=file]').first();
      await input.setInputFiles(resolve(fixture));
      await expect.poll(async()=>page.evaluate(async ({query,previousIds})=>{
        const r=await fetch('/api/documents/?query='+encodeURIComponent(query));
        if(!r.ok)throw new Error('OCR search request failed');
        return (await r.json()).results.some((d:any)=>!previousIds.includes(d.id)&&d.content.toLowerCase().includes(query.toLowerCase()));
      },{query,previousIds}),{timeout:240_000,intervals:[5_000]}).toBe(true);
      await page.getByRole('link',{name:'Documents',exact:true}).click();
      const search=page.locator('input[name=query]').first();
      await expect.poll(async()=>{
        await search.fill(query);
        await search.press('Enter');
        return page.locator('pngx-document-card-large, pngx-document-card-small').count();
      },{timeout:240_000,intervals:[5_000]}).toBeGreaterThan(0);
      const download=page.waitForEvent('download',{timeout:90_000}).then(value=>({value}),error=>({error:String(error)}));
      const response=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/download/'),{timeout:60_000});
      await page.locator('pngx-document-card-large, pngx-document-card-small').first().getByRole('link',{name:'Download',exact:true}).click();
      const downloadResponse=await response;
      writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'download-response.json'),JSON.stringify({status:downloadResponse.status(),contentType:downloadResponse.headers()['content-type'],disposition:downloadResponse.headers()['content-disposition'],path:new URL(downloadResponse.url()).pathname,body:downloadResponse.status()===200?undefined:await downloadResponse.text()}),{mode:0o600});
      expect(downloadResponse.status()).toBe(200);
      const outcome=await download;
      if(!('value' in outcome)) throw new Error(outcome.error);
      const saved=outcome.value;
      const downloaded=join(process.env.DSM_E2E_OUTPUT_DIR!,'download.pdf');
      await saved.saveAs(downloaded);
      expect(readFileSync(downloaded).subarray(0,5).toString()).toBe('%PDF-');
      const control=process.env.PAPERLESS_E2E_CONTROL;
      if(!control) throw new Error('Set PAPERLESS_E2E_CONTROL to the private fixture driver');
      execFileSync('python3',[control,'consume'],{stdio:'inherit',timeout:120_000});
      await expect.poll(async()=>page.evaluate(async()=>{
        const r=await fetch('/api/documents/?query=magnolia');
        if(!r.ok) throw new Error('Document search request failed');
        return (await r.json()).count;
      }),{timeout:240_000,intervals:[5_000]}).toBeGreaterThan(0);
      const baseline=await page.evaluate(async()=>{
        const r=await fetch('/api/documents/?ordering=id');
        if(!r.ok) throw new Error('Document inventory request failed');
        return (await r.json()).results.map((d:any)=>({id:d.id,content:d.content}));
      });
      writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'documents-baseline.json'),JSON.stringify(baseline),{mode:0o600});
      await page.screenshot({path:join(process.env.DSM_E2E_OUTPUT_DIR!,'document.png')});
    } finally {
      await page.screenshot({path:join(process.env.DSM_E2E_OUTPUT_DIR!,'last-page.png')}).catch(()=>{});
      await page.close();
    }
});
