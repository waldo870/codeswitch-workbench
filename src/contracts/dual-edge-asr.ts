import type { NemotronAudioIdentity, NemotronTranscriptSegment } from './nemotron-asr.js';

export const DUAL_ASR_MODES = ['hailo_only', 'nemotron_only', 'dual_review'] as const;
export type DualAsrMode = typeof DUAL_ASR_MODES[number];
export type DualAsrProviderId = 'hailo-10h' | 'nvidia-nemotron';
export type DualAsrReviewStatus = 'awaiting_final' | 'review_required' | 'reviewed';

export interface DualAsrUpdate {
  providerId: DualAsrProviderId;
  modelId: string;
  executionMode: 'mock' | 'live';
  audioSha256: NemotronAudioIdentity['sha256'];
  sequence: number;
  stage: 'partial' | 'final' | 'error';
  transcript: string;
  language: { tag: string; source: 'detected' | 'requested' } | null;
  segments?: NemotronTranscriptSegment[];
  runtime: { name: string; version?: string; device: 'cpu' | 'gpu' | 'hailo' | 'unknown' };
  emittedAtMs: number;
  error?: { code: 'UNAVAILABLE' | 'TIMEOUT' | 'CANCELLED' | 'PROVIDER_ERROR'; message: string };
}

export interface DualAsrProviderState {
  providerId: DualAsrProviderId;
  modelId: string;
  executionMode: 'mock' | 'live';
  partials: DualAsrUpdate[];
  final: DualAsrUpdate | null;
  error: DualAsrUpdate | null;
}

export interface DualAsrDisagreement {
  category: 'transcript' | 'negation' | 'number' | 'deadline' | 'prerequisite';
  hailoEvidence: string | null;
  nemotronEvidence: string | null;
}

export interface DualAsrReview {
  schemaVersion: 1;
  mode: DualAsrMode;
  audioSha256: NemotronAudioIdentity['sha256'];
  status: 'collecting' | 'completed' | 'failed' | 'cancelled';
  reviewStatus: DualAsrReviewStatus;
  providers: Partial<Record<DualAsrProviderId, DualAsrProviderState>>;
  disagreements: DualAsrDisagreement[];
  reviewedTranscript: string | null;
  reviewedFrom: DualAsrProviderId | null;
}

export type StreamingAsrProvider = {
  readonly providerId: DualAsrProviderId;
  readonly modelId: string;
  readonly executionMode: 'mock' | 'live';
  stream(audio: NemotronAudioIdentity, signal?: AbortSignal): AsyncIterable<DualAsrUpdate>;
};

const providersFor = (mode: DualAsrMode): DualAsrProviderId[] => mode === 'dual_review' ? ['hailo-10h', 'nvidia-nemotron'] : mode === 'hailo_only' ? ['hailo-10h'] : ['nvidia-nemotron'];
const negation = /\b(?:no|not|never|cannot|can't|don't|doesn't|didn't|won't|shouldn't|mustn't)\b|不|沒|未|別|禁止|不能|不得|尚未/iu;
const numbers = /\d+(?:[.:/年月日時分秒-]\d+)*|[零〇一二兩三四五六七八九十百千萬]+[年月日時分秒]?/u;
const deadlines = /\b(?:today|tomorrow|tonight|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday))\b|今天|明天|今晚|下週|下星期|期限|之前|以前/iu;
const prerequisites = /\b(?:before|after|once|unless|until|only\s+after|prior\s+to)\b|先|之後|再|除非|確認後|必須先|完成後/iu;
const firstMatch = (pattern: RegExp, text: string) => text.match(pattern)?.[0] ?? null;
const onlyKeys = (value: object, keys: string[]) => Object.keys(value).every(key => keys.includes(key));

export function createDualAsrReview(mode: DualAsrMode, audioSha256: NemotronAudioIdentity['sha256']): DualAsrReview {
  if (!DUAL_ASR_MODES.includes(mode) || !/^sha256:[0-9a-f]{64}$/.test(audioSha256)) throw new Error('Invalid dual-ASR mode or audio SHA-256.');
  return { schemaVersion: 1, mode, audioSha256, status: 'collecting', reviewStatus: 'awaiting_final', providers: {}, disagreements: [], reviewedTranscript: null, reviewedFrom: null };
}

function makeDisagreements(providers: DualAsrReview['providers']): DualAsrDisagreement[] {
  const h = providers['hailo-10h']?.final?.transcript;
  const n = providers['nvidia-nemotron']?.final?.transcript;
  if (h === undefined || n === undefined || h === n) return [];
  const specs: [DualAsrDisagreement['category'], RegExp][] = [['negation', negation], ['number', numbers], ['deadline', deadlines], ['prerequisite', prerequisites]];
  const differences = specs.flatMap(([category, pattern]) => {
    const hm = firstMatch(pattern, h), nm = firstMatch(pattern, n);
    return hm !== nm ? [{ category, hailoEvidence: hm, nemotronEvidence: nm }] : [];
  });
  return differences.length ? differences : [{ category: 'transcript', hailoEvidence: h, nemotronEvidence: n }];
}

