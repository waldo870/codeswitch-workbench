import type { IncomingMessage, ServerResponse } from 'node:http';
import { identifyAudio, MAX_AUDIO_BYTES, SpeechError } from './audio.js';
import { whisperConfig, WindowsWhisper } from './windows-whisper.js';
import type { SpeechRecognizer } from '../contracts/speech.js';
export function speechBridge(provider?:SpeechRecognizer) {
 let busy=false;
 return async(req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
  if(!req.url?.startsWith('/api/speech/')){next();return;}
  const respond=(status:number,value:unknown)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}};
  const host=req.headers.host;
  const local=['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'');
  if(!local || !host || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host) || req.headers.origin && req.headers.origin!==`http://${host}` || req.headers['sec-fetch-site']==='cross-site'){respond(403,{error:'Only same-origin local browser requests are allowed.'});return;}
  let recognizer=provider;
  try {if(!recognizer){const config=whisperConfig();if(config)recognizer=new WindowsWhisper(config);}}catch{ /* configuration details remain private */ }
  if(req.url==='/api/speech/capabilities' && req.method==='GET'){respond(200,{configured:Boolean(recognizer),busy,provider:'windows-whisper',limits:{bytes:MAX_AUDIO_BYTES,seconds:120},formats:['wav-pcm16-mono-16000']});return;}
  if(req.url!=='/api/speech/transcribe' || req.method!=='POST'){respond(404,{error:'Unsupported speech route.'});return;}
  if(req.headers['content-type']!=='audio/wav' || req.headers['x-codeswitch-speech']!=='1'){respond(415,{error:'Use the audio import control with PCM WAV.'});return;}
  if(!recognizer){respond(503,{error:'Local ASR is unavailable. Text workflow remains available.'});return;}
  if(busy){respond(409,{error:'An ASR request is already running.'});return;}
  if(Number(req.headers['content-length'])>MAX_AUDIO_BYTES){respond(413,{error:'Audio exceeds size limit.'});return;}
  busy=true;const controller=new AbortController();const cancel=()=>{if(!res.writableEnded)controller.abort();};res.on('close',cancel);
  const deadline=setTimeout(()=>{controller.abort();if(!req.complete)req.destroy();},300_000);
  try{
   const chunks:Buffer[]=[];let size=0;
   for await(const chunk of req){size+=chunk.length;if(size>MAX_AUDIO_BYTES)throw new SpeechError('TOO_LARGE','Audio exceeds size limit.');chunks.push(chunk);}
   const bytes=new Uint8Array(Buffer.concat(chunks));const source=await identifyAudio(bytes,'audio.wav');
   const result=await recognizer.transcribe(bytes,source,controller.signal);
   respond(200,result);
  }catch(e){respond(e instanceof SpeechError?400:502,{error:e instanceof SpeechError?e.message:'Local speech request failed.'});}
  finally{clearTimeout(deadline);res.removeListener('close',cancel);busy=false;}
 };
}
