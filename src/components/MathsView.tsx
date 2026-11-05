import React from 'react';
import type { StudentId } from '../types';
import type { AppSettings } from '../utils/appStorage';
import { SubjectRevisionView } from './SubjectRevisionView';

interface MathsViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
  onSessionSizeChange: (size: number) => void;
}

export const MathsView: React.FC<MathsViewProps> = props => (
  <SubjectRevisionView {...props} subjectId="maths" />
);
