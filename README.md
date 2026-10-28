# Spell Bee Academy & Learning Companion

An evidence-based spelling and vocabulary learning companion designed for calm, systematic mastery.

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

## Features & Learning Design

- **Robotics Exam Revision**:
  - Open **Robotics** in the main navigation. Switching profiles selects Fazia's Grade 2 *Simple and Complex Machines* or Shiza's Grade 6 *Exploring AI Domains* lesson.
  - Content follows the supplied Lesson 1 school PDFs: 23 Grade 2 questions and 22 Grade 6 questions covering true/false, multiple choice, fill in the blanks, and short answers.
  - Revision cards include read-aloud using the existing voice/slow-speech controls, memory tips, and a short revision plan.
  - Assisted practice gives immediate feedback. The full exam quiz hides answers until all questions are submitted; a parent then marks written/notebook answers against the model, allowing equivalent wording.
  - The latest practice and exam results are saved separately for each child in browser storage, without changing spelling progress or its mastery rules. Parent Insights links to robotics and shows the latest exam score.
  - Missed questions can be practised again. Assisted practice does not clear revisit flags; a correct answer in a completed full exam does. Scores are revision snapshots, not claims of verified mastery.
  - Results save only after completion, including any parent checks. Navigating away or switching profiles discards an unfinished quiz. Failed saves show a warning and can be retried from the results page. Spelling resets do not erase robotics results.
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
  - Subject pickers use a native dropdown on phones so every subject is discoverable without horizontal scrolling.
  - Cards and action buttons stack to fit narrow screens; the phone header scrolls away to leave more room for learning and the keyboard.
  - Typing starts only when the child taps the answer field. Spelling inputs request no autocorrect, automatic capitals, autocomplete, or spellcheck so keyboard hints do not undermine recall.
  - Desktop navigation and printable worksheets retain their existing layouts.
- **Multi-Language Support**:
  - Supports English, Hindi (Devanagari), and Malayalam script with canonical Unicode normalization.
