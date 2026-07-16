'use client';

import { useState } from 'react';
import { useTaskLogs } from '@/lib/hooks/useTaskLogs';
import { Plus, Trash2, Calendar, Search, Lightbulb, Bug, Users, Sparkles, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

const QUICK_TYPES = [
  { name: 'idea', label: 'Idea', icon: Lightbulb, color: 'text-amber-500 bg-[#15181D] border-[#242930]' },
  { name: 'bug', label: 'Bug', icon: Bug, color: 'text-red-500 bg-[#15181D] border-[#242930]' },
  { name: 'meeting', label: 'Meeting', icon: Users, color: 'text-purple-500 bg-[#15181D] border-[#242930]' },
  { name: 'task', label: 'Task', icon: CheckCircle2, color: 'text-blue-500 bg-[#15181D] border-[#242930]' },
];

export default function TaskDatePage() {
  const { logs, loading, addLog, toggleStatus, deleteLog } = useTaskLogs();
  const [type, setType] = useState('');
  const [note, setNote] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'complete'>('all');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'all'>('all');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type.trim()) return;
    await addLog(type.trim().toLowerCase(), note.trim(), logDate);
    setType('');
    setContent('');
  };

  const setContent = (val: string) => {
    setNote(val);
  };

  const getLogTypeColor = (typeName: string) => {
    switch (typeName.toLowerCase()) {
      case 'bug':
        return 'text-red-400 border-red-900/50 bg-red-950/20';
      case 'idea':
        return 'text-amber-400 border-amber-900/50 bg-amber-950/20';
      case 'meeting':
        return 'text-purple-400 border-purple-900/50 bg-purple-950/20';
      case 'task':
        return 'text-blue-400 border-blue-900/50 bg-blue-950/20';
      default:
        return 'text-zinc-400 border-[#242930] bg-[#15181D]';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] font-mono text-xs text-zinc-500">
        <span className="animate-pulse">&gt; loading_history...</span>
      </div>
    );
  }

  // Filtering logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.type.toLowerCase().includes(search.toLowerCase()) ||
      (log.note && log.note.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : log.status === statusFilter;

    // Time filter logic
    if (timeFilter === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (log.log_date !== todayStr) return false;
    } else if (timeFilter === 'week') {
      const logTime = new Date(log.log_date).getTime();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      if (logTime < weekAgo.getTime()) return false;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Dev Header section - Monospace */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#242930] gap-2 font-mono text-xs text-zinc-400">
        <div className="flex items-center gap-1">
          <span className="text-[#89295E] font-bold">&gt;</span>
          <span>activity_stream_logs:</span>
          <span className="text-zinc-200 ml-1">
            {logs.length} events_total
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
          stream_connected
        </div>
      </div>

      {/* Log creation form */}
      <div className="bg-[#15181D] border border-[#242930] rounded p-4 space-y-4">
        <h3 className="text-xs font-semibold text-zinc-300 font-mono">[new_stream_event]</h3>
        
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Type / Tag</label>
              <input
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. bug, idea, meeting"
                className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-[#242930] outline-none focus:border-zinc-700 text-xs text-zinc-200 placeholder:text-zinc-650"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-[#242930] outline-none focus:border-zinc-700 text-xs text-zinc-200"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full h-8 rounded bg-zinc-200 hover:bg-white text-black text-xs font-bold font-mono tracking-wide transition-all active:scale-[0.98]"
              >
                LOG_EVENT
              </button>
            </div>
          </div>

          <div className="space-y-1 font-mono text-xs">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Note / Description</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Provide event details..."
              className="w-full px-3 py-1.5 rounded bg-zinc-950 border border-[#242930] outline-none focus:border-zinc-700 text-xs text-zinc-200 placeholder:text-zinc-650"
            />
          </div>

          {/* Quick Select Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 font-mono">
            <span className="text-[10px] text-zinc-500 uppercase font-semibold">Quick Type:</span>
            {QUICK_TYPES.map((qt) => {
              const Icon = qt.icon;
              return (
                <button
                  type="button"
                  key={qt.name}
                  onClick={() => setType(qt.name)}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-[#242930] bg-[#15181D] text-zinc-300 hover:border-zinc-750 transition-colors"
                >
                  <Icon className="w-3 h-3 text-zinc-500" />
                  {qt.label}
                </button>
              );
            })}
          </div>
        </form>
      </div>

      {/* Filters and search panel - Monospace */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between pb-3 border-b border-[#242930] font-mono">
        <div className="flex flex-wrap gap-2">
          {/* Status filters */}
          <div className="flex bg-[#15181D] p-0.5 rounded border border-[#242930]">
            {(['all', 'pending', 'complete'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
                  statusFilter === filter
                    ? 'bg-[#89295E] text-white'
                    : 'text-zinc-500 hover:text-zinc-350'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Time filters */}
          <div className="flex bg-[#15181D] p-0.5 rounded border border-[#242930]">
            {(['today', 'week', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
                  timeFilter === filter
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-355'
                }`}
              >
                {filter === 'week' ? 'this week' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[200px] sm:w-56 font-mono">
          <Search className="w-3.5 h-3.5 text-zinc-655 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="filter_logs_by_query..."
            className="w-full pl-8 pr-3 py-1 rounded bg-[#15181D] border border-[#242930] outline-none focus:border-zinc-700 text-xs text-zinc-200 placeholder:text-zinc-650"
          />
        </div>
      </div>

      {/* Structured Vertical Timeline Feed */}
      <div className="relative pl-6 space-y-4">
        {/* The Track Line */}
        <div className="absolute left-2.5 top-2 bottom-2 w-[1px] bg-[#242930]" />

        {filteredLogs.map((log) => {
          const typeColor = getLogTypeColor(log.type);
          const isComplete = log.status === 'complete';

          return (
            <div key={log.id} className="relative group font-mono">
              {/* Timeline dot node */}
              <div 
                onClick={() => toggleStatus(log)}
                className={`absolute -left-[20.5px] top-2.5 w-2 h-2 rounded-full border cursor-pointer transition-all ${
                  isComplete 
                    ? 'bg-[#7FE7C4] border-[#7FE7C4] scale-110 shadow-sm shadow-[#7FE7C4]/20' 
                    : 'bg-zinc-950 border-zinc-700 hover:border-zinc-500'
                }`}
                title="Toggle status"
              />

              {/* Card content box */}
              <div className="bg-[#15181D]/30 border-l border-t border-r border-b border-[#242930] hover:border-zinc-800 rounded p-3 flex items-center justify-between gap-4 transition-colors">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Prefix */}
                    <span className="text-zinc-700 select-none">&gt;</span>

                    {/* Monospace tag label */}
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border select-none ${typeColor}`}>
                      [{log.type}]
                    </span>
                    
                    <span className="text-[9px] text-zinc-500 font-semibold flex items-center gap-1 select-none">
                      <Calendar className="w-2.5 h-2.5" />
                      {log.log_date}
                    </span>

                    <span className={`text-[9px] font-bold uppercase tracking-wider select-none ${
                      isComplete ? 'text-[#7FE7C4]' : 'text-[#E8B54D]'
                    }`}>
                      {isComplete ? '[done]' : '[pending]'}
                    </span>
                  </div>

                  <p className={`text-xs leading-relaxed font-sans ${isComplete ? 'line-through text-zinc-500 font-medium' : 'text-zinc-350'}`}>
                    {log.note}
                  </p>
                </div>

                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => deleteLog(log.id)}
                    className="p-1 hover:bg-[#1F2329] text-zinc-600 hover:text-red-400 rounded transition-colors"
                    title="Delete event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#242930] rounded font-mono">
            <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-wider">
              No logs yet — add your first below.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}




