# Learning Academy

A grade-aware learning app with **Spell Bee**, **Robotics**, **Maths**, **Malayalam**, and
**Hindi** as separate subjects, designed for calm, systematic learning.

## Subjects & Grades

- The app opens on a subject home screen for the active student and their grade.
- Spell Bee, Robotics, and Maths are available for both **Grade 2** (Maths: notebook revision) and **Grade 6** (Maths: Chapter 14 Basic Geometry).
- Malayalam exam revision is available for **Grade 2** and covers Fazia's first-semester portions with section practice, a full mock exam, and saved missed questions.
- Hindi exam revision is available for **Grade 6** and covers Shiza's supplied notebook portions with vocabulary, translations, synonyms, the trees poem and questions, Sreedharan questions, a paragraph prompt, section practice, a full mock exam, and saved missed questions. The incomplete `वचन बदलो` list and one unclear vocabulary entry are not guessed.
- Revision cues ask for the word paired with the listed letter groups, and the signs questions use the mappings from the supplied portion sheet. The sheet's Devanagari-looking `्व` entry is rendered with Malayalam `്വ`.
- EVS, English, Hindi, and the other spelling groupings are **word categories within Spell Bee**.
  Malayalam and Hindi are also available as standalone exam-preparation subjects for Grade 2 and
  Grade 6 respectively, distinct from their optional Spell Bee word categories and the standalone
  **Maths** curriculum subject.
- Spell Bee has its own Practice, Words, Parent Insights, and Worksheets navigation.
- Each subject declares its own `availableGrades` in
  [`src/data/subjects.ts`](src/data/subjects.ts). Availability is not assumed to be
  the same across subjects. Home cards, navigation, and related dashboard links
  use this catalog. Switching to a profile whose grade does not offer the current
  subject returns to the subject home screen.
- Student profiles in [`src/data/profiles.ts`](src/data/profiles.ts) have an explicit
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

Small settings and the synchronous progress snapshots used by existing screens
remain in each browser's local storage. Structured attempt history and unfinished
session drafts are also stored in versioned IndexedDB records. Progress from a
local development URL does not transfer automatically to the published site or
another device.

### Local progress, migration, and backup

- On startup, the app copies recognized legacy spelling, Robotics, Maths,
  Malayalam, Hindi, settings, and active-profile keys into the versioned
  `learning-academy-progress` IndexedDB database. It verifies each copied value
  before writing the migration marker. Original local-storage keys are retained
  for recovery; legacy summaries are labeled as summaries and are not expanded
  into invented per-question attempts.
- Each checked answer is written to IndexedDB immediately with its content/rubric
  version, timestamp, outcome, assistance, and grading provenance. Failed AI checks
  are recorded as ungraded under the same attempt ID; a retry updates that record
  instead of counting the outage as a wrong answer. Final quiz results reuse those
  attempt IDs. Completed results continue to use each subject's
  existing local-storage format while it is mirrored to IndexedDB. Session drafts save question order, answers,
  progress, and assistance state so an unfinished quiz can be resumed after a
  reload. A draft for changed lesson content is not resumed.
- In **Parent Insights**, use **Download backup** before changing browser, origin,
  or device. Keep the JSON file somewhere safe. On the new browser/device, open
  Parent Insights for the same learner and choose **Restore backup**. Restore
  imports only missing records and preserves existing local records. Each learner
  has a separate backup; settings are not included.
- If IndexedDB setup or a mirrored write fails, the app reports that the secondary
  save did not complete and offers a retry. Existing local-storage progress remains
  readable. IndexedDB is browser-local and is not cloud synchronization.
- The production service worker caches the app shell and lesson assets as they are
  used, so previously opened content can work offline. First use still needs a
  connection. Meaning-based AI grading always requires internet; offline attempts
  stay unmarked and can be retried after reconnecting.

## Automatic Written-Answer Grading (Cloudflare Workers)

The website stays on GitHub Pages. A separate Cloudflare Worker checks typed
robotics short answers, equivalent Malayalam answers, and supported written answers
for Shiza's Grade 6 Hindi lesson using **`gemini-3.5-flash-lite`**. Exact Hindi
vocabulary, translations, synonyms, poem completions, fixed-answer questions, and
spelling continue to be checked locally. There is no parent-marking or notebook-answer
step for new robotics quizzes. Historical parent-checked results remain readable.

