import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {setTimeout as pause} from 'node:timers/promises';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const apiPort=process.env.API_PORT || '4001';
const webPort=process.env.ONEPAY_WEB_PORT || '8082';
for (const port of [apiPort,webPort]) { if (!/^\d+$/.test(port) || Number(port)<1 || Number(port)>65535) throw new Error('Preview ports must be between 1 and 65535.'); }
const apiOrigin=`http://localhost:${apiPort}`;
const webOrigin=`http://localhost:${webPort}`;
const children=[];
async function responds(url,verify){try{const response=await fetch(url,{signal:AbortSignal.timeout(2000)});return response.ok && verify(await response.text());}catch{return false;}}
function launch(args,cwd,env){const child=spawn(process.execPath,args,{cwd,env:{...process.env,...env},stdio:'inherit'});children.push(child);child.on('error',error=>{console.error(error.message);stop(1);});child.on('exit',code=>{if(code)stop(code);});}
function stop(code=0){for(const child of children)child.kill();process.exitCode=code;}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
if(await responds(`${apiOrigin}/health`,body=>{try{return JSON.parse(body).mode==='development';}catch{return false;}}))console.log(`Reusing development API: ${apiOrigin}`);
else launch(['--import','tsx','backend/main.ts'],root,{API_PORT:apiPort});
if(await responds(webOrigin,body=>body.includes('OnePay')))console.log(`OnePay preview already running: ${webOrigin}`);
else launch([path.join(root,'node_modules/expo/bin/cli'),'start','--web','--localhost','--port',webPort],path.join(root,'apps/mobile'),{EXPO_PUBLIC_API_URL:apiOrigin});
console.log(`\nOPEN THE APP: ${webOrigin}\nAPI ONLY: ${apiOrigin}\nUse fictional development data. Ctrl+C stops services started by this command.\n`);

if (!process.argv.includes('--no-open')) {
  let ready=false;
  for(let attempt=0;attempt<60;attempt++) {
    if(await responds(webOrigin,body=>body.includes('OnePay'))) {ready=true;break;}
    await pause(500);
  }
  if(ready) {
    const opener=process.platform==='win32'
      ? spawn('rundll32.exe',['url.dll,FileProtocolHandler',webOrigin],{stdio:'ignore',windowsHide:true})
      : spawn(process.platform==='darwin'?'open':'xdg-open',[webOrigin],{stdio:'ignore'});
    opener.on('error',()=>console.log('Open the app in your browser: '+webOrigin));
    opener.unref();
  } else console.error('The website has not become ready. Check the Metro output above, then open '+webOrigin);
}
