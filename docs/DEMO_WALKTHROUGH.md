# Three-minute product demo

This walkthrough uses implemented local features. Three minutes is a presentation target, not a measured participant result. No mock translation or Hailo inference is used.

## Prepare

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the loopback URL printed by Vite. The demo requires a supported desktop browser. The prefilled sample is local and contains no personal data.

## Walkthrough

1. **Create grounded work cards (about 30 seconds).** Click **Analyze Text**. Show the calendar, task and email draft cards, the separate prohibited `deploy / production` constraint, and the unresolved email address.
2. **Review evidence (about 30 seconds).** Expand each card's original evidence. Point out the exact highlighted source text and UTF-16 offsets. Explain that evidence proves where a proposal came from, not that every later edit is supported by that phrase.
3. **Exercise the safety and confirmation path (about 45 seconds).** Edit the task to `Deploy to production`, observe the safety validation, then restore the original task. Confirm one valid card and show its status change. Edit it again and show that it returns to draft. Nothing is executed.
4. **Show reusable routines and P6H planning (about 45 seconds).** In a saved workspace, edit the routine items to match supported source-backed work, create a draft run, record a prerequisite, and create a separate P1 handoff. In **Daily workflow planner**, create today's plan. Show the dependent card in **Blocked** until its prerequisite is complete. Edit an owner or due date and show `user-edited` provenance.
5. **Show local review and handoff boundaries (about 30 seconds).** Record an end-of-day note and prepare tomorrow's draft. Optionally show the existing P6A encrypted exchange in a second browser profile, with explicit opt-in for routine metadata and the P6H plan. Imported P1 confirmation remains reset; encrypted data is revalidated and local conflicts stop rather than overwrite.

## Reproducible acceptance commands

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm test:browser
```

The browser suite uses Playwright Chromium. Automated elapsed time is not a human workflow measurement. P6G observations require a real participant and facilitator using the fixed scenarios and completion boundaries in [the P6G human evaluation procedure](P6G_HUMAN_EVALUATION.md). Current evaluation status remains `HUMAN_EVALUATION_NOT_RUN`.

## Accurate feature boundary

- Text extraction is deterministic and limited to documented patterns.
- The existing Whisper path is local and transcript review is required; this demo does not imply broad speech accuracy.
- Translation remains an exact phrasebook mock; this walkthrough does not invoke it as an AI translation.
- The P2 LLM remains unqualified and disabled in the product UI.
- Hailo-10H / UGen300 deployment and Stage II device validation have not been run.
