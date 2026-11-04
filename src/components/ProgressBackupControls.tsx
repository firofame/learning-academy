import React, { useRef, useState } from 'react';
import type { StudentId } from '../types';
import { exportLearnerBackup, importLearnerBackup } from '../learning/persistence';

interface ProgressBackupControlsProps {
  learnerId: StudentId;
  learnerName: string;
  onRestored: () => void;
}

export const ProgressBackupControls: React.FC<ProgressBackupControlsProps> = ({ learnerId, learnerName, onRestored }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const downloadBackup = async () => {
    setBusy(true);
    setStatus('');
    setError('');
    try {
      const backup = await exportLearnerBackup(learnerId);
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `learning-academy-${learnerId}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus(`Backup downloaded for ${learnerName}. Keep the file somewhere safe.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The backup could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const restoreBackup = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setStatus('');
    setError('');
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('This backup is larger than 5 MB. No progress was changed.');
      const imported = await importLearnerBackup(JSON.parse(await file.text()), learnerId);
      setStatus(`Restored ${imported.imported} saved progress record(s). ${imported.skippedExisting} existing record(s) were kept.`);
      if (imported.imported > 0) onRestored();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The backup could not be restored.');
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 space-y-3" aria-label={`${learnerName} progress backup`}>
      <div>
        <h2 className="font-bold text-slate-900">Back up {learnerName}’s progress</h2>
        <p className="mt-1 text-sm text-slate-600">
          Download a copy before changing browser or device. Restore fills empty progress records and keeps anything already saved here.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={downloadBackup}
          className="min-h-12 rounded-xl bg-sky-800 px-4 py-3 font-semibold text-white hover:bg-sky-900 disabled:opacity-60"
        >
          Download backup
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="min-h-12 rounded-xl border border-sky-800 bg-white px-4 py-3 font-semibold text-sky-900 hover:bg-sky-100 disabled:opacity-60"
        >
          Restore backup
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          aria-label={`Choose ${learnerName} progress backup`}
          className="sr-only"
          onChange={event => void restoreBackup(event.currentTarget.files?.[0])}
        />
      </div>
      {busy && <p role="status" className="text-sm text-slate-600">Working with the backup…</p>}
      {status && <p role="status" className="text-sm text-emerald-800">{status}</p>}
      {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
    </section>
  );
};
