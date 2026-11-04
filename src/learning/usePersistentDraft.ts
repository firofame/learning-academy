import { useCallback, useEffect, useState } from 'react';
import type { LearningSubjectId, StudentId } from '../types';
import { CONTENT_VERSIONS, RUBRIC_VERSIONS } from '../data/contentVersions';
import { emitStorageError } from '../utils/appStorage';
import {
  deleteSessionDraft, getDefaultLearningRepository, loadSessionDraft,
  saveSessionDraft, type SessionDraftRecord
} from './persistence';

interface PersistentDraftOptions {
  learnerId: StudentId;
  subjectId: LearningSubjectId;
  lessonId: string;
}

export function usePersistentDraft<T>({ learnerId, subjectId, lessonId }: PersistentDraftOptions) {
  const [restoredDraft, setRestoredDraft] = useState<SessionDraftRecord<T> | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);

  useEffect(() => {
    if (typeof indexedDB === 'undefined') {
      setLoadingDraft(false);
      return;
    }
    let active = true;
    void loadSessionDraft<T>(
      getDefaultLearningRepository(), learnerId, subjectId, lessonId, CONTENT_VERSIONS[subjectId]
    ).then(draft => {
      if (active) setRestoredDraft(draft);
    }).catch(() => {
      if (active) emitStorageError(`Unable to read the saved ${subjectId} session. Your completed results are unchanged.`);
    }).finally(() => {
      if (active) setLoadingDraft(false);
    });
    return () => { active = false; };
  }, [learnerId, subjectId, lessonId]);

  const saveDraft = useCallback((sessionId: string, state: T) => {
    if (typeof indexedDB === 'undefined') return;
    const draft: SessionDraftRecord<T> = {
      sessionId, learnerId, subjectId, lessonId,
      contentVersion: CONTENT_VERSIONS[subjectId],
      rubricVersion: RUBRIC_VERSIONS[subjectId],
      savedAt: new Date().toISOString(), state
    };
    void saveSessionDraft(getDefaultLearningRepository(), draft).catch(() => {
      emitStorageError(`Unable to save the ${subjectId} session draft. Keep this session open and try again.`);
    });
  }, [learnerId, subjectId, lessonId]);

  const discardDraft = useCallback(async (sessionId: string) => {
    if (typeof indexedDB !== 'undefined') {
      await deleteSessionDraft(getDefaultLearningRepository(), learnerId, subjectId, sessionId);
    }
    setRestoredDraft(null);
  }, [learnerId, subjectId]);

  const forgetRestoredDraft = useCallback(() => setRestoredDraft(null), []);

  return { restoredDraft, loadingDraft, saveDraft, discardDraft, forgetRestoredDraft };
}
