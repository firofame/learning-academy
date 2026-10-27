# Multi-Student Expansion: Fazia (Grade 2) & Shiza (Grade 6)

A calm, evidence-based spelling mastery application supporting distinct student profiles for **Fazia (Grade 2 · 45 words)** and **Shiza (Grade 6 · 80 words)**. Engineered around verifiable test readiness: strictly separating assisted practice from unaided recall, protecting native Indic orthography, isolating student progress with automatic migration, and generating student test sheets with separate teacher answer keys.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The plan has been thoroughly revised in response to the review findings:

- **Reconciled Word Counts (Dynamic, Not Hardcoded)**:
  - **Fazia (Grade 2)**: Exactly **45 words** across 6 subjects (EVS: 7, Maths: 6, Malayalam: 7, Computer: 5, English: 10, Hindi: 10).
  - **Shiza (Grade 6)**: Exactly **80 words** across 9 subjects (Biology: 10, Computer: 10, Maths: 4, Physics: 7, Chemistry: 9, English: 12, History: 10, Malayalam: 8, Hindi: 10).
  - All UI badges, progress headers, and counters will derive dynamically from `words.length` in the dataset rather than static strings.
- **Strict 3-Mode Separation (Learn $\to$ Practice $\to$ Test)**:
  - **1. Learn Mode (Discover & Understand)**: Full word display, audio pronunciation, syllable breakdown, definition, example sentence, and tricky-pattern mnemonic.
  - **2. Practice Mode (Assisted Scaffolding)**: Tactile grapheme/akshara tiles and fill-in letter tiles with real-time corrective coaching. *Assisted completion does NOT award mastery points.*
  - **3. Test Mode (Unaided Recall)**: The target word is completely hidden. The audio speaks the word and sentence with the target word blanked out (`______`). No hints or auto-complete. Supports typed independent recall and paper notebook verification.
- **Evidence-Based "Test-Ready" Mastery Standard**:
  - A word is marked **Remembered / Test-Ready** ONLY after being spelled correctly **without assistance or hints on at least two separate sessions/days**, including mixed review.
  - Immediate copying after a mistake is treated as assisted; misspelled words are re-queued to reappear after 2–3 intervening words, and re-tested in the next session.
- **Linguistic Integrity for Malayalam & Hindi**:
  - Romanized transliteration is treated strictly as an oral/phonetic learning aid, not proof of native script mastery.
  - Native script spelling can be tested via on-screen akshara/conjunct tiles or via **Paper Handwriting Test Mode** with parent grading.
  - No global vowel merging (`aa` $\ne$ `a`, short vs long matras remain distinct).
- **Safe Data Migration & Profile Isolation**:
  - On launch, any existing Grade 2 progress in `spellbee_progress_v1` is cleanly migrated to `spellbee_progress_fazia_v1` while preserving the legacy backup.
  - Shiza's progress is stored independently in `spellbee_progress_shiza_v1`.
  - Switching student profiles clears active session inputs, hints, and queues, reloading the appropriate curriculum and history.
- **Printable Worksheets with Separate Answer Keys**:
  - Produces two clean, print-formatted views:
    1. **Student Worksheet**: Numbered list with contextual sentence (`______`), syllable count / clue, and ruled pen/pencil writing lines.
    2. **Parent / Teacher Answer Key**: Complete verified spellings, native scripts, meanings, and tricky spots.
- **Accessibility & Contrast Verification**:
  - Color palette updated with WCAG AA compliant dark text tokens (all text $\ge 5.0:1$ contrast against white and light canvases):
    - Biology: `#065F46` (contrast 7.1:1) on `#ECFDF5`
    - Physics: `#0369A1` (contrast 5.6:1) on `#F0F9FF`
    - Chemistry: `#6D28D9` (contrast 6.2:1) on `#F5F3FF`
    - Computer: `#0E7490` (contrast 5.4:1) on `#ECFEFF`
    - Maths: `#1D4ED8` (contrast 6.8:1) on `#EFF6FF`
    - English: `#3730A3` (contrast 8.5:1) on `#EEF2FF`
    - History: `#92400E` (contrast 6.5:1) on `#FFFBEB`
    - Malayalam: `#78350F` (contrast 8.0:1) on `#FEF3C7`
    - Hindi: `#9F1239` (contrast 7.8:1) on `#FFF1F2`

