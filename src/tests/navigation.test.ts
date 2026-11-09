import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseRoute,
  buildRouteUrl,
  resolveInitialRoute,
  normalizeViewSlug,
  findStudentBySlug
} from '../utils/navigation';

describe('URL Navigation & Route Resolution', () => {
  describe('normalizeViewSlug', () => {
    test('normalizes standard views correctly', () => {
      assert.equal(normalizeViewSlug('home'), 'home');
      assert.equal(normalizeViewSlug('maths'), 'maths');
      assert.equal(normalizeViewSlug('spell-bee'), 'spell-bee');
      assert.equal(normalizeViewSlug('timetable'), 'timetable');
      assert.equal(normalizeViewSlug('evs'), 'evs');
      assert.equal(normalizeViewSlug('biology'), 'biology');
      assert.equal(normalizeViewSlug('chemistry'), 'chemistry');
      assert.equal(normalizeViewSlug('english'), 'english');
    });

    test('normalizes aliases to canonical views', () => {
      assert.equal(normalizeViewSlug('session'), 'spell-bee');
      assert.equal(normalizeViewSlug('spellbee'), 'spell-bee');
      assert.equal(normalizeViewSlug('spelling'), 'spell-bee');
      assert.equal(normalizeViewSlug('progress'), 'home');
      assert.equal(normalizeViewSlug('parent'), 'home');
    });

    test('handles case-insensitivity and whitespace', () => {
      assert.equal(normalizeViewSlug(' MATHS '), 'maths');
      assert.equal(normalizeViewSlug('Spell-Bee'), 'spell-bee');
      assert.equal(normalizeViewSlug('TIMETABLE'), 'timetable');
    });

    test('returns null for unknown views', () => {
      assert.equal(normalizeViewSlug('unknown'), null);
      assert.equal(normalizeViewSlug(''), null);
      assert.equal(normalizeViewSlug('   '), null);
    });
  });

  describe('findStudentBySlug', () => {
    test('matches student by ID and Name case-insensitively', () => {
      assert.equal(findStudentBySlug('shiza'), 'shiza');
      assert.equal(findStudentBySlug('Shiza'), 'shiza');
      assert.equal(findStudentBySlug('SHIZA'), 'shiza');
      assert.equal(findStudentBySlug('fazia'), 'fazia');
      assert.equal(findStudentBySlug('Fazia'), 'fazia');
    });

    test('returns null for unknown student', () => {
      assert.equal(findStudentBySlug('john'), null);
      assert.equal(findStudentBySlug(''), null);
    });
  });

  describe('parseRoute', () => {
    test('parses root / as null student and null view', () => {
      const parsed = parseRoute('/');
      assert.deepEqual(parsed, { studentId: null, view: null });
    });

    test('parses /:student as student with home view', () => {
      assert.deepEqual(parseRoute('/shiza'), { studentId: 'shiza', view: 'home' });
      assert.deepEqual(parseRoute('/fazia'), { studentId: 'fazia', view: 'home' });
      assert.deepEqual(parseRoute('/Fazia/'), { studentId: 'fazia', view: 'home' });
    });

    test('parses /:student/:view correctly', () => {
      assert.deepEqual(parseRoute('/shiza/maths'), { studentId: 'shiza', view: 'maths' });
      assert.deepEqual(parseRoute('/fazia/evs'), { studentId: 'fazia', view: 'evs' });
      assert.deepEqual(parseRoute('/shiza/spell-bee'), { studentId: 'shiza', view: 'spell-bee' });
      assert.deepEqual(parseRoute('/shiza/timetable'), { studentId: 'shiza', view: 'timetable' });
      assert.deepEqual(parseRoute('/shiza/home'), { studentId: 'shiza', view: 'home' });
    });

    test('parses views with aliases and case-insensitivity', () => {
      assert.deepEqual(parseRoute('/Shiza/Maths'), { studentId: 'shiza', view: 'maths' });
      assert.deepEqual(parseRoute('/fazia/session'), { studentId: 'fazia', view: 'spell-bee' });
      assert.deepEqual(parseRoute('/shiza/progress'), { studentId: 'shiza', view: 'home' });
    });

    test('falls back to home for unknown view slug under valid student', () => {
      assert.deepEqual(parseRoute('/shiza/unsupported-page'), { studentId: 'shiza', view: 'home' });
    });

    test('supports direct view without student prefix (e.g. /maths)', () => {
      assert.deepEqual(parseRoute('/maths'), { studentId: null, view: 'maths' });
      assert.deepEqual(parseRoute('/timetable'), { studentId: null, view: 'timetable' });
    });

    test('supports hash fallback (e.g. #/shiza/maths)', () => {
      assert.deepEqual(parseRoute('/', '#/shiza/maths'), { studentId: 'shiza', view: 'maths' });
      assert.deepEqual(parseRoute('', '#fazia/evs'), { studentId: 'fazia', view: 'evs' });
    });
  });

  describe('buildRouteUrl', () => {
    test('builds canonical route paths', () => {
      assert.equal(buildRouteUrl('shiza', 'home'), '/shiza/home');
      assert.equal(buildRouteUrl('shiza', 'maths'), '/shiza/maths');
      assert.equal(buildRouteUrl('fazia', 'evs'), '/fazia/evs');
      assert.equal(buildRouteUrl('fazia', 'timetable'), '/fazia/timetable');
    });

    test('normalizes aliases in built URLs', () => {
      assert.equal(buildRouteUrl('shiza', 'progress'), '/shiza/home');
      assert.equal(buildRouteUrl('fazia', 'session' as any), '/fazia/spell-bee');
    });
  });

  describe('resolveInitialRoute', () => {
    test('resolves from URL when valid student and view are in pathname', () => {
      const res = resolveInitialRoute('shiza', '/fazia/maths');
      assert.equal(res.studentId, 'fazia');
      assert.equal(res.view, 'maths');
      assert.equal(res.invalidSubjectNotice, undefined);
      assert.equal(res.isExplicitUrl, true);
    });

    test('falls back to defaultStudent when student is omitted in URL', () => {
      const res = resolveInitialRoute('shiza', '/');
      assert.equal(res.studentId, 'shiza');
      assert.equal(res.view, 'home');
      assert.equal(res.isExplicitUrl, false);
    });

    test('detects unavailable subject for grade and falls back to home with notice', () => {
      // Fazia is Grade 2; Biology is Grade 6 only
      const res = resolveInitialRoute('shiza', '/fazia/biology');
      assert.equal(res.studentId, 'fazia');
      assert.equal(res.view, 'home');
      assert.ok(res.invalidSubjectNotice?.includes('Biology is not available for Grade 2'));
    });

    test('allows available subjects for Grade 6 (Shiza)', () => {
      const res = resolveInitialRoute('fazia', '/shiza/biology');
      assert.equal(res.studentId, 'shiza');
      assert.equal(res.view, 'biology');
      assert.equal(res.invalidSubjectNotice, undefined);
    });

    test('allows EVS for Grade 2 (Fazia) and blocks EVS for Grade 6 (Shiza)', () => {
      const resFazia = resolveInitialRoute('shiza', '/fazia/evs');
      assert.equal(resFazia.studentId, 'fazia');
      assert.equal(resFazia.view, 'evs');

      const resShiza = resolveInitialRoute('fazia', '/shiza/evs');
      assert.equal(resShiza.studentId, 'shiza');
      assert.equal(resShiza.view, 'home');
      assert.ok(resShiza.invalidSubjectNotice?.includes('EVS is not available for Grade 6'));
    });
  });
});
