import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

const params = new URL(import.meta.url).searchParams;
const name = params.get('name') ?? process.argv[2] ?? 'arena-review';
if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid capture name');
const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'oak-arena-'));
const outDir = path.join(temp, 'build');
const artifact = path.join(root, 'docs/visual/screenshots', `${name}.png`);
fs.mkdirSync(path.dirname(artifact), { recursive: true });
await build({
  configFile: false, base: './', logLevel: 'warn',
  plugins: [{ name: 'review-inline-art', enforce: 'pre', transform(code, id) {
    const normalized = id.replaceAll('\\', '/');
    if(normalized.endsWith('/src/visual/fonts.ts')) {
      const fontData=Object.fromEntries(['imfellenglish','alegreya','alegreyasans'].map(name=>[name,'data:font/ttf;base64,'+fs.readFileSync(path.join(root,'public/fonts',name+'.ttf')).toString('base64')]));
      code='const reviewFonts='+JSON.stringify(fontData)+';\n'+code.replace('`url(${import.meta.env.BASE_URL}fonts/${file}.ttf)`', "'url('+reviewFonts[file]+')'");
    }
    if (name.includes('before') && normalized.endsWith('/src/scenes/DefenseScene.ts')) {
      code = fs.readFileSync(path.join(root, 'docs/visual/before/DefenseScene.ts'), 'utf8');
    }
    if (normalized.endsWith('/src/visual/art.ts') || normalized.endsWith('/src/visual/arenaArt.ts')) {
      const arena = normalized.endsWith('/arenaArt.ts');
      const folder = arena ? 'public/art/arena' : 'public/art';
      const data = Object.fromEntries(fs.readdirSync(folder).filter(name => name.endsWith('.png')).map(name =>
        [name.slice(0,-4), `data:image/png;base64,${fs.readFileSync(path.join(folder,name)).toString('base64')}`]));
      code = arena ? code.replace(/const arenaUrls = Object\.fromEntries\([\s\S]*?as Record<ArenaKey, string>;/, `const arenaUrls = ${JSON.stringify(data)} as Record<ArenaKey, string>;`)
        : code.replace(/const urls = Object\.fromEntries\([\s\S]*?as Record<ArtKey, string>;/, `const urls = ${JSON.stringify(data)} as Record<ArtKey, string>;`);
    }
    if(normalized.includes('/src/visual/')) {
      code = code.replace(/new URL\(\s*'([^']+\.(?:jpg|jfif))',\s*import\.meta\.url\s*\)\.href/g, (_, file) =>
        JSON.stringify(`data:image/jpeg;base64,${fs.readFileSync(path.resolve(path.dirname(id),file)).toString('base64')}`));
    }
    return code;
  }}],
  build: { outDir, emptyOutDir: false, copyPublicDir: false,
    lib: { entry: path.join(root, 'tools/arena-review.ts'), formats: ['iife'], name: 'OakArenaReview', fileName: () => 'review.js' },
  },
});
fs.writeFileSync(path.join(outDir, 'index.html'), '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:960px;height:540px;overflow:hidden;background:#19221d}canvas{display:block}</style><body><script>window.addEventListener("error",e=>{document.body.dataset.error="true";document.body.innerText=e.message;});</script><script src="review.js"></script></body>');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = path.join(temp,'profile');
const browser = spawn(chrome, ['--headless=new','--no-first-run','--no-default-browser-check',
  '--disable-extensions','--disable-background-networking','--disable-component-update',
  `--user-data-dir=${profile}`,'--remote-debugging-port=0','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader','--hide-scrollbars','--window-size=960,540'], {windowsHide:true,stdio:'ignore'});
const delay = ms => new Promise(resolve => setTimeout(resolve,ms));
let socket; let send; const events=[];
try {
  let port;
  for(let i=0;i<100;i++) {
    try {port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').trim().split('\n');break;}catch {await delay(100);}
  }
  if(!port)throw new Error('Isolated Chromium did not start');
  socket=new WebSocket(`ws://127.0.0.1:${port[0]}${port[1]}`);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0;const pending=new Map();
  socket.onmessage=event=>{
    const message=JSON.parse(event.data);
    if(message.id) {
      const request=pending.get(message.id);pending.delete(message.id);
      if(message.error)request?.reject(new Error(JSON.stringify(message.error)));else request?.resolve(message.result);
    } else if(message.method==='Runtime.exceptionThrown') events.push(JSON.stringify(message.params).slice(0,1500));
  };
  send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}));
  });
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const page=(method,params)=>send(method,params,sessionId);
  await page('Page.enable');await page('Runtime.enable');
  await page('Emulation.setDeviceMetricsOverride',{width:960,height:540,deviceScaleFactor:1,mobile:false});
  const combat=process.argv.includes('--combat')||params.has('combat');
  await page('Page.navigate',{url:`file:///${path.join(outDir,'index.html').replaceAll('\\','/')}${combat?'#combat':''}`});
  let state;
  for(let i=0;i<150;i++) {
    const result=await page('Runtime.evaluate',{expression:'JSON.stringify({ready:document.body?.dataset.ready,error:document.body?.dataset.error,text:document.body?.dataset.error?document.body.innerText:null,state:document.body?.dataset})',returnByValue:true});
    state=JSON.parse(result.result.value??'{}');
    if(state.error)throw new Error(state.text);
    if(state.ready==='true')break;
    if(events.length)throw new Error(events.join('\n'));
    await delay(100);
  }
  if(state?.ready!=='true')throw new Error('Arena did not become ready');
  const result=await page('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  fs.writeFileSync(artifact,Buffer.from(result.data,'base64'));
  fs.writeFileSync(path.join(path.dirname(artifact),`${name}.log`),JSON.stringify({ready:true,...state,events},null,2));
  console.log(JSON.stringify({screenshot:artifact,...state}));
} finally {
  if(send)try {await send('Browser.close');}catch {}
  socket?.close();
  browser.kill();
}
