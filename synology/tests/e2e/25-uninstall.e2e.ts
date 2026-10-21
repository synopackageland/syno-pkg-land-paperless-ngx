import {test} from '@e2e-dev/web';
import {expect} from 'e2e';
import {dsmPage} from '@synopackageland/cli/e2e';
import {desktop} from './desktop.ts';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

test('delete-data uninstall completes through the native package API',
 {session:'admin',timeout:240_000},async ({app})=>{
  if(process.env.PAPERLESS_E2E_DELETE_FIXTURE!=='1')throw new Error('Enable only for the authorized disposable package fixture after retained-data tests');
  await desktop(app);const page=dsmPage();
  const reply=await page.evaluate(async()=>{
   const body=new URLSearchParams({api:'SYNO.Core.Package.Uninstallation',version:'1',method:'uninstall',id:JSON.stringify('SynoPkgPaperlessNgx'),dsm_apps:JSON.stringify('SYNO.SDS.SynoPkgPaperlessNgx.Instance '),extra_values:JSON.stringify(JSON.stringify({pkgwizard_remove_additional:true}))});
   const r=await fetch('/webapi/entry.cgi',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-SYNO-TOKEN':(window as any).SYNO.SDS.Session.SynoToken},body});
   return r.json();
  });
  writeFileSync(join(process.env.DSM_E2E_OUTPUT_DIR!,'uninstall-reply.json'),JSON.stringify(reply),{mode:0o600});
  expect(reply.success).toBe(true);
});
