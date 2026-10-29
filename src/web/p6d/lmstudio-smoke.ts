import { configuredLMStudioOptions } from '../../llm/windows-wsl-endpoint.js';
import { LMStudioTranslationProvider } from './lmstudio-translation.js';

/** Opt-in Node smoke. It sends only this fixed, non-sensitive sample to local LM Studio. */
async function main(): Promise<void> {
  const model = process.env.CODESWITCH_LMSTUDIO_MODEL;
  if (!model) {
    process.stderr.write('LIVE_TRANSLATION=NOT_RUN\nSet CODESWITCH_LMSTUDIO_MODEL to an already-loaded local model ID.\n');
    process.exitCode = 2;
    return;
  }
  const provider = new LMStudioTranslationProvider(model, configuredLMStudioOptions());
  const started = performance.now();
  try {
    const result = await provider.translate({ sourceText: 'Review payment webhook', targetLocale: 'zh-TW', sourceEvidence: { text: 'review payment webhook', start: 0, end: 22 }, constraints: [] });
    if (!result) throw new Error('Provider returned no translation.');
    process.stdout.write(`LIVE_TRANSLATION=PASS\nPROVIDER=${provider.providerId}\nMODEL=${provider.modelId}\nLATENCY_MS=${Math.round(performance.now() - started)}\nOUTPUT=${JSON.stringify(result)}\n`);
  } catch (error) {
    process.stderr.write(`LIVE_TRANSLATION=FAIL\nPROVIDER=${provider.providerId}\nMODEL=${provider.modelId}\nERROR=${error instanceof Error ? error.message : 'Local provider failed.'}\n`);
    process.exitCode = 1;
  }
}

void main();
