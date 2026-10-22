export interface Evidence { text: string; start: number; end: number }
export type Status = 'draft' | 'confirmed' | 'rejected';
interface Base { id: string; title: string; status: Status; requiresConfirmation: boolean; evidence: Evidence }
export type WorkCard = Base & (
  | { type: 'task'; fields: { action: string; target: string } }
  | { type: 'calendar'; fields: { action: string; target: string; time: string | null } }
  | { type: 'email_draft'; fields: { action: 'draft'; recipientName: string | null; recipientEmail: string | null; language: string | null; body: null } }
);
export interface Constraint { action: string; polarity: 'prohibited' | 'required'; scope: string; evidence: Evidence }
export interface Unresolved { evidence: Evidence; reason: string }
export interface Extraction { cards: WorkCard[]; constraints: Constraint[]; unresolved: Unresolved[] }
export interface TextToWorkcards { extract(input: string): Extraction }
