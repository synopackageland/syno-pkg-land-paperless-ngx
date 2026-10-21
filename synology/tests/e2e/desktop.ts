import {dsmPage, openDesktop} from '@synopackageland/cli/e2e';

export async function testCertificateTrust(app:any) {
  if (process.env.PAPERLESS_E2E_TRUST_CERTIFICATE !== '1') return;
  const bootstrap=process.env.DSM_E2E_BOOTSTRAP_URL;
  if (!bootstrap) throw new Error('Set a reachable HTTP DSM_E2E_BOOTSTRAP_URL for test-only TLS setup');
  await app.open(bootstrap);
  const page=dsmPage();
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Security.setIgnoreCertificateErrors',{ignore:true});
}

export async function desktop(app:any) {
  await testCertificateTrust(app);
  try {return await openDesktop(app);}
  catch(error) {
    if (!(error instanceof Error)||!error.message.includes('#sds-desktop')) throw error;
    await dsmPage().locator('#sds-desktop').waitFor({state:'visible',timeout:120_000});
    return openDesktop(app);
  }
}
