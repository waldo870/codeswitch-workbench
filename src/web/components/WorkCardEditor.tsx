import { useState } from 'react';
import { editableKeys, fieldValue, suggestedTitle, TARGETS, type CardState, type EditKey } from '../state/workspace.js';
export const LABELS: Record<EditKey, string> = { title: 'Title', action: 'Action', target: 'Target', time: 'Time', recipientName: 'Recipient name', recipientEmail: 'Recipient email', language: 'Language', body: 'Email body' };
export function WorkCardEditor({ state, onChange }: { state: CardState; onChange: (key: EditKey, value: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  return <div><button type="button" aria-expanded={editing} onClick={() => setEditing(!editing)}>{editing ? 'Close editor' : 'Edit'}</button>
    {editing && <fieldset><legend>Edit card · changes return it to draft</legend>
      {editableKeys(state.current).map(key => {
        const id = `${state.id}-${key}`, value = fieldValue(state.current, key) ?? '';
        const changed = (v: string) => onChange(key, ['title', 'action', 'target'].includes(key) ? v : v || null);
        const options = key === 'action' ? ['check', 'review', 'deploy'] : key === 'target' ? TARGETS : key === 'language' ? ['', 'English', 'Chinese'] : null;
        return <label key={key} htmlFor={id}>{LABELS[key]}
          {options ? <select id={id} value={value} onChange={e => changed(e.target.value)}>{options.map(o => <option key={o} value={o}>{o || 'unknown'}</option>)}</select>
            : key === 'body' ? <textarea id={id} maxLength={5000} value={value} onChange={e => changed(e.target.value)} />
              : <input id={id} value={value} maxLength={5000} placeholder={key === 'time' ? 'YYYY-MM-DDTHH:mm' : 'unknown'} onChange={e => changed(e.target.value)} />}
        </label>;
      })}
      <p className="muted">Title must match the structured operation. Suggested: {suggestedTitle(state.current)}</p>
    </fieldset>}
  </div>;
}
