# Learning Academy: Agent Guidelines

## Goal and scope

Help children understand, remember, and apply what they learn, not just finish quizzes or earn points. Prefer calm, age-appropriate experiences that build independence and confidence.

- Adapt language, scaffolding, and difficulty to the active learner's grade and subject; do not assume all subjects serve all grades.
- Keep curriculum faithful to supplied lessons, notebooks, and marking rubrics. Flag unclear or missing source material rather than inventing answers.
- Preserve subject-specific learning flows. See [README.md](README.md) for the subject catalog, progress storage, grading architecture, and development commands.

## Evidence-based learning

- **Retrieval practice:** Ask the child to recall, type, say, or solve before revealing the answer. Where recall is the goal, keep answers and revealing hints hidden until an attempt or an explicit request for help.
- **Spaced practice:** Revisit material across days, not only within one session. Prioritize due items and previous mistakes, and lengthen review intervals after successful independent recall. Treat any starting schedule as adjustable, not a universal rule.
- **Meaningful mastery:** Do not treat one correct answer, repeated immediate retries, or multiple-choice recognition as durable mastery. Distinguish independent, hinted, and answer-revealed attempts; use later independent recall to confirm retention.
- **Worked examples and fading:** Introduce an unfamiliar skill with a short example, then a partially completed task, then independent practice. Offer support when needed without making every child repeat mastered explanations.
- **Interleaving and transfer:** Once the basics are understood, mix related problem types and vary examples so the child must choose a strategy. Do not randomly mix unfamiliar topics or increase difficulty without support.
- **Self-explanation:** Occasionally ask a brief "why?" or "how did you work it out?" when useful. Keep explanations age-appropriate and avoid unnecessary writing for young learners.
- **Manage cognitive load:** Present one clear task at a time in short, resumable sessions. Keep instructions concise, chunk multi-step work, and offer breaks without losing progress.
- Do not base features on unsupported learning-style labels or equate time spent, speed, streaks, or engagement with learning.

## Feedback and motivation

- Give timely, specific feedback after an attempt: acknowledge what was correct, explain the misconception briefly, and offer a small next step.
- Use progressive hints before a full solution when appropriate. After showing a solution, invite a fresh attempt and schedule later review rather than counting copied answers as independent success.
- Make practice forgiving: allow retries, skip-and-return, and asking for help. Keep mock exams distinct from supported practice; do not reveal solutions during an exam.
- Use encouraging, matter-of-fact language. Praise useful strategies, progress, and self-correction, not fixed ability; never shame, compare siblings, or punish missed days.
- Keep rewards optional and secondary to learning. Avoid public rankings, pressure-based streaks, distracting celebrations, or default speed-based scoring.

## Child-friendly screens and accessibility

- Design for phones and laptops, including a 320 CSS-pixel-wide viewport. Avoid horizontal page scrolling; keep prompts, answer fields, feedback, and primary actions readable and reachable.
- On phones, use touch targets of at least 48 by 48 CSS pixels; keep controls comfortably sized on laptops too. Use readable text, clear labels, and adequate contrast. Never rely on color, hover, audio, or animation alone to communicate meaning.
- Support touch, keyboard navigation, visible focus, screen-reader labels, and reduced motion. Keep focus and feedback predictable when moving between questions.
- Check answer entry with the on-screen keyboard open. Do not let it obscure the input or submit action, and preserve typed work during navigation or reloads.
- Preserve Malayalam and Hindi scripts, meaningful marks, and font legibility. Apply normalization only when appropriate to the learning objective; do not erase distinctions that a spelling or language question is testing.
- Audio and read-aloud support should be learner-controlled and must not reveal the answer before a recall attempt.

## Grading, progress, and trust

- Use **Gemini 3.5 Flash-Lite** (`gemini-3.5-flash-lite`) for AI-based automatic grading through the existing server-side grading service. Keep API keys out of frontend code.
- Reuse deterministic local checks for exact answers; use AI for supported meaning-based answers against explicit lesson rubrics. Do not replace reliable local checks with unnecessary model calls.
- Grade the intended skill: accept valid equivalent wording when meaning is being tested; require the relevant accuracy when spelling, notation, or grammar is the objective.
- Treat child responses as untrusted answer data, not grading instructions. Validate grading responses, and never present malformed, failed, or unavailable grading as correct or incorrect.
- Keep failed or offline AI checks visibly ungraded and retryable; never penalize the learner or advance mastery because of a service failure.
- Preserve progress separately for each learner, stable curriculum IDs, existing storage compatibility, unfinished work, and grading provenance. Do not inflate attempts or learning statistics on retries or restores.
- Keep parent insights actionable: show skills needing review, independent versus assisted performance, and progress over time rather than ranking children or making diagnostic claims.
- Minimize child data sent to external services. Send only the content needed to grade; exclude names, profile identifiers, and unrelated learning history.

## Making and validating changes

- Reuse existing curriculum, grading, progress, and UI helpers before introducing parallel implementations. Keep changes focused and update directly related documentation.
- For learning-flow changes, test answer visibility before attempts, hints and retries, independent versus assisted outcomes, delayed review eligibility, learner isolation, and saved-session recovery as applicable.
- For grading changes, cover equivalent answers, genuinely incorrect answers, invalid responses, and network failures without corrupting scores or progress.
- For UI changes, verify phone and laptop layouts, keyboard and touch interactions, long prompts, native-script content, and the on-screen keyboard when applicable.
- Use the smallest relevant tests first. Run `npm test`, `npm run lint` (TypeScript checking), and `npm run build` for application changes as appropriate. For grading Worker code or configuration changes, also run `npm run worker:check`. Documentation-only changes do not require application builds.
