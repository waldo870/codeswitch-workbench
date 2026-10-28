import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { speechBridge } from './src/speech/bridge.js';
const speech:Plugin={name:'local-speech-bridge',configureServer(server){server.middlewares.use(speechBridge());},configurePreviewServer(server){server.middlewares.use(speechBridge());}};
const offlineShell:Plugin={name:'offline-shell-precache',apply:'build',writeBundle(options,bundle){const outDir=options.dir??'dist',swPath=join(outDir,'sw.js');const assets=['/','/index.html',...Object.keys(bundle).filter(name=>name.startsWith('assets/')&&(/\.(?:js|css|woff2|woff|svg|png|webp)$/.test(name))).map(name=>'/'+name)];const manifest=JSON.stringify([...new Set(assets)]);const version=createHash('sha256').update(manifest).digest('hex').slice(0,12);const template=readFileSync(swPath,'utf8');if(!template.includes('__CACHE_VERSION__')||!template.includes('__PRECACHE_ASSETS__'))throw new Error('Offline service-worker template markers are missing.');writeFileSync(swPath,template.replace('__CACHE_VERSION__',version).replace('__PRECACHE_ASSETS__',manifest));}};
export default defineConfig({plugins:[speech,offlineShell],server:{host:'127.0.0.1',strictPort:true},preview:{host:'127.0.0.1',strictPort:true}});
