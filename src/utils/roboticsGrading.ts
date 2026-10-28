export const ROBOTICS_GRADING_MODEL = 'gemini-3.5-flash-lite';
export const MAX_WRITTEN_ANSWER_LENGTH = 1200;

export interface WrittenGrade {
  correct: boolean;
  feedback: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isWrittenGrade(value: unknown): value is WrittenGrade {
  return isRecord(value) && typeof value.correct === 'boolean' &&
    typeof value.feedback === 'string' && value.feedback.trim().length > 0 &&
    value.feedback.length <= 300;
}

export async function gradeRoboticsAnswer(
  apiUrl: string, lessonId: string, questionId: string,
  answer: string, signal: AbortSignal
): Promise<WrittenGrade> {
  let url: URL;
  try { url = new URL(apiUrl); }
  catch { throw new Error('Automatic checking has an invalid grading API URL. Ask the site owner to fix its configuration.'); }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' &&
      ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('Automatic checking requires a secure grading API URL.');
  }
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, questionId, answer }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(55_000)])
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Could not reach automatic checking. Your answer is unchanged. Please retry.');
  }
  if (!response.ok) {
    if (response.status === 429) throw new Error('Checking is busy. Wait a minute and retry. Your answer has not been marked.');
    throw new Error('Automatic checking is unavailable. Your answer has not been marked. Please retry.');
  }
  let grade: unknown;
  try {
    grade = await response.json();
  } catch {
    throw new Error('Automatic checking returned an unreadable result. Please retry; your answer has not been marked.');
  }
  if (!isWrittenGrade(grade)) {
    throw new Error('Automatic checking returned an incomplete result. Please retry; your answer has not been marked.');
  }
  return grade;
}
