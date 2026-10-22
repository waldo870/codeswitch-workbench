import type { Extraction, TextToWorkcards, WorkCard } from '../contracts/work-card.js';
import { interpret, segments } from './rules.js';
export const deterministicAdapter: TextToWorkcards = {
  extract(input) {
    const result: Extraction = { cards: [], constraints: [], unresolved: [] };
    for (const evidence of segments(input)) {
      const meaning = interpret(evidence.text);
      if (!meaning) result.unresolved.push({ evidence, reason: 'Unsupported or ambiguous clause; manual clarification required.' });
      else if ('constraint' in meaning) result.constraints.push({ ...meaning.constraint, evidence });
      else result.cards.push({ ...meaning.card, id: `card-${result.cards.length + 1}`, status: 'draft', requiresConfirmation: true, evidence } as WorkCard);
    }
    return result;
  },
};
export const extract = (input: string): Extraction => deterministicAdapter.extract(input);
