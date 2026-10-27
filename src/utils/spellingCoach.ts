import { WordEntry, SpellingFeedback } from '../types';

/**
 * Normalizes input strings for flexible matching:
 * - Unicode Normalization Form C (NFC) for canonical equivalence
 * - Decomposed legacy Malayalam chillu combinations mapped to canonical atomic chillu characters
 * - Trim extra whitespace and lowercase
 */
export function normalizeSpelling(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFC')
    .replace(/\u0D23\u0D4D\u200D/g, '\u0D7A')
    .replace(/\u0D28\u0D4D\u200D/g, '\u0D7B')
    .replace(/\u0D30\u0D4D\u200D/g, '\u0D7C')
    .replace(/\u0D32\u0D4D\u200D/g, '\u0D7D')
    .replace(/\u0D33\u0D4D\u200D/g, '\u0D7E')
    .replace(/\u0D15\u0D4D\u200D/g, '\u0D7F')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Check if the input is correct, considering native script, transliteration, and legitimate regional variants.
 */
export function evaluateSpelling(entry: WordEntry, rawInput: string): SpellingFeedback {
  const input = normalizeSpelling(rawInput);
  const canonical = normalizeSpelling(entry.canonicalSpelling);
  const native = entry.nativeScript ? normalizeSpelling(entry.nativeScript) : '';
  const translit = entry.transliteration ? normalizeSpelling(entry.transliteration) : '';

  // Exact match on canonical, native script, transliteration, or legitimate regional variants.
  // Note: "cubiod" is NOT accepted for "cuboid". Regional variants like "esophagus" for "oesophagus" are accepted.
  const isMatch = 
    input === canonical || 
    (native !== '' && input === native) || 
    (translit !== '' && input === translit) ||
    (canonical === 'oesophagus' && input === 'esophagus');

  if (isMatch) {
    let successMessage = `Wonderful! That's the correct spelling: ${entry.word}`;
    if (canonical === 'oesophagus' && input === 'esophagus') {
      successMessage = `Accepted! In Indian and British school curricula, it starts with an "O" (oesophagus).`;
    }

    return {
      isCorrect: true,
      userInput: rawInput,
      targetWord: entry.canonicalSpelling,
      message: successMessage,
      coachingTip: entry.trickySpot
    };
  }

  // If incorrect, diagnose what happened gently
  const coaching = diagnoseMistake(entry, input);

  return {
    isCorrect: false,
    userInput: rawInput,
    targetWord: entry.canonicalSpelling,
    message: coaching.message,
    coachingTip: coaching.tip,
    highlightedDiff: coaching.diff
  };
}

interface Diagnosis {
  message: string;
  tip: string;
  diff?: {
    expected: string;
    actual: string;
    errorType: 'missing' | 'extra' | 'swapped' | 'vowel' | 'typo';
  };
}

function diagnoseMistake(entry: WordEntry, actual: string): Diagnosis {
  const expected = normalizeSpelling(entry.canonicalSpelling);

  // If empty
  if (!actual) {
    return {
      message: "Take your time! Let's listen to the word again.",
      tip: entry.trickySpot,
      diff: { expected, actual: '', errorType: 'missing' }
    };
  }

  // Specific Grade 6 common slips
  if (expected === 'asterisk' && actual === 'asterix') {
    return {
      message: '"Asterisk" ends with "-isk"! (Asterix with an "x" is the famous comic Gaul).',
      tip: entry.trickySpot,
      diff: { expected, actual, errorType: 'typo' }
    };
  }

  if (expected === 'necessary' && (actual === 'neccessary' || actual === 'necesary')) {
    return {
      message: 'Remember the shirt mnemonic: 1 Collar (one C) and 2 Sleeves (double S): n-e-c-e-s-s-a-r-y.',
      tip: entry.trickySpot,
      diff: { expected, actual, errorType: 'typo' }
    };
  }

  if (expected === 'mnemonic' && actual === 'nemonic') {
    return {
      message: 'Don\'t forget the silent initial "M": m-n-e-m-o-n-i-c.',
      tip: entry.trickySpot,
      diff: { expected, actual, errorType: 'missing' }
    };
  }

  if (expected === 'aligning' && actual === 'alining') {
    return {
      message: 'Remember the silent "g" in "align": a-l-i-g-n-i-n-g.',
      tip: entry.trickySpot,
      diff: { expected, actual, errorType: 'missing' }
    };
  }

  // 1. Check for swapped adjacent letters
  if (isSwappedPair(expected, actual)) {
    return {
      message: "Good try! Two letters swapped places here.",
      tip: `Look closely at the letter order: ${entry.trickySpot}`,
      diff: { expected, actual, errorType: 'swapped' }
    };
  }

  // 2. Missing letter
  if (actual.length === expected.length - 1 && isSubstringSubsequence(actual, expected)) {
    return {
      message: "Very close! You are just missing one letter.",
      tip: `Check every sound: ${entry.trickySpot}`,
      diff: { expected, actual, errorType: 'missing' }
    };
  }

  // 3. Extra letter
  if (actual.length === expected.length + 1 && isSubstringSubsequence(expected, actual)) {
    return {
      message: "Almost! There is an extra letter in there.",
      tip: entry.trickySpot,
      diff: { expected, actual, errorType: 'extra' }
    };
  }

  // 4. Common phonetic substitutions
  if (isPhoneticSubstitute(expected, actual)) {
    return {
      message: "You spelled it just like it sounds! English spelling has a tricky rule here.",
      tip: entry.trickySpot,
      diff: { expected, actual, errorType: 'vowel' }
    };
  }

  // General compassionate response
  return {
    message: "Good try! Let's take a look at the tricky part together.",
    tip: entry.trickySpot,
    diff: { expected, actual, errorType: 'typo' }
  };
}

function isSwappedPair(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diffs: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs.push(i);
  }
  return diffs.length === 2 && diffs[1] === diffs[0] + 1 && a[diffs[0]] === b[diffs[1]] && a[diffs[1]] === b[diffs[0]];
}

function isSubstringSubsequence(shorter: string, longer: string): boolean {
  let i = 0;
  let j = 0;
  while (i < shorter.length && j < longer.length) {
    if (shorter[i] === longer[j]) i++;
    j++;
  }
  return i === shorter.length;
}

function isPhoneticSubstitute(expected: string, actual: string): boolean {
  const pairs = [
    ['machine', 'masheen'],
    ['bicycle', 'bycicle'],
    ['clothes', 'cloths'],
    ['stalk', 'stok'],
    ['square', 'skware'],
    ['clever', 'klever'],
    ['feast', 'feest'],
    ['treasure', 'treshur'],
    ['venation', 'venashun'],
    ['pollination', 'polinashun'],
    ['nutrition', 'nutrishun'],
    ['fertilization', 'fertilizashun']
  ];
  return pairs.some(([exp, act]) => expected === exp && actual === act);
}
