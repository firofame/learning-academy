import React, { useMemo } from 'react';
import type { LearningSubjectId, StudentId } from '../types';
import type { AppSettings } from '../utils/appStorage';
import { buildSubjectRevision } from '../learning/subjectRevision';
import { ExamRevisionView } from './ExamRevisionView';

interface SubjectRevisionViewProps {
  activeStudent: StudentId;
  subjectId: LearningSubjectId;
  settings: AppSettings;
  onSessionSizeChange: (size: number) => void;
  gradingApiUrl?: string;
  onExamActiveChange?: (active: boolean) => void;
}

export const SubjectRevisionView: React.FC<SubjectRevisionViewProps> = ({
  activeStudent, subjectId, settings, onSessionSizeChange, gradingApiUrl, onExamActiveChange
}) => {
  const definition = useMemo(
    () => buildSubjectRevision(subjectId, activeStudent, gradingApiUrl),
    [activeStudent, gradingApiUrl, subjectId]
  );
  return (
    <ExamRevisionView
      {...definition}
      learnerId={activeStudent}
      subjectId={subjectId}
      sessionSize={settings.sessionSize}
      onSessionSizeChange={onSessionSizeChange}
      speechAudio={subjectId === 'spell-bee' && settings.speechAudio}
      onExamActiveChange={onExamActiveChange}
    />
  );
};
