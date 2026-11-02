import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
import {dsmPage} from '@synopackageland/cli/e2e';
import {desktop} from './desktop.ts';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';

test('fixed DSM path serves native pages, assets, API and WebSocket',
 {session:'admin',timeout:180_000},async({app})=>{
  await desktop(app);
  const page=await dsmPage().context().newPage();
  const prefix='/synopkgland/SynoPkgPaperlessNgx/';
  const url=new URL(prefix,dsmPage().url());
  const resources:{path:string,status:number,type:string}[]=[];
  const failed:string[]=[];
  page.on('response',r=>{
   const path=new URL(r.url()).pathname;
   if(path.startsWith(prefix))resources.push({path,status:r.status(),type:r.request().resourceType()});
  });
  page.on('requestfailed',r=>{if(new URL(r.url()).pathname.startsWith(prefix))failed.push(new URL(r.url()).pathname);});
  try {
   await page.goto(url.href,{waitUntil:'domcontentloaded'});
   await page.locator('pngx-dashboard pngx-page-header').waitFor({timeout:90_000});
   expect(await page.locator('base').getAttribute('href')).toBe(prefix);
   const socket=await page.evaluate(async prefix=>{
    const url=new URL(prefix+'ws/status/',location.href);url.protocol='wss:';
    return new Promise<string>(resolve=>{
     const ws=new WebSocket(url);
     const timer=setTimeout(()=>{ws.close();resolve('timeout');},15_000);
     ws.onopen=()=>{clearTimeout(timer);ws.close();resolve('open');};
     ws.onerror=()=>{clearTimeout(timer);ws.close();resolve('error');};
    });
   },prefix);
   expect(socket).toBe('open');
   for(const route of ['documents','tags','settings']){
    await page.goto(new URL(route,url).href,{waitUntil:'domcontentloaded'});
    await expect.poll(()=>page.evaluate(async()=>(await fetch('/synopkgland/SynoPkgPaperlessNgx/api/profile/')).status),{timeout:30_000}).toBe(200);
    await page.locator('pngx-page-header').first().waitFor({timeout:30_000});
   }
   expect(resources.some(r=>r.path.startsWith(prefix+'static/')&&r.type==='script'&&r.status===200)).toBe(true);
   expect(resources.filter(r=>r.status>=400)).toEqual([]);
   expect(failed).toEqual([]);
   writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'ingress-resources.json'),JSON.stringify({socket,resources,failed}),{mode:0o600});
   await page.screenshot({path:join(process.env.DSM_E2E_OUTPUT_DIR!,'ingress-pages.png')});
  }finally{await page.close();}
 });
