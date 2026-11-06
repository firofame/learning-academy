import React from 'react';
import type { StudentId } from '../types';
import type { AppSettings } from '../utils/appStorage';
import { SubjectRevisionView } from './SubjectRevisionView';

interface EvsViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
  onSessionSizeChange: (size: number) => void;
  gradingApiUrl?: string;
}

export const EvsView: React.FC<EvsViewProps> = props => (
  <SubjectRevisionView {...props} subjectId="evs" />
);
