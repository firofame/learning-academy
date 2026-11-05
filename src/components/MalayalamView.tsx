import React from 'react';
import type { StudentId } from '../types';
import type { AppSettings } from '../utils/appStorage';
import { SubjectRevisionView } from './SubjectRevisionView';

interface MalayalamViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
  onSessionSizeChange: (size: number) => void;
  gradingApiUrl?: string;
}

export const MalayalamView: React.FC<MalayalamViewProps> = props => (
  <SubjectRevisionView {...props} subjectId="malayalam" />
);
