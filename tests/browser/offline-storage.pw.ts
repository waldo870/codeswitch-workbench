import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createWorkspace, EXAMPLE } from '../../src/web/state/workspace.js';
import { LEGACY_MIGRATION_SETTING } from '../../src/web/storage/workspace-db.js';
import { STORAGE_KEY } from '../../src/web/storage/local-workspace.js';

test('IndexedDB isolates multiple sessions and confirms deletion twice',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'Saved work sessions'})).toBeVisible();
 await page.getByRole('button',{name:'Analyze Text'}).click();const status=page.getByText('Saved in this browser (IndexedDB).').first();await expect(status).toBeVisible();
 const first=page.getByRole('article',{name:'task card'});await first.getByRole('button',{name:'Confirm',exact:true}).click();await expect(first.locator('.badge.confirmed')).toBeVisible();await expect(status).toBeVisible();
 await page.getByRole('button',{name:'New Workspace'}).click();await page.getByLabel('Mixed-language instructions').fill('check sandbox credentials');await page.getByRole('button',{name:'Analyze Text'}).click();await expect(page.getByRole('article',{name:'task card'})).toHaveCount(1);
 await expect(page.locator('.session-list li')).toHaveCount(2);
 await page.getByRole('button',{name:/明天早上九點 review payment webhook/}).first().click();await expect(page.getByRole('article',{name:'task card'}).locator('.badge.confirmed')).toBeVisible();
 const second=page.locator('.session-list li').first();
 await second.getByRole('button',{name:/Delete session/}).click();await expect(page.getByRole('alertdialog')).toContainText('permanently deletes only the selected local session');await page.getByRole('alertdialog').getByRole('button',{name:'Cancel'}).click();await expect(page.locator('.session-list li')).toHaveCount(2);
 await second.getByRole('button',{name:/Delete session/}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Delete session'}).click();await expect(page.locator('.session-list li')).toHaveCount(1);
 await expect(page.getByRole('article',{name:'task card'}).locator('.badge.confirmed')).toBeVisible();
});

test('complete JSON import is explicit, validated, non-overwriting and invalidates card confirmation',async({page},info)=>{
 await page.goto('/');await page.getByRole('button',{name:'Analyze Text'}).click();await expect(page.getByText('Saved in this browser (IndexedDB).').first()).toBeVisible();
 await page.getByRole('article',{name:'task card'}).getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('article',{name:'task card'}).locator('.badge.confirmed')).toBeVisible();
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'Export complete Workspace JSON'}).click();const download=await event;const path=info.outputPath('workspace.json');await download.saveAs(path);
 const exported=JSON.parse(await readFile(path,'utf8'));expect(exported.format).toBe('codeswitch-workspace');expect(exported.workspace.parsed.constraints[0].evidence.text).toContain("don't deploy");expect(exported.workspace.cards[1].current.status).toBe('confirmed');
 const buffer=await readFile(path);await page.getByLabel('Import Workspace JSON').setInputFiles({name:'workspace.json',mimeType:'application/json',buffer});await expect(page.getByRole('alertdialog')).toContainText('Existing records are never overwritten');
 await page.getByRole('alertdialog').getByRole('button',{name:'Cancel'}).click();await expect(page.locator('.session-list li')).toHaveCount(1);
 await page.getByLabel('Import Workspace JSON').setInputFiles({name:'workspace.json',mimeType:'application/json',buffer});await page.getByRole('alertdialog').getByRole('button',{name:'Import as new session'}).click();
 await expect(page.getByRole('region',{name:/Saved work sessions/}).getByRole('status')).toContainText('Imported as a new session');await expect(page.locator('.session-list li')).toHaveCount(2);
 await expect(page.getByRole('article',{name:'task card'}).locator('.badge.draft')).toBeVisible();await expect(page.getByText('deploy / production')).toBeVisible();const calendar=page.getByRole('article',{name:'calendar card'});await calendar.getByText('Original evidence · UTF-16 [0, 29)').click();await expect(calendar.locator('mark')).toHaveText(EXAMPLE.slice(0,29));
});

