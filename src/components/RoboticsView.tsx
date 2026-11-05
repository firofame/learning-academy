import React from 'react';
import type { StudentId } from '../types';
import type { AppSettings } from '../utils/appStorage';
import { SubjectRevisionView } from './SubjectRevisionView';

interface RoboticsViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
  onSessionSizeChange: (size: number) => void;
  gradingApiUrl?: string;
}

export const RoboticsView: React.FC<RoboticsViewProps> = props => (
  <SubjectRevisionView {...props} subjectId="robotics" />
);
