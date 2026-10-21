import {test} from '@e2e-dev/web';
import {signIn} from '@synopackageland/cli/e2e';
import {testCertificateTrust} from './desktop.ts';

for (const [sessionName,user] of [['admin','admin'], ['nonadmin','member']] as const) {
  test.setup(`DSM sign-in as ${user}`,{sessions:[sessionName],timeout:240_000},async ({app,session})=>{
    await testCertificateTrust(app);
    await signIn(app,user);
    await session.save(sessionName);
  });
}
