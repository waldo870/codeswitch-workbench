import { SpeechPanel } from './components/SpeechPanel.js';
import type { SpeechProvenance } from '../contracts/speech.js';
import type { SpeechClient } from '../speech/client.js';
import { SPEECH_STORAGE_KEY } from './storage/local-speech.js';
import { useState } from 'react';
import { validate } from '../engine/validate.js';
import { confirmCard, createWorkspace, editCard, EXAMPLE, exportWorkspace, MAX_INPUT, rejectCard, safetyErrors, type EditKey, type ExportDocument, type Workspace } from './state/workspace.js';
import { loadWorkspace, saveWorkspace, STORAGE_KEY, type StoragePort } from './storage/local-workspace.js';
import { EvidenceViewer } from './components/EvidenceViewer.js';
import { LABELS, WorkCardEditor } from './components/WorkCardEditor.js';

function browserStorage(): StoragePort {
  return { getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value), removeItem: key => window.localStorage.removeItem(key) };
}
export function downloadJson(document: ExportDocument): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }));
  const a = window.document.createElement('a');
  a.href = url; a.download = 'codeswitch-confirmed-workcards.json';
  window.document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function App({ storage = browserStorage(), download = downloadJson, speechClient }: { storage?: StoragePort; speechClient?: SpeechClient; download?: (document: ExportDocument) => void }) {
  const [initial] = useState(() => loadWorkspace(storage));
  const [workspace, setWorkspace] = useState<Workspace | null>(initial.workspace);
  const [input, setInput] = useState(initial.workspace?.originalInput ?? EXAMPLE);
  const [storageBlocked, setStorageBlocked] = useState(Boolean(initial.error));
  const [storageMessage, setStorageMessage] = useState(initial.error ?? (initial.workspace ? 'Restored from this browser.' : 'Stored only in this browser after analysis. Do not enter secrets.'));
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<'analyze' | 'clear' | 'speech' | null>(null);
  const [speechReady,setSpeechReady]=useState(false),[speechReset,setSpeechReset]=useState(0);
  const [pendingSpeech,setPendingSpeech]=useState<SpeechProvenance|null>(null);
  function analyzeSpeech(provenance:SpeechProvenance){if(storageBlocked){setMessage('Clear invalid local data before analysis.');return;}try{const next=createWorkspace(provenance.session.transcript,provenance);commit(next);setInput(next.originalInput);setMessage('');}catch(e){setMessage((e as Error).message);}}
  function commit(next: Workspace) {
    setWorkspace(next);
    try { saveWorkspace(storage, next); setStorageMessage('Saved locally in this browser.'); }
    catch { setStorageMessage('Save failed. Current changes are only in memory; reloading may lose them.'); }
  }
  function act(fn: () => Workspace) {
    try { commit(fn()); setMessage(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'Validation failed.'); }
  }
  function analyze() {
    if (storageBlocked) { setMessage('Clear invalid local data before saving a new workspace.'); return; }
    act(() => createWorkspace(input, workspace?.speech && input===workspace.originalInput ? workspace.speech : undefined));
  }
  function clearLocal() {
    let speechRemoved=false;
    try { storage.removeItem(SPEECH_STORAGE_KEY); speechRemoved=true; storage.removeItem(STORAGE_KEY); setSpeechReset(v=>v+1); setWorkspace(null); setInput(''); setStorageBlocked(false); setStorageMessage('Local workspace removed.'); setMessage(''); }
    catch { setMessage(speechRemoved?'Clear partially failed. Workspace remains in memory; some saved speech data may have been removed.':'Clear failed. Local data has not been removed.'); }
  }
  let exportReason = 'Analyze text, then confirm at least one card.';
  if (workspace) { try { exportWorkspace(workspace); exportReason = ''; } catch (error) { exportReason = error instanceof Error ? error.message : 'Export validation failed.'; } }
  const report = workspace ? validate(workspace.originalInput, workspace.parsed) : null;
  return <main>
    <header><div className="brand"><span className="brand-icon" aria-hidden="true">CS</span><div><p className="eyebrow">YOUR LOCAL WORKSPACE</p><h1>CodeSwitch Workbench</h1><p>One Voice. Multiple Languages. Verified Workflows.</p></div></div><span className="prototype">{speechReady?'Local Speech · Transcript confirmation required':'Text Prototype — No Speech Recognition Yet'}</span></header>
    <div className="workflow" aria-label="Workflow"><span>01 Write</span><span>02 Review & edit</span><span>03 Confirm</span><span>04 Export locally</span></div>
    <section className="panel input-panel" aria-labelledby="input-heading"><div className="section-heading"><h2 id="input-heading">Turn your thoughts into work cards</h2><span className="muted">繁中 + English</span></div>
      <label htmlFor="input">Mixed-language instructions</label><textarea id="input" rows={5} value={input} maxLength={MAX_INPUT} onChange={e => setInput(e.target.value)} aria-describedby="input-help" />
      <p id="input-help" className="muted">{input.length.toLocaleString()} / {MAX_INPUT.toLocaleString()} characters · Deterministic rules. Nothing is executed.</p>
      <div className="actions"><button className="primary" disabled={!input.trim() || storageBlocked} onClick={() => workspace ? setPending('analyze') : analyze()}>Analyze Text</button><button onClick={() => setInput(EXAMPLE)}>Load Example</button><button onClick={() => setInput('')}>Clear</button></div>
      {workspace && input !== workspace.originalInput && <p role="status">Input changed. Existing cards still refer to the previous analysis; Analyze Text to replace them.</p>}
    </section>
    <SpeechPanel key={speechReset} storage={storage} client={speechClient} onAvailability={setSpeechReady} onInvalidate={()=>{if(pending==='speech'){setPending(null);setPendingSpeech(null);}}} onAnalyze={p=>{if(workspace){setPendingSpeech(p);setPending('speech');}else analyzeSpeech(p);}} />
    {message && <p className={message.startsWith('Confirmed cards exported') ? 'success' : 'error'} role={message.startsWith('Confirmed cards exported') ? 'status' : 'alert'}>{message}</p>}
    {pending && <section className="confirm-dialog panel" role="alertdialog" aria-modal="false" aria-labelledby="confirm-heading"><h2 id="confirm-heading">{pending === 'clear' ? 'Clear Local Data?' : 'Replace this workspace?'}</h2><p>{pending === 'clear' ? 'This removes saved input, cards and review history from this browser.' : 'Reanalysis replaces all existing edits, confirmations and rejections.'}</p><div className="actions"><button autoFocus onClick={() => setPending(null)}>Cancel</button><button className="danger" onClick={() => { if (pending === 'clear') clearLocal(); else if(pending==='speech' && pendingSpeech)analyzeSpeech(pendingSpeech);else analyze(); setPending(null); }}>{pending === 'clear' ? 'Yes, clear local data' : 'Replace and analyze'}</button></div></section>}
    {workspace && <div className="work-layout"><section aria-labelledby="cards-heading"><div className="section-heading"><h2 id="cards-heading">Work cards <span className="count">{workspace.cards.length}</span></h2><span className="muted">Review each card</span></div>
      {!workspace.cards.length && <p className="panel">No supported work cards found. Review unresolved text below.</p>}
      {workspace.cards.map(state => {
        const card = state.current, errors = safetyErrors(workspace, card);
        return <article className={`panel card ${card.status}`} key={state.id} aria-label={`${card.type} card`}>
          <div className="section-heading"><span className="eyebrow">{card.type === 'calendar' ? 'Calendar Card' : card.type === 'task' ? 'Task Card' : 'Email Draft Card'}</span><span className={`badge ${card.status}`}>{card.status}</span></div><h3>{card.title}</h3>
          <p className="muted">Requires confirmation: {card.requiresConfirmation ? 'yes' : 'no'} · Revision {state.revision}</p>
          <dl>{Object.entries(card.fields).map(([key, value]) => <div key={key}><dt>{LABELS[key as EditKey] ?? key}</dt><dd>{value ?? <span className="unknown">unknown</span>}</dd></div>)}</dl>
          {state.history.some(e => e.kind === 'edit') && <p className="edited">user-edited · Original evidence is unchanged</p>}
          {workspace.speech?<p className="edited">Source: {workspace.speech.origin} · Audio {workspace.speech.session.source.id}</p>:<p className="muted">Source: typed text</p>}
          <EvidenceViewer input={workspace.originalInput} evidence={card.evidence} />
          {state.history.length > 0 && <details><summary>Review history ({state.history.length})</summary><ol>{state.history.map((e, i) => <li key={i}>{e.kind === 'edit' ? `user-edited ${e.field}: ${e.before ?? 'unknown'} → ${e.after ?? 'unknown'}` : e.kind === 'confirm' ? `User confirmed revision ${e.revision}` : 'User rejected card'}</li>)}</ol></details>}
          {errors.length > 0 && <div className="validation" aria-label="Missing fields or safety issues"><strong>Before confirming</strong><ul>{errors.map(error => <li key={error}>{error}</li>)}</ul></div>}
          <WorkCardEditor state={state} onChange={(key, value) => act(() => editCard(workspace, state.id, key, value))} />
          <div className="actions card-actions"><button className="primary" disabled={errors.length > 0 || card.status !== 'draft'} onClick={() => act(() => confirmCard(workspace, state.id))}>Confirm</button><button disabled={card.status === 'rejected'} onClick={() => act(() => rejectCard(workspace, state.id))}>Reject</button></div>
        </article>;
      })}
    </section><aside>
      <section className="panel constraints" aria-labelledby="constraints-heading"><h2 id="constraints-heading">Constraints <span className="count">{workspace.parsed.constraints.length}</span></h2>
        {workspace.parsed.constraints.length === 0 && <p>No supported constraints extracted.</p>}
        {workspace.parsed.constraints.map((c, i) => <div className="constraint" key={i}><span className="badge prohibited">{c.polarity}</span><h3>{c.action} / {c.scope}</h3><p>{c.evidence.text === "don't deploy to production yet" ? 'Do not deploy to production yet.' : c.evidence.text}</p><EvidenceViewer input={workspace.originalInput} evidence={c.evidence} /></div>)}
        <p className="muted">Constraints stay attached to the source. Confirmation never runs an action.</p>
      </section>
      <section className="panel"><h2>Source verification</h2><p>{report?.valid ? 'Original evidence verified' : 'Source validation failed — confirmation blocked'}</p>{report?.errors.map(e => <p className="error" key={e}>{e}</p>)}<p className="muted">Edited content is checked separately. Unknown instructions block confirmation.</p>
        {workspace.parsed.unresolved.map((u, i) => <div className="validation" key={i}><strong>Unresolved</strong><p>{u.evidence.text}</p><p>{u.reason}</p></div>)}
      </section>
    </aside></div>}
    <section className="panel export-panel"><div><h2>Take your reviewed work with you</h2><p>JSON includes confirmed cards, original evidence, constraints and review history. No emails are sent or calendar events created.</p>{exportReason && <p id="export-reason" className="muted">{exportReason}</p>}</div><button className="primary" disabled={Boolean(exportReason)} aria-describedby={exportReason ? 'export-reason' : undefined} onClick={() => { try { download(exportWorkspace(workspace)); setMessage('Confirmed cards exported locally. No actions were executed.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Export failed.'); } }}>Export confirmed JSON</button></section>
    <footer><p role="status">{storageMessage}</p><button onClick={() => setPending('clear')}>Clear Local Data</button><p className="muted">P3 · Local transcript review · Deterministic cards · LLM product integration disabled</p></footer>
  </main>;
}
