import React from 'react';
import type { StudentId } from '../types';
import type { AppSettings } from '../utils/appStorage';
import { SubjectRevisionView } from './SubjectRevisionView';

interface SessionViewProps {
  settings: AppSettings;
  activeStudent: StudentId;
  onSessionSizeChange: (size: number) => void;
}

export const SessionView: React.FC<SessionViewProps> = props => (
  <SubjectRevisionView {...props} subjectId="spell-bee" />
);
