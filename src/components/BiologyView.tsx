import React from 'react';
import type { StudentId } from '../types';
import type { AppSettings } from '../utils/appStorage';
import { SubjectRevisionView } from './SubjectRevisionView';

interface BiologyViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
  onSessionSizeChange: (size: number) => void;
  gradingApiUrl?: string;
}

export const BiologyView: React.FC<BiologyViewProps> = props => (
  <SubjectRevisionView {...props} subjectId="biology" />
);
