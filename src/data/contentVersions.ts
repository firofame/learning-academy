import type { LearningSubjectId } from '../types';

/** Increment these identifiers whenever the learner-visible prompts, keys, or grading rubric change. */
export const CONTENT_VERSIONS: Record<LearningSubjectId, string> = {
  'spell-bee': 'spell-bee-v1',
  robotics: 'robotics-v1',
  maths: 'maths-v1',
  malayalam: 'malayalam-v1',
  hindi: 'hindi-v1'
};

export const RUBRIC_VERSIONS: Record<LearningSubjectId, string> = {
  'spell-bee': 'spelling-rubric-v1',
  robotics: 'robotics-rubric-v1',
  maths: 'maths-rubric-v1',
  malayalam: 'malayalam-rubric-v1',
  hindi: 'hindi-rubric-v1'
};
