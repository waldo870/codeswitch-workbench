import type { WorkspaceRecord, WorkspaceRepository } from '../storage/workspace-db.js';
import { P6TranslationPanel } from './P6TranslationPanel.js';
import { P6RoutineTemplatesPanel } from './P6RoutineTemplatesPanel.js';
import { P6GTimeToValuePanel } from './P6GTimeToValuePanel.js';

export interface P6ExtensionPanelProps { record:WorkspaceRecord|null; repository:WorkspaceRepository; onWorkspaceCreated?:(id:string)=>void }

/** Stable mount point so independently developed P6 features do not edit PersistentApp. */
export function P6ExtensionPanels(props:P6ExtensionPanelProps){
  return <>
    <P6TranslationPanel {...props}/>
    <P6RoutineTemplatesPanel {...props}/>
    <P6GTimeToValuePanel {...props}/>
  </>;
}