function validateUpdate(update: DualAsrUpdate, state: DualAsrReview): void {
  if (!update || !onlyKeys(update, ['providerId', 'modelId', 'executionMode', 'audioSha256', 'sequence', 'stage', 'transcript', 'language', 'segments', 'runtime', 'emittedAtMs', 'error']) || !['hailo-10h', 'nvidia-nemotron'].includes(update.providerId) || !providersFor(state.mode).includes(update.providerId) || !update.modelId || update.modelId.length > 200 || !['mock', 'live'].includes(update.executionMode) || update.audioSha256 !== state.audioSha256 || !Number.isInteger(update.sequence) || update.sequence < 0 || !['partial', 'final', 'error'].includes(update.stage) || typeof update.transcript !== 'string' || update.transcript.length > 10000 || !Number.isFinite(update.emittedAtMs) || update.emittedAtMs < 0 || !update.runtime || !onlyKeys(update.runtime, ['name', 'version', 'device']) || !update.runtime.name || update.runtime.name.length > 100 || update.runtime.version !== undefined && update.runtime.version.length > 100 || !['cpu', 'gpu', 'hailo', 'unknown'].includes(update.runtime.device)) throw new Error('Invalid streaming ASR update or source provenance.');
  if (update.language !== null && (!update.language || !onlyKeys(update.language, ['tag', 'source']) || !update.language.tag || update.language.tag.length > 50 || !['detected', 'requested'].includes(update.language.source))) throw new Error('Invalid ASR language metadata.');
  if (update.stage === 'error' && (!update.error || !onlyKeys(update.error, ['code', 'message']) || !['UNAVAILABLE', 'TIMEOUT', 'CANCELLED', 'PROVIDER_ERROR'].includes(update.error.code) || !update.error.message || update.error.message.length > 500)) throw new Error('ASR error update is malformed.');
  if (update.stage !== 'error' && (update.error !== undefined || update.stage === 'final' && !update.transcript.trim())) throw new Error('ASR partial/final update is malformed.');
  if (update.stage === 'error' && update.transcript !== '') throw new Error('Error updates cannot carry transcript text.');
  if (update.segments !== undefined && (!Array.isArray(update.segments) || update.segments.length > 10000 || update.segments.some(segment => !segment || !onlyKeys(segment, ['text', 'startMs', 'endMs', 'speakerId', 'language']) || typeof segment.text !== 'string' || segment.text.length > 2000 || segment.startMs !== undefined && (!Number.isFinite(segment.startMs) || segment.startMs < 0) || segment.endMs !== undefined && (!Number.isFinite(segment.endMs) || segment.endMs < 0) || segment.startMs !== undefined && segment.endMs !== undefined && segment.endMs < segment.startMs))) throw new Error('ASR segments are malformed.');
  const prior = state.providers[update.providerId];
  if (prior && (prior.modelId !== update.modelId || prior.executionMode !== update.executionMode)) throw new Error('Provider model or execution mode changed within a review session.');
  if (prior?.final) throw new Error('Provider already emitted its final transcript.');
  if (prior && [...prior.partials, ...(prior.error ? [prior.error] : [])].some(item => item.sequence >= update.sequence)) throw new Error('ASR update sequence must increase.');
}

/** Immutable state transition; a partial can never make the review eligible for Work Cards. */
export function acceptDualAsrUpdate(state: DualAsrReview, update: DualAsrUpdate): DualAsrReview {
  if (state.status !== 'collecting') throw new Error('ASR session is no longer collecting updates.');
  validateUpdate(update, state);
  const previous = state.providers[update.providerId] ?? { providerId: update.providerId, modelId: update.modelId, executionMode: update.executionMode, partials: [], final: null, error: null };
  const nextProvider: DualAsrProviderState = update.stage === 'partial'
    ? { ...previous, partials: [...previous.partials, update] }
    : update.stage === 'final'
      ? { ...previous, final: update }
      : { ...previous, error: update };
  const providers = { ...state.providers, [update.providerId]: nextProvider };
  const required = providersFor(state.mode);
  const allFinal = required.every(id => providers[id]?.final !== null && providers[id]?.final !== undefined);
  const terminalError = required.some(id => providers[id]?.error?.error?.code === 'CANCELLED') ? 'cancelled' : required.some(id => providers[id]?.error) ? 'failed' : 'collecting';
  const status = allFinal ? 'completed' : terminalError;
  const disagreements = makeDisagreements(providers);
  return { ...state, providers, status, reviewStatus: allFinal ? 'review_required' : 'awaiting_final', disagreements, reviewedTranscript: null, reviewedFrom: null };
}

/** Human selection is explicit. Neither provider state nor confirmation is accepted from model output. */
export function reviewDualAsrTranscript(state: DualAsrReview, providerId: DualAsrProviderId): DualAsrReview {
  if (state.status !== 'completed' || !providersFor(state.mode).every(id => state.providers[id]?.final) || !state.providers[providerId]?.final) throw new Error('Final transcripts from all selected providers are required before human review.');
  return { ...state, reviewStatus: 'reviewed', reviewedTranscript: state.providers[providerId]!.final!.transcript, reviewedFrom: providerId };
}

export function canAnalyzeDualAsrReview(state: DualAsrReview): boolean {
  return state.status === 'completed' && state.reviewStatus === 'reviewed' && Boolean(state.reviewedTranscript?.trim());
}
