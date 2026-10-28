# Learning Academy

A grade-aware learning app with **Spell Bee** and **Robotics** as separate subjects,
designed for calm, systematic learning.

## Subjects & Grades

- The app opens on a subject home screen for the active student and their grade.
- Spell Bee and Robotics are currently available for both **Grade 2** and **Grade 6**.
- EVS, Maths, English, Hindi, Malayalam, and the other spelling groupings are
  **word categories within Spell Bee**, not separate academy subjects.
- Spell Bee has its own Practice, Words, Parent Insights, and Worksheets navigation.
- Each subject declares its own `availableGrades` in
  [`src/data/subjects.ts`](src/data/subjects.ts). Availability is not assumed to be
  the same across subjects. Home cards, navigation, and related dashboard links
  use this catalog. Switching to a profile whose grade does not offer the current
  subject returns to the subject home screen.
- Student profiles in [`src/data/wordList.ts`](src/data/wordList.ts) have an explicit
  numeric `grade`. Spelling words and robotics lessons are selected by grade,
  while progress remains stored separately for each student.
- To add another grade, add its curriculum content and profile, then include that
  grade only in the subjects that offer it. To add another subject, define its
  identity, description, available grades, and views in the catalog, and wire its
  learning view into [`src/App.tsx`](src/App.tsx) and the subject ID type in
  [`src/types/index.ts`](src/types/index.ts).
- Existing browser-storage keys and curriculum IDs are unchanged, so the rename
  does not reset saved spelling or robotics progress.

## Package Manager & Development Workflow

This project standardizes on **npm** (`package-lock.json`).

### Installation
```bash
npm ci
```

### Development
```bash
npm run dev
```

### Testing
Run the regression test suite:
```bash
npm test
```
The suite includes storage/curriculum checks and real React interaction tests in jsdom.

### Type Checking & Build
```bash
npm run lint
npm run build
```

## GitHub Pages

Live site: https://firofame.github.io/learning-academy/

The [deployment workflow](.github/workflows/deploy-pages.yml) runs tests, type
checking, and a production build on every push to `main`, then publishes `dist`
to GitHub Pages. It can also be started manually from the repository's Actions
tab. Repository **Settings > Pages > Source** must be set to **GitHub Actions**.

The deployment uses the Pages base path so JavaScript and CSS load correctly
under `/learning-academy/`, without changing the local development URL. To
reproduce the deployed build locally:

```bash
npm run build -- --base /learning-academy/
npm run preview -- --base /learning-academy/
```

Learning progress is stored in each browser's local storage. Progress from a
local development URL does not transfer automatically to the published site.

## Automatic Robotics Grading (Cloudflare Workers)

The website stays on GitHub Pages. A separate Cloudflare Worker checks typed
short answers using **`gemini-3.5-flash-lite`**. Fixed-answer questions and spelling
continue to be checked locally. There is no parent-marking or notebook-answer
step for new robotics quizzes. Historical parent-checked results remain readable.

Deployed grading endpoint:
https://learning-academy-grading.firofame.workers.dev/grade
(authenticated POST requests only).

### Deploy the grading Worker

1. Create a Cloudflare account with Workers enabled, then authenticate:
   ```bash
   npx wrangler login
   ```
2. Store the Gemini key as a **Worker secret**, never as a frontend variable:
   ```bash
   printf '%s' "$GEMINI_API_KEY" | npx wrangler secret put GEMINI_API_KEY
   ```
   Run this in the zsh terminal where your key is set, or put it in a Codespaces
   secret and restart the Codespace first. Do not paste the key into source code,
   chat, a GitHub Pages build variable, or any `VITE_` variable.
3. Generate a random family access code, save it in your password manager, and
   enter it at the secret prompt:
   ```bash
   openssl rand -hex 24
   npx wrangler secret put GRADING_ACCESS_TOKEN
   ```
   The code must be 24–128 characters. It is separate from the Gemini key.
4. Review `ALLOWED_ORIGINS` in [`wrangler.jsonc`](wrangler.jsonc). It includes
   `https://firofame.github.io` and local Vite URLs. Use origins without paths or
   trailing slashes. If rate-limit namespace `1001` is already used by another
   Worker in your Cloudflare account, choose an unused namespace.
5. Deploy:
   ```bash
   npm run worker:deploy
   ```
6. In the GitHub repository, open **Settings > Secrets and variables > Actions >
   Variables** and create `VITE_GRADING_API_URL` with the full endpoint:
   `https://learning-academy-grading.<your-subdomain>.workers.dev/grade`.
   Run the GitHub Pages deployment workflow again. Only this public URL goes
   into the frontend build; neither secret belongs in GitHub Pages.

Enter the family grading code at the first written-answer question. It stays in
React memory while Robotics is open, is reused for subsequent questions, and is
not saved in browser storage. Leaving Robotics or reloading requires re-entry.
Anyone holding the code can use the grading API; rotate it if it is shared.
Origin checks are defense in depth, not authentication.

### Local development

Create a gitignored `.dev.vars` for Wrangler using the same two secret names:
`GEMINI_API_KEY` and `GRADING_ACCESS_TOKEN`. Copy `.env.example` to `.env.local`
for the frontend endpoint. In separate terminals run:

```bash
npm run worker:dev
npm run dev
```

Alternatively export both secrets in your shell and run `npm run worker:dev`.
The required-secret list in `wrangler.jsonc` lets Wrangler read just those names
from the process environment. Your shell's Gemini key is never automatically
available on the deployed Worker.

