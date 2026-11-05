import React from 'react';
import type { StudentId } from '../types';
import type { AppSettings } from '../utils/appStorage';
import { SubjectRevisionView } from './SubjectRevisionView';

interface HindiViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
  onSessionSizeChange: (size: number) => void;
  gradingApiUrl?: string;
}

export const HindiView: React.FC<HindiViewProps> = props => (
  <SubjectRevisionView {...props} subjectId="hindi" />
);
