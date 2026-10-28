import { defineConfig, type Plugin } from 'vite';
import { speechBridge } from './src/speech/bridge.js';
const speech:Plugin={name:'local-speech-bridge',configureServer(server){server.middlewares.use(speechBridge());},configurePreviewServer(server){server.middlewares.use(speechBridge());}};
export default defineConfig({plugins:[speech],server:{host:'127.0.0.1',strictPort:true},preview:{host:'127.0.0.1',strictPort:true}});
