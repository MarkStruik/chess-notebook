from pathlib import Path
import json,hashlib
files=['./']+['./'+str(f.relative_to('dist')) for f in Path('dist').rglob('*') if f.is_file() and f.name not in ['sw.js','qa-mobile.html','chess-pieces.png']]
version=hashlib.sha256(''.join(Path('dist',f[2:]).read_text() if f.endswith(('.js','.css','.html')) else f for f in files if f!='./').encode()).hexdigest()[:12]
sw="""const CACHE='chess-notebook-VERSION';
const FILES=FILES_JSON;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()).then(async()=>{for(const c of await self.clients.matchAll())c.postMessage('offline-ready')})));
self.addEventListener('message',e=>{if(e.data==='status')e.waitUntil(caches.open(CACHE).then(async c=>{if((await c.keys()).length>=FILES.length)e.source?.postMessage('offline-ready')}))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).catch(()=>e.request.mode==='navigate'?caches.match('./'):Response.error())))});
""".replace('FILES_JSON',json.dumps(files)).replace('VERSION',version)
Path('dist/sw.js').write_text(sw)
print('Offline cache:',len(files),'assets, version',version)
