'use client';

import { useState } from 'react';
import { useTaskLogs } from '@/lib/hooks/useTaskLogs';

export default function TaskDatePage() {
  const { logs, loading, addLog, toggleStatus, deleteLog } = useTaskLogs();
  const [type, setType] = useState('');
  const [note, setNote] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type.trim()) return;
    await addLog(type.trim(), note.trim(), logDate);
    setType('');
    setNote('');
  };

  if (loading) return <p className="text-neutral-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
        <input
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Type (e.g. bug, idea, meeting)"
          className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800 outline-none focus:border-neutral-600 w-40"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Short note"
          className="flex-1 min-w-[160px] px-3 py-2 rounded bg-neutral-900 border border-neutral-800 outline-none focus:border-neutral-600"
        />
        <input
          type="date"
          value={logDate}
          onChange={(e) => setLogDate(e.target.value)}
          className="px-3 py-2 rounded bg-neutral-900 border border-neutral-800 outline-none focus:border-neutral-600"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-white text-black text-sm font-medium"
        >
          Add
        </button>
      </form>

      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="text-left px-3 py-2">Type</th>
              <th className="text-left px-3 py-2">Note</th>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-neutral-800">
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded bg-neutral-800 text-xs">
                    {log.type}
                  </span>
                </td>
                <td className="px-3 py-2 text-neutral-300">{log.note}</td>
                <td className="px-3 py-2 text-neutral-500">{log.log_date}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => toggleStatus(log)}
                    className={`text-xs px-2 py-0.5 rounded ${
                      log.status === 'complete'
                        ? 'bg-green-950 text-green-400'
                        : 'bg-amber-950 text-amber-400'
                    }`}
                  >
                    {log.status}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="text-sm text-neutral-600 p-3">No entries yet.</p>
        )}
      </div>
    </div>
  );
}