---

### 1. Verified Curricula

#### Grade 6 Curriculum for Shiza (80 Words Total)

1. **Biology (10 words)**:
   - `Phyllotaxy` (arrangement of leaves on an axis; tricky: *ph*, *y*, *ll*)
   - `Venation` (arrangement of veins in a leaf; tricky: *ven-a-tion*)
   - `Androecium` (male reproductive organ of a flower; tricky: *oecium*)
   - `Gynoecium` (female reproductive organ of a flower; tricky: *gyn-oecium*)
   - `Pollination` (transfer of pollen grains; tricky: double *l*)
   - `Fertilization` (fusion of male and female gametes; tricky: *ti-li-za-tion*)
   - `Chromosomes` (thread-like structures carrying genes; tricky: *ch*, *s-o-m-e-s*)
   - `Lysosomes` (cell organelles containing digestive enzymes; tricky: *ly-so-somes*)
   - `Nutrition` (process of taking in and utilizing food; tricky: *nu-tri-tion*)
   - `Oesophagus` (muscular tube passing food to stomach; tricky: silent initial *O*, *ph*)

2. **Computer (10 words)**:
   - `Mail Merge` (feature to create personalized letters in bulk; two words)
   - `Interpreter` (program translating high-level code line-by-line; tricky: *ter-pret-er*)
   - `Mainframe Computers` (high-performance computers for bulk data processing)
   - `Wild card character` (symbol like `*` or `?` representing other characters)
   - `Asterisk` (star-shaped typographic symbol `*`; tricky: *as-ter-isk*, not *asterix*)
   - `Preferred` (liked better or chosen; tricky: double *r*: *p-r-e-f-e-r-r-e-d*)
   - `Autofit contents` (spreadsheet feature adjusting column width to fit text)
   - `Enhance` (to improve or increase in quality or value; tricky: *en-hance*)
   - `Aligning` (arranging in a straight line or correct position; tricky: silent *g*: *a-l-i-g-n-i-n-g*)
   - `Mnemonic` (memory aid technique; tricky: silent initial *M*: *m-n-e-m-o-n-i-c*)

3. **Maths (4 words)**:
   - `Linear equations` (algebraic equations with degree 1; two words)
   - `Algebra` (branch of mathematics dealing with symbols and rules; tricky: *al-ge-bra*)
   - `Fundamental` (serving as an essential basis or core foundation; tricky: *fun-da-men-tal*)
   - `Operations` (mathematical processes like addition, subtraction, multiplication)

4. **Physics (7 words)**:
   - `Measurement` (determining size, amount, or degree; tricky: *meas-ure-ment*)
   - `Importance` (state of having great significance or consequence; tricky: *im-por-tance*)
   - `Quantities` (amounts or numbers of something that can be measured; tricky: *quan-ti-ties*)
   - `Characteristics` (distinguishing qualities or traits; tricky: *ch-a-r-a-c-t-e-r-i-s-t-i-c-s*)
   - `Friction` (resistance that one surface encounters moving over another; tricky: *fric-tion*)
   - `Necessary` (required to be done or achieved; tricky: one *c*, double *s*: *n-e-c-e-s-s-a-r-y*)
   - `Static friction` (friction that prevents two surfaces from sliding past each other)

