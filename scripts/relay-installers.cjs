const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
(async()=>{
const url=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')).inputs.artifact_url;
console.log('::add-mask::'+url);
const parsed=new URL(url);assert.equal(parsed.protocol,'https:');assert.ok(parsed.hostname.endsWith('.blob.core.windows.net')||parsed.hostname.endsWith('.actions.githubusercontent.com'));
const response=await fetch(url,{signal:AbortSignal.timeout(180000)});assert.equal(response.status,200,'Accepted artifact download failed');
const zip=Buffer.from(await response.arrayBuffer());assert.equal(zip.length,162966092);assert.equal(crypto.createHash('sha256').update(zip).digest('hex'),'9c076d9bab8cf8668120ae4485a315f00daf6dfa736e461ff6b5d0cedb135ace');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'verified-installers-'));const archive=path.join(dir,'accepted.zip');fs.writeFileSync(archive,zip);
const python=`import zipfile,hashlib,pathlib,sys\nz=zipfile.ZipFile(sys.argv[1]); out=pathlib.Path(sys.argv[2])\nitems=[('sources/cantine/dist/ريستو Setup 1.3.3.exe','resto-1.3.3.exe','1d1cf66102b5b5b4dd570afc9a3a39847e8cfde39d731c43ede4c32a8ba8dd57'),('sources/econome/dist/ECONOME Setup 1.3.11.exe','econome-1.3.11.exe','24ff602f228d2494b07f8f5218a0a8e33b967f42a96f8b233c1b518c565a8a2b')]\nfor suffix,name,digest in items:\n matches=[x for x in z.namelist() if x.endswith(suffix)]\n assert len(matches)==1\n data=z.read(matches[0]); assert hashlib.sha256(data).hexdigest()==digest\n (out/name).write_bytes(data)\n print('Verified',name,digest)\n`;
const extract=cp.spawnSync('python3',['-c',python,archive,dir],{encoding:'utf8'});assert.equal(extract.status,0,'Exact accepted installer extraction failed');process.stdout.write(extract.stdout);
const repo='beddiarhoussemeddin-gif/institution-desktop-releases';
const uploaded=cp.spawnSync('gh',['release','upload','v2026.11.18',path.join(dir,'resto-1.3.3.exe'),path.join(dir,'econome-1.3.11.exe'),'--repo',repo],{encoding:'utf8',timeout:300000});assert.equal(uploaded.status,0,'Draft installer upload failed');
console.log('Both verified installers uploaded to the existing draft; publication remains a separate verified step.');
})().catch(()=>{console.error('Verified artifact relay failed; no publication performed.');process.exitCode=1;});
