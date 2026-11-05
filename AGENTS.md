# Learning Academy

- Design for children revising on the day before an exam.
- Keep the learning flow simple and consistent across subjects; remove spelling-only modes rather than adding them everywhere.
- Put recall before answers. Give specific feedback, then revisit mistakes after other questions in the same revision session.
- Use short, resumable sessions. Same-day rechecks are revision, not proof of durable mastery.
- Follow each grade's supplied curriculum and marking rubric. Flag gaps; never invent lesson content or answers.
- Build for phones and laptops, including 320px-wide screens, 48px touch targets, keyboard access, readable text, and visible focus.
- Preserve Malayalam and Hindi scripts. Keep pronunciation/read-aloud learner-controlled and answer-safe.
- Check exact answers locally. Use server-side Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) only for supported meaning-based grading.
- Keep API keys server-side; send only grading essentials, never learner names or unrelated history.
- Failed or offline grading stays visibly ungraded and retryable; never penalize the learner or double-count retries.
- When simplifying, preserve learner-scoped history, stable curriculum IDs, backups, and recoverable unfinished work.
- Reuse existing helpers, remove obsolete code, and avoid unnecessary dependencies or abstractions.
- Test reveal/assistance behavior, rechecks, grading failures, learner isolation, recovery, and small-screen interactions.
- For app changes run `npm test`, `npm run lint`, and `npm run build`; for Worker changes also run `npm run worker:check`.
- See [README.md](README.md) for architecture, storage, grading, and development details.
