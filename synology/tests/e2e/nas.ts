// Caller owns the documented SSH tunnel; credentials/profiles/output stay private.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { protectE2eOutput } from '@synopackageland/cli/e2e';
const root = resolve(import.meta.dirname, '../..');
for (const key of ['DSM_E2E_URL', 'DSM_E2E_ACCOUNT_ADMIN', 'DSM_E2E_PROFILE_DIR', 'DSM_E2E_OUTPUT_DIR']) {
  if (!process.env[key]) throw new Error(`Set ${key}; accounts and profiles must be outside the repository`);
}
const out = resolve(process.env.DSM_E2E_OUTPUT_DIR!);
if (!out.startsWith(root + '/.e2e/')) throw new Error('Use an ignored .e2e run directory; archive evidence outside after the run');
for (const key of ['DSM_E2E_ACCOUNT_ADMIN', 'DSM_E2E_PROFILE_DIR']) {
  if (resolve(process.env[key]!).startsWith(root + '/')) throw new Error('Keep credentials and saved profiles outside the repository');
}
await mkdir(out, {recursive: true, mode: 0o700});
const child = spawn(process.execPath, [join(root, 'node_modules/e2e/dist/cli/bin.js'), 'run',
  '--config', 'e2e.config.ts', '--output', out, ...process.argv.slice(2)], {
  cwd: root, stdio: ['inherit', 'pipe', 'pipe'],
  env: {...process.env, E2E_TELEMETRY_DISABLED: '1', E2E_LLM_CALLS: join(out, 'llm-calls.jsonl')},
});
// Use the SDK helper's redaction rather than another secret masker.
const {redactDsmSecrets} = await import('@synopackageland/cli/e2e');
child.stdout?.on('data', data => process.stdout.write(redactDsmSecrets(String(data)).replace(/([?&](?:assertion|code|state|txn)=)[^&\s\"<>]+/g,'$1[REDACTED]')));
child.stderr?.on('data', data => process.stderr.write(redactDsmSecrets(String(data)).replace(/([?&](?:assertion|code|state|txn)=)[^&\s\"<>]+/g,'$1[REDACTED]')));
const code = await new Promise<number>(resolve => child.once('exit', value => resolve(value ?? 1)));
protectE2eOutput(out);
const report = await readFile(join(out, 'report.json'), 'utf8').then(JSON.parse, () => null);
if (report) await writeFile(join(out, 'run-summary.json'), JSON.stringify({exitCode: code, reportPresent: true})+'\n', {mode:0o600});
process.exitCode = code;
