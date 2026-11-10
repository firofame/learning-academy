# Learning Academy

Evidence-based revision web app designed for school children preparing on exam eve.

**Live Site:** [https://firofame.github.io/learning-academy/](https://firofame.github.io/learning-academy/)

## Key Features

- **Evidence-Based Learning:** Active retrieval practice, immediate explanations, instant corrections, and lagged error rechecks.
- **Subjects & Grades:** Tailored curricula for Grade 2 and Grade 6, with subject availability varying by grade across Spell Bee, Robotics, Maths, Malayalam, Hindi, EVS, Biology, and Chemistry.
- **Dual Grading Engine:** Deterministic local checks for exact answers and server-side AI evaluation for meaning-based written answers.
- **Offline Access:** Previously accessed content can be available offline after initial online access, but AI-assisted grading requires an internet connection.
- **Multi-Device Support:** Touch-first interface optimized for phones, tablets, and laptops with native Malayalam and Hindi script input.
- **Personal Study Space:** Distinct learner themes, time-aware encouragement, and subject-colored revision cards.
- **Stars & Milestones:** Correct answers earn two stars unaided or one with help. Consecutive local calendar days with a correct answer build a streak; missed days never remove earned stars. Rewards derive from saved attempts, while celebration-seen flags are local to each browser and learner. These are digital rewards only, reset with exam-cycle progress.
- **Gentle Celebrations:** Batch stars, milestone pop-ups, reduced-motion support, and optional synthesized Spell Bee feedback tones controlled by its existing audio toggle. Mock exams hide reward counters and correctness sounds until completion.

## Getting Started

```bash
npm ci            # Install dependencies
npm run dev       # Start local dev server
npm test          # Run test suite
npm run lint      # Type check
npm run build     # Production build
```

## Tests

The suite focuses on curriculum completeness, answer matching (including Malayalam
and Hindi), learner-facing interactions, grading failures, and learning rules.
Cross-device regressions live in [sync.test.ts](src/tests/sync.test.ts): both merge engines run
the same behavioral checks, and client sync is exercised against the real Worker
and Durable Object code using in-memory storage. These are local tests, not a
Cloudflare runtime integration test.
Reward thresholds, calendar streaks, profile isolation, live counters, milestone queues,
and mock-exam privacy are covered by [rewards.test.ts](src/tests/rewards.test.ts) and
[rewardInteractions.test.ts](src/tests/rewardInteractions.test.ts).

Reuse [helpers/storage.ts](src/tests/helpers/storage.ts) for non-DOM storage tests; component tests use
JSDOM's storage. Prefer a representative case for each distinct behavior or failure
path over lists of equivalent inputs, export-alias checks, or decorative metadata
assertions. Keep source-backed curriculum and timetable checks.

Deployment to GitHub Pages and Cloudflare Workers runs automatically via GitHub Actions on push to `main`.
