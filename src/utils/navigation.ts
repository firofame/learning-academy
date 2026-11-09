import type { ActiveAppView, LearningSubjectId, StudentId } from '../types';
import { getStudentProfile, STUDENT_PROFILES } from '../data/profiles';
import { getSubjectForView, isSubjectAvailableForGrade } from '../data/subjects';

export interface ParsedRoute {
  studentId: StudentId | null;
  view: ActiveAppView | null;
}

export interface InitialRouteResolution {
  studentId: StudentId;
  view: ActiveAppView;
  invalidSubjectNotice?: string;
  isExplicitUrl: boolean;
}

const VALID_VIEWS: ReadonlySet<ActiveAppView> = new Set([
  'home',
  'spell-bee',
  'robotics',
  'maths',
  'malayalam',
  'hindi',
  'evs',
  'biology',
  'chemistry',
  'english',
  'timetable',
  'progress'
]);

function getBasePrefix(): string {
  try {
    const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/';
    if (!base || base === '/') return '';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  } catch {
    return '';
  }
}

export function normalizeViewSlug(rawSlug: string): ActiveAppView | null {
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) return null;

  if (slug === 'session' || slug === 'spelling' || slug === 'spellbee') {
    return 'spell-bee';
  }
  if (slug === 'progress' || slug === 'parent') {
    return 'home';
  }
  if (VALID_VIEWS.has(slug as ActiveAppView)) {
    return (slug as ActiveAppView) === 'progress' ? 'home' : (slug as ActiveAppView);
  }
  return null;
}

export function findStudentBySlug(slug: string): StudentId | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  const match = STUDENT_PROFILES.find(
    p => p.id.toLowerCase() === normalized || p.name.toLowerCase() === normalized
  );
  return match ? match.id : null;
}

export function parseRoute(pathname: string, hash = ''): ParsedRoute {
  let path = pathname || '/';

  // Support hash routing fallback (e.g. #/shiza/maths or #shiza/maths)
  if ((path === '/' || path === '') && hash) {
    const cleanHash = hash.replace(/^#\/?/, '/');
    if (cleanHash && cleanHash !== '/') {
      path = cleanHash;
    }
  }

  // Strip base prefix if running under a subpath (e.g. /learning-academy)
  const basePrefix = getBasePrefix();
  if (basePrefix && path.startsWith(basePrefix)) {
    path = path.slice(basePrefix.length) || '/';
  }

  const segments = path
    .split('/')
    .filter(Boolean)
    .map(seg => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    });

  if (segments.length === 0) {
    return { studentId: null, view: null };
  }

  // Check if first segment is a known student (e.g. /shiza/maths or /fazia)
  const candidateStudent = findStudentBySlug(segments[0]);
  if (candidateStudent) {
    if (segments.length >= 2) {
      const parsedView = normalizeViewSlug(segments[1]);
      return {
        studentId: candidateStudent,
        view: parsedView ?? 'home'
      };
    }
    return {
      studentId: candidateStudent,
      view: 'home'
    };
  }

  // Check if first segment directly represents a view without student prefix (e.g. /maths or /timetable)
  const directView = normalizeViewSlug(segments[0]);
  if (directView) {
    return {
      studentId: null,
      view: directView
    };
  }

  return { studentId: null, view: null };
}

export function buildRouteUrl(studentId: StudentId, view: ActiveAppView): string {
  const base = getBasePrefix();
  const normalizedView: ActiveAppView =
    (view as string) === 'session'
      ? 'spell-bee'
      : (view as string) === 'progress' || (view as string) === 'parent'
      ? 'home'
      : view;

  return `${base}/${studentId}/${normalizedView}`;
}

export function resolveInitialRoute(
  defaultStudent: StudentId,
  pathname = typeof window !== 'undefined' ? window.location.pathname : '/',
  hash = typeof window !== 'undefined' ? window.location.hash : ''
): InitialRouteResolution {
  const parsed = parseRoute(pathname, hash);
  const studentId = parsed.studentId ?? defaultStudent;
  const profile = getStudentProfile(studentId);
  const candidateView = parsed.view ?? 'home';

  const subject = getSubjectForView(candidateView);
  if (subject && !isSubjectAvailableForGrade(subject.id as LearningSubjectId, profile.grade)) {
    return {
      studentId,
      view: 'home',
      invalidSubjectNotice: `${subject.name} is not available for ${profile.gradeLabel}. Please choose another subject.`,
      isExplicitUrl: Boolean(parsed.studentId || parsed.view)
    };
  }

  return {
    studentId,
    view: candidateView,
    isExplicitUrl: Boolean(parsed.studentId || parsed.view)
  };
}

export function updateRoute(studentId: StudentId, view: ActiveAppView, replace = false): void {
  if (typeof window === 'undefined' || !window.history) return;
  const targetUrl = buildRouteUrl(studentId, view);
  const currentPath = window.location.pathname;
  if (currentPath === targetUrl) return;

  try {
    if (replace) {
      window.history.replaceState({ studentId, view }, '', targetUrl);
    } else {
      window.history.pushState({ studentId, view }, '', targetUrl);
    }
  } catch {
    // Non-fatal if browser environment restricts history API
  }
}

export function updateDocumentTitle(studentId: StudentId, view: ActiveAppView): void {
  if (typeof document === 'undefined') return;
  try {
    const profile = getStudentProfile(studentId);
    if (view === 'home') {
      document.title = `${profile.name} (${profile.gradeLabel}) · Learning Academy`;
      return;
    }
    if (view === 'timetable') {
      document.title = `Exam Timetable · ${profile.name} | Learning Academy`;
      return;
    }
    const subject = getSubjectForView(view);
    if (subject) {
      document.title = `${subject.name} · ${profile.name} | Learning Academy`;
      return;
    }
    document.title = 'Learning Academy';
  } catch {
    // Non-fatal
  }
}
