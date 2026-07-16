'use client';

import { useState } from 'react';
import { useTasks, type Task } from '@/lib/hooks/useTasks';

export default function DailyTasksPage() {
  const { tasks, loading, addTask, toggleStatus, deleteTask } = useTasks();
  const [title, setTitle] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const pending = tasks.filter((t) => t.status === 'pending');
  const complete = tasks.filter((t) => t.status === 'complete');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addTask(title.trim(), isRecurring);
    setTitle('');
    setIsRecurring(false);
  };

  if (loading) return <p className="text-neutral-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex gap-2 flex-wrap">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded bg-neutral-900 border border-neutral-800 outline-none focus:border-neutral-600"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-400 px-2">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          Recurring
        </label>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-white text-black text-sm font-medium"
        >
          Add
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Column title="Pending" tasks={pending} onToggle={toggleStatus} onDelete={deleteTask} />
        <Column title="Complete" tasks={complete} onToggle={toggleStatus} onDelete={deleteTask} />
      </div>
    </div>
  );
}

function Column({
  title,
  tasks,
  onToggle,
  onDelete,
}: {
  title: string;
  tasks: Task[];
  onToggle: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <h2 className="text-sm font-medium text-neutral-400 mb-3">
        {title} ({tasks.length})
      </h2>
      <div className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="bg-neutral-800 rounded p-3 flex items-start justify-between gap-2"
          >
            <div>
              <p className="text-sm">{task.title}</p>
              {task.is_recurring && (
                <span className="text-xs text-amber-400">🔁 recurring</span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => onToggle(task)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                {task.status === 'pending' ? '→ Complete' : '← Pending'}
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-neutral-600">Nothing here.</p>
        )}
      </div>
    </div>
  );
}
