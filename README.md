# Learning Academy

Evidence-based revision web app designed for school children preparing on exam eve.

**Live Site:** [https://firofame.github.io/learning-academy/](https://firofame.github.io/learning-academy/)

## Key Features

- **Evidence-Based Learning:** Active retrieval practice, immediate explanations, instant corrections, and lagged error rechecks.
- **Subjects & Grades:** Tailored curricula for Grade 2 and Grade 6, with subject availability varying by grade across Spell Bee, Robotics, Maths, Malayalam, Hindi, EVS, Biology, and Chemistry.
- **Dual Grading Engine:** Deterministic local checks for exact answers and server-side AI evaluation for meaning-based written answers.
- **Offline Access:** Previously accessed content can be available offline after initial online access, but AI-assisted grading requires an internet connection.
- **Multi-Device Support:** Touch-first interface optimized for phones, tablets, and laptops with native Malayalam and Hindi script input.

## Getting Started

```bash
npm ci            # Install dependencies
npm run dev       # Start local dev server
npm test          # Run test suite
npm run lint      # Type check
npm run build     # Production build
```

Deployment to GitHub Pages and Cloudflare Workers runs automatically via GitHub Actions on push to `main`.
