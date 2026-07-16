'use client';

import { useState } from 'react';
import { useNotes } from '@/lib/hooks/useNotes';

export default function NotesPage() {
  const { grouped, loading, addNote, deleteNote } = useNotes();
  const [content, setContent] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await addNote(content.trim());
    setContent('');
  };

  if (loading) return <p className="text-neutral-500">Loading...</p>;

  const dates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write today's note..."
          rows={2}
          className="flex-1 px-3 py-2 rounded bg-neutral-900 border border-neutral-800 outline-none focus:border-neutral-600 resize-none"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-white text-black text-sm font-medium self-start"
        >
          Add
        </button>
      </form>

      <div className="space-y-5">
        {dates.map((date) => (
          <div key={date}>
            <h2 className="text-sm font-medium text-neutral-400 mb-2">
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </h2>
            <div className="space-y-2">
              {grouped[date].map((note) => (
                <div
                  key={note.id}
                  className="bg-neutral-900 border border-neutral-800 rounded p-3 flex justify-between gap-2"
                >
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-xs text-red-400 hover:text-red-300 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {dates.length === 0 && (
          <p className="text-sm text-neutral-600">No notes yet.</p>
        )}
      </div>
    </div>
  );
}
