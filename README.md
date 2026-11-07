# Learning Academy

Evidence-based revision web app designed for school children preparing on exam eve.

**Live Site:** [https://firofame.github.io/learning-academy/](https://firofame.github.io/learning-academy/)

---

## Key Features

- **Evidence-Based Learning:** Active retrieval practice, immediate explanations, instant "Try once more" corrections, and lagged error rechecks (`gapCount >= 2`) to ensure exam-readiness.
- **Subjects & Grades:** Tailored curricula for **Grade 2** and **Grade 6** across Spell Bee, Robotics, Maths, Malayalam, Hindi, EVS, and Biology.
- **Dual Grading Engine:** Instant deterministic checks for exact answers; server-side Gemini 3.5 Flash-Lite Worker for meaning-based written answers.
- **Local-First & Offline:** Progress and session drafts persist locally in IndexedDB with JSON backup/restore. Works offline via service worker caching.
- **Every Device:** Clean touch-first interface optimized for phones, tablets, and laptops with native-script input support.

---

## Quick Start

```bash
npm ci            # Install dependencies
npm run dev       # Start local dev server
npm test          # Run test suite
npm run lint      # Type check
npm run build     # Production build
```

---

## Grading Worker (Cloudflare)

Written-answer semantic grading runs on a separate Cloudflare Worker:

```bash
npm run worker:dev     # Local Wrangler dev server
npm run worker:deploy  # Deploy Worker
```

> **Security Note:** Store `GEMINI_API_KEY` as a Worker secret (`wrangler secret put GEMINI_API_KEY`), never in client-side code.