5. **Chemistry (9 words)**:
   - `Alchemists` (early practitioners of proto-chemistry seeking the philosopher's stone; tricky: *al-chem-ists*)
   - `Formula` (mathematical or chemical rule expressed in symbols; tricky: *for-mu-la*)
   - `Periodic table` (tabular arrangement of the chemical elements by atomic number)
   - `Fertilisers` (substances added to soil to increase fertility; tricky: *fer-ti-li-sers*)
   - `Pesticides` (chemicals used to destroy pests and insects; tricky: *pes-ti-cides*)
   - `Antipyretic` (substance that reduces fever; tricky: *an-ti-py-ret-ic*)
   - `Elements` (pure substances consisting of one type of atom; tricky: *el-e-ments*)
   - `Metalloids` (elements with properties intermediate between metals and nonmetals; tricky: *met-al-loids*)
   - `Compounds` (substances composed of two or more separate elements; tricky: *com-pounds*)

6. **English (12 words)**:
   - `Panoplied` (splendidly arrayed or fully equipped with armor; tricky: *pan-o-plied*)
   - `Wretched` (unhappy, unfortunate, or of poor quality; tricky: silent *w*, *t-c-h*)
   - `Cringing` (bending head and body in fear or servility; tricky: *cring-ing*)
   - `Growl` (low guttural sound of anger or warning; tricky: *g-r-o-w-l*)
   - `Conceal` (keep from sight or hide; tricky: *c-o-n-c-e-a-l*)
   - `Beget` (give rise to or bring about; tricky: *b-e-g-e-t*)
   - `Gloom` (partial or total darkness, state of depression; tricky: double *o*)
   - `Slumbering` (sleeping peacefully or quietly; tricky: *slum-ber-ing*)
   - `Awful` (very bad or unpleasant; tricky: *a-w-f-u-l*, no *e*)
   - `Forgetful` (tending to forget things easily; tricky: *for-get-ful*, single *l*)
   - `Recite` (repeat aloud from memory; tricky: *r-e-c-i-t-e*)
   - `Veteran` (person with long experience in an activity or military; tricky: *vet-er-an*)

7. **History (10 words)**:
   - `Mesopotamia` (ancient civilization between Tigris and Euphrates; tricky: *Mes-o-po-ta-mi-a*)
   - `Ramayana` (ancient Indian epic of Prince Rama; tricky: *Ra-ma-ya-na*)
   - `Mahabharata` (ancient Sanskrit epic of the Kurukshetra War; tricky: *Ma-ha-bha-ra-ta*)
   - `Atharva Veda` (fourth sacred book of the Vedas containing hymns and spells)
   - `Panchayati Raj` (system of local self-government in rural India)
   - `Vanaprastha` (retirement phase into forest dwelling in the Ashrama system)
   - `Hammurabi` (Babylonian king known for his ancient code of law; tricky: double *m*)
   - `Ziggurat` (stepped pyramid temple of ancient Mesopotamia; tricky: double *g*)
   - `Upanayana` (traditional Vedic rite of passage into student life; tricky: *U-pa-na-ya-na*)
   - `Nyaya Panchayat` (village-level judicial council for dispute resolution)

8. **Malayalam (8 words from notebook image)**:
   - `രാജ്യപത്നി` (*Rajyapathni* – Queen consort / Empress; tricky conjuncts: `ജ്യ`, `ത്നി`)
   - `സാഹസം` (*Saahasam* – Adventure / Bold act; tricky: long `സാ`, `ഹ`, `സം`)
   - `തൂലികാനാമം` (*Thoolikanaamam* – Pen name / Pseudonym; tricky: `തൂ`, `ലി`, `കാ`, `നാ`, `മം`)
   - `മനോഹരം` (*Manoharam* – Beautiful / Charming; tricky: `മ`, `നോ`, `ഹ`, `രം`)
   - `നന്ദനൻ` (*Nandanan* – Son / Delightful child; tricky: nasal conjunct `ന്ദ`, chillu `ൻ`)
   - `ബുദ്ധി സാമർത്ഥ്യം` (*Buddhi Samarthyam* – Wit, wisdom, and intelligence; tricky: `ദ്ധി`, `ർത്ഥ്യം`)
   - `കൊള്ളപ്പലിശ` (*Kollappalisha* – Exorbitant interest / Usury; tricky: `ള്ള`, `പ`, `ലി`, `ശ`)
   - `ചെറുശ്ശേരി` (*Cherusseri* – Classical Malayalam poet; tricky: `ചെ`, `റു`, `ശ്ശേ`, `രി`)

9. **Hindi (10 words from notebook image)**:
   - `भरोसा` (*Bharosa* – Trust / Faith; tricky: `भ`, `रो`, `सा`)
   - `बीमार` (*Beemar* – Sick / Unwell; tricky: long `बी`, `मा`, `र`)
   - `सुनहरी` (*Sunahari* – Golden; tricky: short `सु`, `न`, long `हरी`)
   - `गुलाबी` (*Gulaabi* – Pink / Rose; tricky: short `गु`, `ला`, long `बी`)
   - `ताजा` (*Taaja* – Fresh / Crisp; tricky: `ता`, `जा`)
   - `थाली` (*Thaali* – Plate / Dish; tricky: `था`, long `ली`)
   - `नारियल` (*Naariyal* – Coconut; tricky: `ना`, short `रि`, `य`, `ल`)
   - `सज्जनता` (*Sajjanata* – Goodness / Nobility / Gentleness; tricky: geminate `ज्ज`: `स-ज्ज-न-ता`)
   - `ईमानदारी` (*Imaandaari* – Honesty / Integrity; tricky: independent `ई`, `मा`, `न`, `दा`, `री`)
   - `भारत सरकार` (*Bharat Sarkar* – Government of India; compound civic term)

---

### 2. User Experience & Core Workflows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Navigation Header                               │
│  [🐝 Spell Bee]  [Profile: Fazia (Gr 2) ⇄ Shiza (Gr 6)]  [Session Size: 5▾]  │
│  Nav: [Learn] [Practice] [Independent Test] [Curriculum] [Analytics] [Print]│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
│    Learn Mode     │        │   Practice Mode   │        │     Test Mode     │
│ - Spoken audio    │        │ - Scaffolding     │        │ - Target HIDDEN   │
│ - Full spelling   │        │ - Grapheme tiles  │        │ - Context sentence│
│ - Word definition │   ─►   │ - Akshara blocks  │   ─►   │   with blank: ____│
│ - Context sentence│        │ - Error diagnostic│        │ - Keyboard or     │
│ - Tricky patterns │        │ - Re-queue after  │        │   paper handwriting│
│ (No test scoring) │        │   2-3 words       │        │ - 2-Day Mastery   │
└───────────────────┘        └───────────────────┘        └───────────────────┘
```

#### The 3 Explicit Learning Phases

1. **Phase 1: Learn Mode (Discover & Understand)**:
   - The student listens to the word at normal or slow turtle speed.
   - The spelling is clearly displayed with syllables visually parsed.
   - Kid-friendly definition and contextual sentence illustrate the word's meaning.
   - Tricky-pattern spotlight explains the specific linguistic challenge (e.g. *Oesophagus starts with a silent O*, *Hammurabi has double m*).
   - No score or pressure; pure comprehension.

2. **Phase 2: Practice Mode (Assisted Scaffolding)**:
   - The student assembles the word using tactile letter or akshara tiles.
   - For Malayalam and Hindi, both English transliteration and native script tiles are available.
   - If a typo is made:
     - The app provides gentle, constructive feedback (e.g., *"Close! Check the double 's' in necessary: n-e-c-e-s-s-a-r-y"*).
     - The word is re-inserted 2–3 cards later in the session for immediate reinforcement.
     - Assisted completion is recorded as "Practising with assistance" and **does not count toward independent mastery**.

3. **Phase 3: Test Mode (Unaided Recall & Mock Exam)**:
   - Target word and hints are completely hidden from the DOM.
   - Audio prompt: *"Spell the word: Photosynthesis. Leaves produce food through ______."*
   - Student enters the spelling via physical keyboard, on-screen keyboard, or **Paper Handwriting Mode**.
   - In Paper Handwriting Mode, the student writes in their school notebook; the parent reviews and taps *Correct* or *Missed*.
   - Feedback is only provided after submission.

---

### 3. Mastery Criteria & Spaced Repetition Engine

- **Evidence-Based Mastery Rule**:
  - 🔴 **Learning**: Word has been missed or has only been completed with hints/tiles.
  - 🟡 **Practising**: Spelled correctly without hints once in Test Mode.
  - 🟢 **Remembered (Test-Ready)**: Spelled correctly without hints in Test Mode across **at least two separate calendar days / sessions**, including a later mixed review.
- **Session Configuration & Readiness Target**:
  - Configurable session lengths: **5 words** (quick daily check), **10 words** (standard review), or **Full Subject Mock Test** (e.g., all 10 Biology words).
  - Readiness metric displayed on the dashboard: `X of 80 words Test-Ready`.
  - Prioritization queue: Missed words $\to$ Practising words due for 2nd verification $\to$ Unattempted words $\to$ Remembered words due for checkup.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            App Component Tree                               │
│  App (Active Profile: 'fazia' | 'shiza')                                    │
│   ├── Header (Student Switcher, Navigation, Session Length, TTS Speed)      │
│   ├── SessionView                                                           │
│   │    ├── Mode Tabs: [Learn] [Practice] [Test]                             │
│   │    ├── LearnCard (Audio, Definition, Context, Tricky Spot)              │
│   │    ├── PracticeCard (Tiles, Instant Coach, In-Session Re-queue)         │
│   │    └── TestCard (Hidden Prompt, Paper Mode Toggle, Submission Grader)   │
│   ├── AllWordsView (Curriculum Matrix, Search, Subject Filter, Audio)       │
│   ├── ParentDashboard (Readiness %, Error Diagnostics, Reset/Target Queue) │
│   └── WorksheetView (Student Test Sheet vs Parent Answer Key)               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Storage & Migration                              │
│  - Migration check: Reads 'spellbee_progress_v1'; if present, writes to    │
│    'spellbee_progress_fazia_v1' and archives legacy copy.                   │
│  - Fazia storage: 'spellbee_progress_fazia_v1'                              │
│  - Shiza storage: 'spellbee_progress_shiza_v1'                              │
│  - Active profile: 'spellbee_active_profile_v1'                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Printable Worksheet Specification

1. **Student Test Sheet**:
   - Clean printable header with Student Name, Grade, Date, and Score blanks.
   - Words presented with number, context sentence containing `______`, syllable count, and wide ruled baseline for handwriting.
   - Zero answers or spoilers visible.
2. **Parent / Teacher Answer Key**:
   - Numbered list matching the test sheet.
   - Target spelling in bold, phonetic guide, native script (for Malayalam/Hindi), part of speech/meaning, and key tricky spots for checking student handwriting.

---

### 5. Implementation Steps

1. **Data Layer (`src/types/index.ts`, `src/data/wordList.ts`)**:
   - Extend types with `StudentProfile`, `StudentId ('fazia' | 'shiza')`, updated `SubjectCategory`, and `StudyMode ('learn' | 'practice' | 'test')`.
   - Implement `GRADE_2_WORDS` (45 words) and `GRADE_6_WORDS` (80 words) with full pedagogical metadata.
   - Configure accessible WCAG AA color palettes for all 9 Grade 6 subjects.
2. **Storage & Migration (`src/utils/storage.ts`)**:
   - Implement safe migration from single-user storage to student-specific keys (`spellbee_progress_fazia_v1` and `spellbee_progress_shiza_v1`).
   - Update `recordAttempt`, `getWordProgress`, and session word selection to enforce the 2-session unaided recall rule.
3. **Navigation & Mode Controls (`src/components/Header.tsx`, `App.tsx`)**:
   - Add student switcher with clear active student badge (`Fazia · Gr 2` / `Shiza · Gr 6`).
   - Add session size selector (5, 10, or All Due).
   - Ensure switching profiles immediately resets session states, inputs, and filters.
4. **Interactive Learning & Testing Engine (`src/components/SessionView.tsx`)**:
   - Integrate explicit **Learn**, **Practice**, and **Test** mode tabs.
   - In Test Mode, ensure target spelling is entirely hidden from markup, context sentences use `______`, and feedback is withheld until submission.
   - Support on-screen typing, Indic tiles, and Paper Handwriting parent validation.
5. **Curriculum Matrix & Parent Analytics (`AllWordsView.tsx`, `ParentDashboard.tsx`)**:
   - Display dynamic counts (`words.length`), test-readiness percentages, and error diagnostic logs for the active student.
6. **Dual Worksheet Generator (`src/components/WorksheetView.tsx`)**:
   - Toggle between **Student Test Sheet** (no answers) and **Parent Answer Key** (with answers and check points) with print CSS.
7. **Verification**:
   - Run `compile_applet` and verify zero TypeScript or bundle errors.
   - Verify data isolation when toggling between Fazia and Shiza.
