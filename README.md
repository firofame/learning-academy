# Spell Bee Academy & Learning Companion

An evidence-based spelling and vocabulary learning companion designed for calm, systematic mastery.

## Package Manager & Development Workflow

This project standardizes on **npm** (`package-lock.json`).

### Installation
```bash
npm install
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

### Type Checking & Build
```bash
npm run lint
npm run build
```

## Features & Learning Design

- **3-Mode Learning Progression**:
  1. *Learn*: Auditory pronunciation, phonics guide, contextual usage, and tricky spot mnemonics.
  2. *Practice (Assisted)*: Scaffolded syllable and akshara block assembly.
  3. *Test (Unaided Recall)*: Target word is hidden. Requires independent digital typing or notebook handwriting.
- **Evidence-Based Test-Readiness Mastery**:
  - Requires qualifying unaided recalls across at least **two distinct calendar days** (using the learner's local calendar) before marking a word **Test-Ready**.
  - Assisted practice (tile helpers, revealed spellings) does not earn unaided credit or clear outstanding revisit flags.
- **Spaced Repetition & Balanced Scheduling**:
  - Genuinely due words (missed words, words due for distinct-day confirmation, and periodic retention checks) are balanced with new unseen vocabulary.
  - In-session mistakes are re-queued 2-3 cards later for reinforcement.
- **Multi-Language Support**:
  - Supports English, Hindi (Devanagari), and Malayalam script with canonical Unicode normalization.
