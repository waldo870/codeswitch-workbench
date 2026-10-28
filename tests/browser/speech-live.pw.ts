import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateExport } from '../../src/web/state/workspace.js';
import { SPEECH_STORAGE_KEY } from '../../src/web/storage/local-speech.js';
import { STORAGE_KEY } from '../../src/web/storage/local-workspace.js';
test('live offline ASR imported WAV through confirmed work-card export', async({page},info)=>{
 test.skip(process.env.CODESWITCH_LIVE_ASR!=='1','Live ASR NOT_RUN unless explicitly configured with existing runtime/audio.');
 test.setTimeout(360000);
 await page.goto('/');await page.evaluate(()=>localStorage.clear());await page.reload();
 await page.getByLabel('Audio file (WAV)').setInputFiles('.speech-local/p3-smoke.wav');
 await expect(page.getByRole('button',{name:'Transcribe',exact:true})).toBeEnabled();
 await page.getByRole('button',{name:'Transcribe',exact:true}).click();
 await expect(page.getByLabel('Edit Transcript')).toBeVisible({timeout:310000});
 await expect(page.getByRole('button',{name:'Analyze Confirmed Transcript',exact:true})).toBeDisabled();
 // Explicit simulated human punctuation correction; raw ASR is never rewritten.
 await page.getByLabel('Edit Transcript').fill('Check sandbox credentials. Do not deploy to production.');
 await page.getByRole('button',{name:'Confirm Transcript',exact:true}).click();
 await page.getByRole('button',{name:'Analyze Confirmed Transcript',exact:true}).click();
 await expect(page.getByRole('article')).toHaveCount(1);
 await expect(page.getByText('deploy / production',{exact:true})).toBeVisible();
 await page.getByRole('article').getByRole('button',{name:'Confirm',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export confirmed JSON',exact:true}).click();
 const file=await(await download).path();expect(file).toBeTruthy();const exported=JSON.parse(readFileSync(file!,'utf8'));expect(validateExport(exported)).toBe(true);expect(exported.cards).toHaveLength(1);expect(exported.executed).toBe(false);
 const saved=await page.evaluate(({speech,workspace})=>({session:JSON.parse(localStorage.getItem(speech)!),workspace:JSON.parse(localStorage.getItem(workspace)!)}),{speech:SPEECH_STORAGE_KEY,workspace:STORAGE_KEY});
 const result={timestamp:new Date().toISOString(),test:'Live real ASR, synthetic spoken fixture (not a human recording)',fixtureText:'Check sandbox credentials. Do not deploy to production.',fixtureVoice:'Existing Windows Microsoft David Desktop offline SAPI',recognition:saved.session.recognition,correctedTranscript:saved.session.transcript,correctionHistory:saved.session.edits,audio:saved.session.source,workcardCount:saved.workspace.cards.length,constraints:saved.workspace.parsed.constraints,transcriptConfirmed:saved.session.confirmedRevision===saved.session.revision,exportValidated:true,userActions:'Automated browser clicks simulate explicit human confirmations; no product auto-confirmation.',gpuAsrVerified:false,project:info.project.name};
 writeFileSync('reports/p3-live-smoke.json',JSON.stringify(result,null,2)+'\n');
});
test('live Windows ASR cancellation preserves existing work cards',async({page})=>{
 test.skip(process.env.CODESWITCH_LIVE_ASR!=='1','Live cancellation NOT_RUN unless explicitly configured.');
 await page.goto('/');await page.getByRole('button',{name:'Analyze Text',exact:true}).click();await expect(page.getByRole('article')).toHaveCount(3);
 await page.getByLabel('Audio file (WAV)').setInputFiles('.speech-local/p3-smoke.wav');await page.getByRole('button',{name:'Transcribe',exact:true}).click();await expect(page.getByRole('button',{name:'Cancel transcription'})).toBeVisible();await page.waitForTimeout(1000);await page.getByRole('button',{name:'Cancel transcription'}).click();await expect(page.getByRole('article')).toHaveCount(3);await expect(page.getByLabel('Edit Transcript')).toHaveCount(0);
 await expect.poll(async()=>{const r=await page.request.get('/api/speech/capabilities');return(await r.json()).busy;}).toBe(false);
});