Deployed grading endpoint:
https://learning-academy-grading.firofame.workers.dev/grade
(POST requests only; no access code required).

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
3. Review `ALLOWED_ORIGINS` in [`wrangler.jsonc`](wrangler.jsonc). It includes
   `https://firofame.github.io` and local Vite URLs. Use origins without paths or
   trailing slashes. If rate-limit namespace `1001` is already used by another
   Worker in your Cloudflare account, choose an unused namespace.
4. Deploy:
   ```bash
   npm run worker:deploy
   ```
5. In the GitHub repository, open **Settings > Secrets and variables > Actions >
   Variables** and create `VITE_GRADING_API_URL` with the full endpoint:
   `https://learning-academy-grading.<your-subdomain>.workers.dev/grade`.
   Run the GitHub Pages deployment workflow again. Only this public URL goes
   into the frontend build; the Gemini key does not belong in GitHub Pages.

Children only enter their answer and select **Check answer** in practice or
**Save answer and continue** in an exam. No access code or parent unlock is
required, including after leaving Robotics or reloading.

The grading endpoint is publicly usable. Origin checks restrict browser access
but are not authentication; other clients can imitate an allowed origin and
consume your Gemini quota. The Worker keeps Cloudflare per-IP and shared-family
rate limits, each configured at six requests per minute, as best-effort abuse
protection. These counters are approximate and location-local, not a guaranteed
global ceiling for Gemini's project-level RPM. An uncertain answer can use a
second Gemini request, so six grading attempts can generate up to 12 model
requests in a rate-limit window. Check the actual RPM, TPM, and daily quotas in
Google AI Studio, keep the Gemini key exclusively in the Worker, and monitor
usage and billing. Other clients using the same Gemini project share its quota.
Revisit stricter global enforcement if usage or costs become significant.

When upgrading an existing deployment, redeploy both the Worker and GitHub Pages.
The old family-code Worker secret is no longer required or read.

### Local development

Create a gitignored `.dev.vars` for Wrangler containing `GEMINI_API_KEY`.
Copy `.env.example` to `.env.local`
for the frontend endpoint. In separate terminals run:

```bash
npm run worker:dev
npm run dev
```

Alternatively export `GEMINI_API_KEY` in your shell and run `npm run worker:dev`.
The required-secret list in `wrangler.jsonc` lets Wrangler read just that name
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
  If Gemini reports that the pinned model is unavailable, the child sees that the
  configured Gemini 3.5 Flash-Lite model could not be reached; the answer stays ungraded.
  "I don't know yet" is an explicit skipped answer and does count as incorrect.
- Practice shows feedback immediately. Exam feedback stays hidden until all
  questions finish. Completed results and per-answer attempt records are saved;
  unfinished quizzes are kept as resumable drafts.
- Requests do not require authentication and have per-IP and shared limits of
  6 requests per minute **per Cloudflare location**. Cloudflare's counters are
  approximate, not a strict global spending cap. Each request can make up to two
  Gemini calls. Check Gemini quotas/billing separately; free Worker hosting does
  not imply free or unlimited Gemini usage.
- Worker placement targets Mumbai (`gcp:asia-south1`). Without placement, a
  request can run in a Cloudflare location where Gemini is unavailable, causing
  intermittent failures depending on where the site is opened. Placement hints
  select a nearby Cloudflare location; they are not a strict data-residency
  guarantee. Keep the target in a Gemini-supported region.
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
  - Completed results save after the quiz, including automatic written-answer checks. Unfinished quizzes save resumable drafts; switching profiles never carries a draft into another learner. Failed checks preserve the answer for retry. Spelling resets do not erase robotics results.
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
  - Spelling records are validated in full, including history, dates, counters, and student identity. Malformed records are reported and skipped while valid progress is preserved. IndexedDB records and imported backups are schema-checked and learner-scoped.
  - An ungraded or interrupted answer remains available for retry; it is not saved as incorrect. Parent Insights provides local export and recovery.
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
