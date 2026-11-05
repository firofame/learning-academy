# Learning Academy

A grade-aware app for calm exam-eve revision in **Spell Bee**, **Robotics**, **Maths**,
**Malayalam**, and **Hindi**.

## Shared Learning Flow

- Every subject uses the same recall-first sequence: answer from memory, get feedback
  and optional help, then recheck a missed or assisted question after two other
  completed questions.
- Immediate corrections do not erase the first attempt. Same-day rechecks are
  revision evidence, not a claim of long-term mastery.
- Optional mock exams hide feedback until completion. Subject curricula, native
  scripts, deterministic checks, and rubric-based Gemini grading remain specific
  to each lesson.
- Spell Bee now uses this same flow; its separate word-browser and worksheet screens
  have been removed.

## Subjects & Grades

- The app opens on a subject home screen for the active student and their grade.
- Spell Bee, Robotics, and Maths are available for both **Grade 2** (Maths: notebook revision) and **Grade 6** (Maths: Chapter 14 Basic Geometry).
- Malayalam revision is available for **Grade 2** and **Grade 6**. Fazia's Grade 2 lesson covers her first-semester portions; Shiza's Grade 6 lesson covers all **176 exercises from Lessons 1–5** (വാത്സല്യപൂരം, സർക്കസ്സ്, പ്രാചീനകവിത്രയം, ധനമോഹം, and വെനീസിലെ വ്യാപാരി) in the supplied study-notes PDF, including meanings, multiple meanings (നാനാർഥം), synonyms, opposites, gender pairs, split and joined words, vigraha, sentence usage, and written answers.
  - Lesson 2's sentence prompt uses **അപ്രതീക്ഷിതം**, as supplied, not പ്രതീക്ഷ.
  - The PDF marks Lessons 1–2 plus the first eight poem lines as first mid-semester portions; all five supplied lessons are available for revision. The poem lines are absent and are not invented. Lesson 4 supplies only written questions 4–5; missing questions 1–3 are not guessed. Lesson 3's ആദ്യകൃതി wording/answer is retained from the notes and flagged for teacher confirmation.
  - Existing question IDs and learner storage keys are retained. Earlier 69-question exams and the old sentence answer remain readable as historical results; new exams require all 176 questions. Content/rubric versions are incremented so pre-update drafts are not resumed against changed questions; their stored records remain available in backups.
- Hindi revision is available for **Grade 6** and covers Shiza's supplied notebook portions with vocabulary, translations, synonyms, the trees poem and questions, Sreedharan questions, and a paragraph prompt. The incomplete `वचन बदलो` list and one unclear vocabulary entry are not guessed.
- Revision cues ask for the word paired with the listed letter groups, and the signs questions use the mappings from the supplied portion sheet. The sheet's Devanagari-looking `्व` entry is rendered with Malayalam `്വ`.
- EVS, English, Hindi, and the other spelling groupings are **word categories within Spell Bee**.
  Malayalam and Hindi are also available as standalone exam-preparation subjects, distinct from
  their optional Spell Bee word categories and the standalone **Maths** curriculum subject.
  Malayalam serves both grades; Hindi is Grade 6 only.
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
- Existing browser-storage keys and curriculum IDs are retained for recovery and
  migration. Shared revision attempts are kept separately in learner-scoped history.

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
  attempt IDs. Where a legacy subject summary exists, completion continues to
  update that format; shared per-answer attempts are saved separately. Session
  drafts save question order, answers, progress, and assistance state so an
  unfinished revision can be resumed after a reload. **Save and exit** also offers
  **Resume current session** on the overview without a reload or a new batch.
  A draft for changed lesson content is not resumed.
- Spell Bee completion updates its retained per-word summary using the initial
  response, without duplicating shared per-answer history or successful writes
  on a save retry. Practice and assisted exam answers remain practice evidence;
  only unaided exam answers count as test recall in that legacy summary.
- In **Progress & backup**, use **Download backup** before changing browser, origin,
  or device. Keep the JSON file somewhere safe. On the new browser/device, open
  Progress & backup for the same learner and choose **Restore backup**. Restore
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
robotics short answers, equivalent Malayalam answers (including Shiza's Grade 6
written answers), and supported written answers for Shiza's Grade 6 Hindi lesson
using **`gemini-3.5-flash-lite`**. Exact Malayalam meanings, split words, joined
words, and synonyms are checked locally first; only a non-exact answer with a
marking rubric is sent for an equivalent-meaning check. Exact Hindi vocabulary,
translations, synonyms, poem completions, fixed-answer questions, and spelling
continue to be checked locally. There is no parent-marking or notebook-answer
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

- **Retrieval practice:** all five subjects ask learners to recall before showing help
  or answers. Incorrect and skipped items remain visible until a later recheck.
- **Same-day spacing:** a recheck is scheduled only after two other completed
  questions. Assisted answers and immediate corrections cannot clear the original
  difficulty; a correct unaided recheck can. No multi-day mastery is claimed.
- **Curriculum fidelity:** Grade 2 and Grade 6 content remains tied to the supplied
  school materials. Malayalam and Hindi retain native-script input and lesson-specific
  answer checks; uncertain source material is not guessed.
- **Automatic grading:** supported written answers use the server-side
  `gemini-3.5-flash-lite` model. If checking is unavailable, the answer stays
  ungraded, is preserved, and can be retried.
- **Local progress:** attempts, assistance, exam results, and unfinished session
  drafts are learner-scoped and saved on the device. Progress & backup supports
  export and restore.
- **Phone and laptop support:** controls stack on narrow screens, use touch-friendly
  targets, and support keyboard input, accessible focus, native scripts, and optional
  read-aloud/slow speech.
