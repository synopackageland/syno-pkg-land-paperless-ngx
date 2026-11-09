import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {renderSharedFolderWizardFiles} from '../node_modules/@synopackageland/cli/dist/standalone/shared-folder.js';
import {folderPickerWizardFiles} from '../node_modules/@synopackageland/cli/dist/build-spk/folder-picker.js';
import {parse} from 'yaml';
const manifest=parse(readFileSync(new URL('../dsm-package.yaml',import.meta.url),'utf8'));
const folder=manifest.install.sharedFolder;
const files=folderPickerWizardFiles(manifest.package,folder,renderSharedFolderWizardFiles(manifest.package,folder));
function renderUpgrade(config,version={major:7,minor:2,micro:1}){
  const dir=mkdtempSync(join(tmpdir(),'folder-upgrade-'));
  try{
    writeFileSync(join(dir,'config.json'),JSON.stringify(config)+'\n');
    writeFileSync(join(dir,'VERSION'),`majorversion="${version.major}"\nminorversion="${version.minor}"\nmicro="${version.micro}"\n`);
    const script=files['upgrade_uifile.sh'].replaceAll('/etc/VERSION',join(dir,'VERSION'));
    const result=spawnSync('sh',['-s'],{input:script,encoding:'utf8',env:{...process.env,SYNOPKG_PKGVAR:dir,SYNOPKG_TEMP_LOGFILE:''}});
    assert.equal(result.status,0,result.stderr);
    const steps=JSON.parse(result.stdout),step=steps.find(s=>s.custom_render_fn || s.items?.some(i=>i.subitems?.[0]?.key==='consume'));
    if(step.custom_render_fn){
      const options=JSON.parse(step.custom_render_fn.trim().match(/\}\)\((\{[^\n]+\})\);$/)[1]);
      return {share:options.share,subpath:options.subpath};
    }
    const value=k=>step.items.find(i=>i.subitems?.[0]?.key===k).subitems[0].defaultValue;
    return {share:value('consume'),subpath:value('consume_subpath')};
  }finally{rmSync(dir,{recursive:true,force:true});}
}
test('wizard exposes share and relative subpath with native chooser only in dynamic pages',()=>{
 const steps=JSON.parse(files.install_uifile);
 assert.equal(steps[0].items.find(i=>i.subitems?.[0]?.key==='consume_subpath').subitems[0].defaultValue,'');
 assert.equal(steps.some(s=>s.custom_render_fn),false);
 assert.match(files['upgrade_uifile.sh'],/custom_render_fn/);
 assert.match(files['upgrade_uifile.sh'],/micro:-0/);
});
test('upgrade preserves a legacy selected share and defaults its absent subpath to the share root',()=>{
 assert.deepEqual(renderUpgrade({schema:1,shared_folders:{consume:'Documents'}}),{share:'Documents',subpath:''});
});
test('upgrade preserves a selected folder two levels deep',()=>{
 assert.deepEqual(renderUpgrade({schema:1,shared_folders:{consume:'Documents'},shared_folder_paths:{consume:'Incoming/Scans'}}),{share:'Documents',subpath:'Incoming/Scans'});
});

test('modern DSM upgrade renders the native folder chooser with the retained subtree',()=>{
 assert.deepEqual(renderUpgrade({schema:1,shared_folders:{consume:'Documents'},shared_folder_paths:{consume:'Incoming/Scans'}},{major:7,minor:3,micro:2}),{share:'Documents',subpath:'Incoming/Scans'});
});
