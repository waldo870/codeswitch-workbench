import { useEffect, useMemo, useState } from 'react';
import type { WorkspaceRecord } from '../storage/workspace-db.js';
import { IndexedDbWorkspaceExtensionStore } from '../storage/extension-store.js';
import { cardTranslationSource, DeterministicMockTranslator, isTranslationCurrent, translateCard, TRANSLATION_LOCALES, translationId, validateTranslationRecord, type TranslationLocale, type TranslationRecord } from '../p6d/translation.js';
import type { P6ExtensionPanelProps } from './P6ExtensionPanels.js';

const store = new IndexedDbWorkspaceExtensionStore();
const translator = new DeterministicMockTranslator();
const extensionKey = (record: WorkspaceRecord, cardId: string, locale: TranslationLocale) => translationId(record.id, cardId, locale);

export function P6TranslationPanel({ record }: P6ExtensionPanelProps) {
  const [targetLocale, setTargetLocale] = useState<TranslationLocale>('zh-TW');
  const [translations, setTranslations] = useState<Record<string, TranslationRecord>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const cards = useMemo(() => record?.workspace.cards ?? [], [record]);

  useEffect(() => {
    let active = true;
    setTranslations({});
    setMessage('');
    if (!record) return () => { active = false; };
    void Promise.all(cards.flatMap(({ id }) => TRANSLATION_LOCALES.map(async locale => {
      try {
        const value = await store.get<unknown>('p6d.translation', extensionKey(record, id, locale));
        if (value) {
          const valid = validateTranslationRecord(value);
          const card = cards.find(item => item.id === id)?.current;
          if (card && isTranslationCurrent(valid, card, record.id, record.workspace.parsed.constraints)) return [valid.id, valid] as const;
        }
      } catch { /* A corrupt/stale extension is ignored; the immutable original remains visible. */ }
      return null;
    }))).then(values => {
      if (active) setTranslations(Object.fromEntries(values.filter((x): x is readonly [string, TranslationRecord] => x !== null)));
    });
    return () => { active = false; };
  }, [record, cards]);

  async function run(cardId: string): Promise<void> {
    if (!record) return;
    const cardState = cards.find(item => item.id === cardId);
    if (!cardState) return;
    const card = cardState.current;
    const key = extensionKey(record, cardId, targetLocale);
    setBusyId(cardId);
    try {
      const result = await translateCard({ provider: translator, workspaceId: record.id, card, targetLocale, constraints: record.workspace.parsed.constraints });
      if (result.record) {
        await store.put('p6d.translation', key, result.record);
        setTranslations(current => ({ ...current, [result.record!.id]: result.record! }));
      }
      setMessage(result.message);
    } catch {
      setMessage('Local translation storage failed. The Work Card was not changed; its original title remains available.');
    } finally { setBusyId(null); }
  }

  if (!record) return null;
  return <section className="panel p6-translation" aria-labelledby="p6-translation-heading">
    <h2 id="p6-translation-heading">Optional card translation</h2>
    <p>Deterministic mock only. No model or cloud service is called. Translation is a separate review aid and never edits, confirms, or exports a Work Card.</p>
    <label htmlFor="p6-translation-locale">Translate to</label>{' '}
    <select id="p6-translation-locale" value={targetLocale} onChange={event => setTargetLocale(event.target.value as TranslationLocale)}>
      {TRANSLATION_LOCALES.map(locale => <option key={locale} value={locale}>{locale === 'zh-TW' ? '繁體中文 (zh-TW)' : 'English (en)'}</option>)}
    </select>
    {message && <p role="status">{message}</p>}
    <p>Translations are stored locally in the P6D extension namespace and are not included in workspace or encrypted exchange exports.</p>
    <div className="p6-translation-list">{cards.map(({ id, current }) => {
      const translationKey = translationId(record.id, id, targetLocale);
      const saved = translations[translationKey];
      const currentTranslation = saved && isTranslationCurrent(saved, current, record.id, record.workspace.parsed.constraints) ? saved : null;
      const display = currentTranslation?.translatedText ?? cardTranslationSource(current);
      return <article key={id} className="p6-translation-card" aria-label={`${current.type} translation`}>
        <h3>{current.type.replace('_', ' ')} · {current.title}</h3>
        <p><strong>Original title</strong>: <span>{current.title}</span></p>
        <p><strong>{currentTranslation ? 'Mock translation' : 'Fallback (original text)'}</strong>: <span>{display}</span></p>
        <p><strong>Source evidence</strong>: <q>{current.evidence.text}</q></p>
        <p><strong>Original constraints</strong>: {record.workspace.parsed.constraints.length ? record.workspace.parsed.constraints.map((constraint, index) => <span key={`${constraint.action}-${index}`}>{constraint.polarity}: {constraint.action} / {constraint.scope} — “{constraint.evidence.text}”{index + 1 < record.workspace.parsed.constraints.length ? '; ' : ''}</span>) : 'None parsed'}</p>
        {currentTranslation && <>
          <p>Provenance: {currentTranslation.provenance.providerId} / {currentTranslation.provenance.modelId} · {currentTranslation.provenance.generatedAt} · mock</p>
          <p role="note">Human review required. This is not a confirmation; card status remains {current.status}.</p>
          {currentTranslation.risks.length > 0 && <div role="alert"><strong>Review these translation-sensitive spans</strong><ul>{currentTranslation.risks.map((risk, index) => <li key={`${risk.kind}-${index}`}>{risk.kind}: {risk.text}</li>)}</ul></div>}
        </>}
        <button type="button" disabled={busyId === id} onClick={() => void run(id)}>{busyId === id ? 'Translating…' : 'Create mock translation'}</button>
      </article>;
    })}</div>
  </section>;
}
