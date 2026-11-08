import React from 'react';
import type { ActiveAppView, StudentId } from '../types';
import { SubjectHome } from './SubjectHome';

export interface ProgressDashboardProps {
  activeStudent: StudentId;
  onResetComplete?: () => void;
  onNavigate?: (view: ActiveAppView) => void;
}

export type ParentDashboardProps = ProgressDashboardProps;

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ activeStudent, onNavigate }) => {
  return <SubjectHome activeStudent={activeStudent} onNavigate={onNavigate ?? (() => {})} />;
};

export const ParentDashboard = ProgressDashboard;
export default ProgressDashboard;