### Marking, limits, and privacy

- The Worker accepts only known curriculum lesson/question IDs and short
  answers up to 1,200 characters. It loads the reference answer and explicit
  marking criteria itself; clients cannot supply their own marking prompt.
- Equivalent wording and valid alternative examples are accepted; missing
  essential ideas and contradictions are not. AI marks can still be wrong.
- An uncertain result gets one independent second check using the same model.
  If still inconclusive, or on quota, network, blocked, or malformed responses,
  the answer remains ungraded and can be retried. No failure becomes a wrong mark.
  "I don't know yet" is an explicit skipped answer and does count as incorrect.
- Practice shows feedback immediately. Exam feedback stays hidden until all
  questions finish. Only completed, graded quizzes are saved.
- Requests require the family code and have per-IP and family-wide limits of
  30 requests per minute **per Cloudflare location**. Cloudflare's counters are
  approximate, not a strict global spending cap. Each request can make up to two
  Gemini calls. Check Gemini quotas/billing separately; free Worker hosting does
  not imply free or unlimited Gemini usage.
- Only grade level, question, reference, criteria, and the typed answer are sent
  to Google. Student IDs/names and progress are not sent. Do not enter personal
  information in answers. Check Google's data-use terms before using its free
  tier with children's work. The Worker does not log answer text or credentials.

Validate the Worker bundle with `npm run worker:check`. Tests cover the backend,
browser client, automatic marking, legacy storage, and retry/cancellation flows.

## Features & Learning Design

- **Robotics Exam Revision**:
  - Open **Robotics** from the subject home screen or main navigation. Switching profiles selects Fazia's Grade 2 *Simple and Complex Machines* or Shiza's Grade 6 *Exploring AI Domains* lesson.
  - Content follows the supplied Lesson 1 school PDFs: 23 Grade 2 questions and 22 Grade 6 questions covering true/false, multiple choice, fill in the blanks, and short answers.
  - Revision cards include read-aloud using the existing voice/slow-speech controls, memory tips, and a short revision plan.
  - Assisted practice gives immediate feedback. The full exam quiz hides feedback until all questions are submitted. Typed short answers are checked automatically against server-owned criteria, allowing equivalent wording.
  - The latest practice and exam results are saved separately for each child in browser storage, without changing spelling progress or its mastery rules. Parent Insights links to robotics and shows the latest exam score.
  - Missed questions can be practised again. Assisted practice does not clear revisit flags; a correct answer in a completed full exam does. Scores are revision snapshots, not claims of verified mastery.
  - Results save only after completion, including automatic written-answer checks. Navigating away or switching profiles discards an unfinished quiz. Failed checks preserve the answer for retry; failed saves can be retried from the results page. Spelling resets do not erase robotics results.
- **3-Mode Learning Progression**:
  1. *Learn*: Auditory pronunciation, phonics guide, contextual usage, and tricky spot mnemonics.
  2. *Practice (Assisted)*: Scaffolded syllable and akshara block assembly.
  3. *Test (Unaided Recall)*: Target word is hidden. Requires independent digital typing or notebook handwriting.
  - New words open in Learn mode; previously attempted words open directly in the hidden test.
  - Seeing Learn/Practice content or opening native-script helpers makes the current card assisted, even after switching to Test or Paper Notebook.
  - Phonetic spelling guides appear only in Learn mode. Notebook answers must be written before revealing the spelling for parent verification; switching back to typing after that reveal counts as assisted.
- **Evidence-Based Test-Readiness Mastery**:
  - Requires qualifying unaided recalls across at least **two distinct calendar days** (using the learner's local calendar) before marking a word **Test-Ready**.
  - Assisted practice (tile helpers, revealed spellings) does not earn unaided credit or clear outstanding revisit flags.
  - A failed unaided test resets the distinct-day confirmation streak, so recovery requires fresh evidence across two days.
- **Spaced Repetition & Balanced Scheduling**:
  - Genuinely due words (missed words, words due for distinct-day confirmation, and periodic retention checks) are balanced with new unseen vocabulary.
  - In-session mistakes are re-queued 2-3 cards later for reinforcement.
  - Retention checks are due three days after the last qualifying unaided success; assisted practice never postpones them. Legacy progress uses qualifying history or recorded recall dates, not the last assisted attempt.
- **Reliable Local Progress**:
  - Saved records are validated in full, including history, dates, counters, and student identity. Malformed records are reported and skipped while valid progress is preserved.
- **Consistent Controls**:
  - Voice and slow-speech settings apply across every screen. Navigation wraps into a second row on compact screens.
- **Small-Screen Learning**:
  - Phone controls have at least 48px touch targets, with larger supporting text and short Learn / Practice / Test labels.
  - Spell Bee word-category pickers use a native dropdown on phones so every category is discoverable without horizontal scrolling.
  - Cards and action buttons stack to fit narrow screens; the phone header scrolls away to leave more room for learning and the keyboard.
  - Typing starts only when the child taps the answer field. Spelling inputs request no autocorrect, automatic capitals, autocomplete, or spellcheck so keyboard hints do not undermine recall.
  - Desktop navigation and printable worksheets retain their existing layouts.
- **Multi-Language Support**:
  - Supports English, Hindi (Devanagari), and Malayalam script with canonical Unicode normalization.
