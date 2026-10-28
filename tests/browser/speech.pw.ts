import {test,expect} from '@playwright/test';
import {wav} from '../speech/helpers.js';
import {validateExport} from '../../src/web/state/workspace.js';
import {readFileSync} from 'node:fs';
test('audio import, explicit correction/confirmation, reload and safe export (mock ASR)',async({page})=>{
 await page.route('**/api/speech/capabilities',r=>r.fulfill({json:{configured:true}}));
 await page.route('**/api/speech/transcribe',async route=>{
  const bytes=route.request().postDataBuffer()!;
  const id=await page.evaluate(async bytes=>{const hash=await crypto.subtle.digest('SHA-256',new Uint8Array(bytes));return 'sha256:'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');},[...bytes]);
  await route.fulfill({json:{sourceAudioId:id,transcript:'check sandbox without punctuation',language:'en',modelId:'mock-browser-only',provider:'browser-mock',duration:1,inferenceDuration:1,audioFormat:{container:'wav',encoding:'pcm_s16le',sampleRateHz:16000,channels:1,bitsPerSample:16},runtime:{mode:'mock',runtime:'playwright-fixture',device:'unknown'},status:'success',errors:[]}});
 });
 await page.goto('/');await page.getByLabel('Audio file (WAV)').setInputFiles({name:'original.wav',mimeType:'audio/wav',buffer:Buffer.from(wav())});await page.getByRole('button',{name:'Transcribe',exact:true}).click();await expect(page.getByLabel('Edit Transcript')).toBeVisible();
 await expect(page.getByRole('button',{name:'Analyze Confirmed Transcript'})).toBeDisabled();await page.getByLabel('Edit Transcript').fill('check sandbox');await page.getByRole('button',{name:'Confirm Transcript'}).click();await page.getByRole('button',{name:'Analyze Confirmed Transcript'}).click();await expect(page.getByRole('article')).toHaveCount(1);await expect(page.getByText(/Source: corrected-transcript/)).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'Export confirmed JSON'})).toBeDisabled();
 await page.getByRole('article').getByRole('button',{name:'Confirm',exact:true}).click();await page.reload();await expect(page.getByLabel('Edit Transcript')).toHaveValue('check sandbox');await expect(page.getByRole('article').getByText('confirmed',{exact:true})).toBeVisible();
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Export confirmed JSON'}).click();const d=await pending;const exported=JSON.parse(readFileSync((await d.path())!,'utf8'));expect(validateExport(exported)).toBe(true);expect(exported.speech.session.recognition.transcript).toBe('check sandbox without punctuation');expect(exported.speech.origin).toBe('corrected-transcript');
 await page.getByLabel('Edit Transcript').fill('check sandbox credentials');await expect(page.getByRole('button',{name:'Analyze Confirmed Transcript'})).toBeDisabled();
 await page.getByRole('button',{name:'Clear Local Data',exact:true}).click();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Edit Transcript')).toBeVisible();
});
test('unavailable ASR and invalid audio preserve existing cards',async({page})=>{
 await page.route('**/api/speech/capabilities',r=>r.fulfill({json:{configured:false}}));await page.goto('/');await page.getByRole('button',{name:'Analyze Text',exact:true}).click();await expect(page.getByRole('article')).toHaveCount(3);await page.getByLabel('Audio file (WAV)').setInputFiles({name:'bad.wav',mimeType:'audio/wav',buffer:Buffer.from('not real audio')});await expect(page.getByText('Invalid or truncated WAV container.')).toBeVisible();await expect(page.getByRole('article')).toHaveCount(3);await expect(page.getByRole('button',{name:'Transcribe',exact:true})).toBeDisabled();
});
