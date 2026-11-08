import React from 'react';
import type { ActiveAppView, StudentId } from '../types';
import { SubjectHome } from './SubjectHome';

export interface ExamTimetableViewProps {
  activeStudent: StudentId;
  onNavigate?: (view: ActiveAppView) => void;
  onSwitchStudent?: (studentId: StudentId) => void;
}

export const ExamTimetableView: React.FC<ExamTimetableViewProps> = ({ activeStudent, onNavigate }) => {
  return (
    <SubjectHome
      activeStudent={activeStudent}
      onNavigate={onNavigate ?? (() => {})}
      initialShowTimetable={true}
    />
  );
};

export default ExamTimetableView;