test('migrates a legacy localStorage Workspace v1 without losing evidence or constraints',async({page})=>{
 const legacy=JSON.stringify(createWorkspace(EXAMPLE));
 await page.addInitScript(({key,value,marker})=>{localStorage.setItem(key,value);localStorage.removeItem(marker);},{key:STORAGE_KEY,value:legacy,marker:LEGACY_MIGRATION_SETTING});
 await page.goto('/');await expect(page.locator('.session-list li')).toHaveCount(1);await expect(page.getByText('Do not deploy to production yet.')).toBeVisible();await expect(page.getByRole('article',{name:'task card'}).getByText('Original evidence · UTF-16 [32, 57)')).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBeNull();expect(await page.evaluate(marker=>localStorage.getItem(marker),LEGACY_MIGRATION_SETTING)).toBe('complete');
});

test('simulated missing internet still reopens the IndexedDB workspace from cached app shell',async({page})=>{
 await page.goto('/');await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();
 await expect(page.getByRole('heading',{name:'CodeSwitch Workbench'})).toBeVisible();await page.getByRole('button',{name:'Analyze Text'}).click();await expect(page.getByText('Saved in this browser (IndexedDB).').first()).toBeVisible();
 await page.context().setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'CodeSwitch Workbench'})).toBeVisible();await expect(page.getByRole('article',{name:'task card'})).toBeVisible();await expect(page.getByText('deploy / production')).toBeVisible();
 await expect(page.getByText(/Local ASR unavailable or unconfigured/)).toBeVisible();await expect(page.getByRole('button',{name:'Transcribe'})).toBeDisabled();
 const cached=await page.evaluate(async()=>({controller:Boolean(navigator.serviceWorker.controller),caches:await caches.keys()}));expect(cached.controller).toBe(true);expect(cached.caches.some(key=>key.startsWith('codeswitch-shell-'))).toBe(true);
});

test('an IndexedDB quota failure reports unsaved state and does not claim persistence',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{const proto=IDBObjectStore.prototype,put=proto.put;proto.put=function(value,key){if(this.name==='workspaces')throw new DOMException('quota','QuotaExceededError');return put.call(this,value,key);};});
 await page.getByRole('button',{name:'Analyze Text'}).click();await expect(page.getByText('Save failed. Changes remain in memory and may be lost after reload.')).toBeVisible();await expect(page.getByRole('article',{name:'task card'})).toBeVisible();
 await page.reload();await expect(page.getByRole('article',{name:'task card'})).toHaveCount(0);await expect(page.locator('.session-list li')).toHaveCount(0);
});

test('corrupt IndexedDB provenance is reported and retained without restoring a card',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Analyze Text'}).click();await expect(page.locator('.session-list li')).toHaveCount(1);
 await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('codeswitch-workbench');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('workspaces','readwrite'),store=tx.objectStore('workspaces'),get=store.getAll();get.onsuccess=()=>{const row=get.result[0];row.workspace.cards[0].current.evidence.text+='tampered';store.put(row);};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();});
 await page.reload();await expect(page.getByRole('alert')).toContainText('invalid or unsupported data and was left untouched');await expect(page.locator('.session-list li')).toHaveCount(0);await expect(page.getByRole('article',{name:'task card'})).toHaveCount(0);
 const retained=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('codeswitch-workbench');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});return await new Promise<string>((resolve,reject)=>{const tx=db.transaction('workspaces','readonly'),get=tx.objectStore('workspaces').getAll();get.onsuccess=()=>resolve(get.result[0].workspace.cards[0].current.evidence.text);get.onerror=()=>reject(get.error);});});expect(retained).toContain('tampered');
});

test('legacy corrupt data is retained until the user explicitly clears it',async({page})=>{
 await page.addInitScript(({key,marker})=>{localStorage.setItem(key,'{broken');localStorage.removeItem(marker);},{key:STORAGE_KEY,marker:LEGACY_MIGRATION_SETTING});
 await page.goto('/');await expect(page.getByRole('alert')).toContainText('Legacy local data could not be migrated');expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBe('{broken');
 await page.getByRole('button',{name:'Clear Local Data'}).click();await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('alertdialog').getByRole('button',{name:'Cancel'}).click();expect(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBe('{broken');
 await page.getByRole('button',{name:'Clear Local Data'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Delete all local data'}).click();await expect.poll(()=>page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY)).toBeNull();
 await page.getByRole('button',{name:'Load Example'}).click();await page.getByRole('button',{name:'Analyze Text'}).click();await expect(page.getByRole('article')).toHaveCount(3);
});
