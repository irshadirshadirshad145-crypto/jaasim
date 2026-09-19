import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Eye,
  Repeat,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
  RotateCcw,
  Sparkles,
  Ticket,
  AlertTriangle,
  MessageSquare,
  GitCommit,
  Check,
} from 'lucide-react';
import {
  ProcessedActivity,
  HandoverCategory,
  DataProcessingResult,
  ShiftSetupConfig,
  SourceType,
} from '../types';

interface ActivityReviewPageProps {
  config: ShiftSetupConfig;
  processingResult: DataProcessingResult;
  onUpdateCategory: (source: SourceType, recordId: string, newCategory: HandoverCategory) => void;
  onBackToSetup: () => void;
  onRegenerate: () => void;
  onOpenHandoverPreview?: () => void;
  onDownloadPdf?: () => void;
}

export const ActivityReviewPage: React.FC<ActivityReviewPageProps> = ({
  config,
  processingResult,
  onUpdateCategory,
  onBackToSetup,
  onRegenerate,
  onOpenHandoverPreview,
  onDownloadPdf,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<HandoverCategory | 'all'>('all');
  const [carriedFilter, setCarriedFilter] = useState<'all' | 'carried'>('all');
  const [sortBy, setSortBy] = useState<'timestamp-desc' | 'timestamp-asc' | 'priority' | 'id'>('timestamp-desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { activities, categorized, stats } = processingResult;

  // Filter & Sort Logic
  const filteredAndSortedActivities = useMemo(() => {
    let list = [...activities];

    // Source filter
    if (sourceFilter !== 'all') {
      list = list.filter((act) => act.source === sourceFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter((act) => act.category === categoryFilter);
    }

    // Carried forward filter
    if (carriedFilter === 'carried') {
      list = list.filter((act) => act.isCarriedForward);
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (act) =>
          act.recordId.toLowerCase().includes(q) ||
          act.summary.toLowerCase().includes(q) ||
          (act.assignee && act.assignee.toLowerCase().includes(q)) ||
          (act.handoffNotes && act.handoffNotes.toLowerCase().includes(q))
      );
    }

    // Sort logic
    list.sort((a, b) => {
      if (sortBy === 'timestamp-desc') {
        return b.parsedTimestampMs - a.parsedTimestampMs;
      }
      if (sortBy === 'timestamp-asc') {
        return a.parsedTimestampMs - b.parsedTimestampMs;
      }
      if (sortBy === 'priority') {
        const priorityWeight = (p: string) => {
          if (p.includes('Critical') || p.includes('P1')) return 4;
          if (p.includes('High') || p.includes('P2')) return 3;
          if (p.includes('Medium') || p.includes('P3')) return 2;
          return 1;
        };
        return priorityWeight(b.priority) - priorityWeight(a.priority);
      }
      if (sortBy === 'id') {
        return a.recordId.localeCompare(b.recordId);
      }
      return 0;
    });

    return list;
  }, [activities, sourceFilter, categoryFilter, carriedFilter, searchTerm, sortBy]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getSourceIcon = (src: SourceType) => {
    switch (src) {
      case 'ticketing':
        return Ticket;
      case 'incident':
        return AlertTriangle;
      case 'chat':
        return MessageSquare;
      case 'commit':
        return GitCommit;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-2xs font-semibold text-indigo-400 uppercase tracking-wider">
            <span>Operations Command</span>
            <span>•</span>
            <span>Activity Review</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 mt-1">
            Activity Review &amp; Categorization
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Deduplicated and normalized operational records partitioned into handover categories
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRegenerate}
            title="Re-run normalization pipeline"
            className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Re-run Pipeline
          </button>

          {onOpenHandoverPreview && (
            <button
              type="button"
              onClick={onOpenHandoverPreview}
              className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs"
            >
              <span>Proceed to Handover Note</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={`p-3 rounded-xl border text-left transition-all ${
            categoryFilter === 'all'
              ? 'bg-slate-900 border-indigo-500/50 shadow-xs'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">
            All Items
          </span>
          <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">
            {activities.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('COMPLETED')}
          className={`p-3 rounded-xl border text-left transition-all ${
            categoryFilter === 'COMPLETED'
              ? 'bg-slate-900 border-emerald-500/50 shadow-xs'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-2xs font-semibold text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
          <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">
            {categorized.COMPLETED?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('IN_PROGRESS')}
          className={`p-3 rounded-xl border text-left transition-all ${
            categoryFilter === 'IN_PROGRESS'
              ? 'bg-slate-900 border-sky-500/50 shadow-xs'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-2xs font-semibold text-sky-400 uppercase tracking-wider block flex items-center gap-1">
            <Clock className="w-3 h-3" />
            In Progress
          </span>
          <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">
            {categorized.IN_PROGRESS?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('BLOCKERS')}
          className={`p-3 rounded-xl border text-left transition-all ${
            categoryFilter === 'BLOCKERS'
              ? 'bg-slate-900 border-rose-500/50 shadow-xs'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-2xs font-semibold text-rose-400 uppercase tracking-wider block flex items-center gap-1">
            <AlertOctagon className="w-3 h-3" />
            Blockers
          </span>
          <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">
            {categorized.BLOCKERS?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('WATCH_LIST')}
          className={`p-3 rounded-xl border text-left transition-all ${
            categoryFilter === 'WATCH_LIST'
              ? 'bg-slate-900 border-amber-500/50 shadow-xs'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-2xs font-semibold text-amber-400 uppercase tracking-wider block flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Watch-list
          </span>
          <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">
            {categorized.WATCH_LIST?.length || 0}
          </span>
        </button>
      </div>

      {/* Control Bar: Search, Source Filter, Carried Filter, Sort */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by ID, summary, assignee, or handoff notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Source Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-2xs text-slate-500 font-medium">Source:</span>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as SourceType | 'all')}
                className="py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Sources</option>
                <option value="ticketing">Ticketing</option>
                <option value="incident">Incidents</option>
                <option value="chat">Ops Chat</option>
                <option value="commit">Git Commits</option>
              </select>
            </div>

            {/* Carried Forward Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-2xs text-slate-500 font-medium">Orphaned:</span>
              <select
                value={carriedFilter}
                onChange={(e) => setCarriedFilter(e.target.value as 'all' | 'carried')}
                className="py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Records</option>
                <option value="carried">Carried Forward Only</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-2xs text-slate-500 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="timestamp-desc">Newest First</option>
                <option value="timestamp-asc">Oldest First</option>
                <option value="priority">Priority (High to Low)</option>
                <option value="id">Record ID (A-Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. ACTIVITY REVIEW MAIN TABLE (Exact columns requested) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-200">
              Operational Activities ({filteredAndSortedActivities.length})
            </span>
            {stats.carriedForwardCount > 0 && (
              <span className="text-2xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium flex items-center gap-1">
                <Repeat className="w-3 h-3" />
                {stats.carriedForwardCount} Carried Forward
              </span>
            )}
          </div>
          <span className="text-2xs text-slate-500">
            Click row for details &bull; Reassign category via right selector
          </span>
        </div>

        <div className="overflow-x-auto">
          {filteredAndSortedActivities.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-500">
              No shift activities matched the selected filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 text-2xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Source</th>
                  <th className="py-3 px-4 font-semibold">Record ID</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Priority</th>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-right">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredAndSortedActivities.map((act) => {
                  const key = `${act.source}-${act.recordId}`;
                  const isExpanded = expandedId === key;
                  const Icon = getSourceIcon(act.source);

                  return (
                    <React.Fragment key={key}>
                      <tr
                        onClick={() => toggleExpand(key)}
                        className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-800/30' : ''
                        }`}
                      >
                        {/* 1. Source */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="p-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="text-2xs font-mono uppercase text-slate-300">
                              {act.source}
                            </span>
                          </div>
                        </td>

                        {/* 2. Record ID & Carried Forward Badge */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-medium text-slate-100">
                              {act.recordId}
                            </span>
                            {act.isCarriedForward && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                <Repeat className="w-2.5 h-2.5 mr-1" />
                                Carried Forward
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 text-2xs mt-0.5 max-w-sm truncate">
                            {act.summary}
                          </p>
                        </td>

                        {/* 3. Status Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold ${
                              act.status === 'Resolved' || act.status === 'Closed' || act.status === 'Merged'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : act.status === 'In Progress' || act.status === 'Investigating'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {act.status}
                          </span>
                        </td>

                        {/* 4. Priority Badge */}
                        <td className="py-3 px-4 font-mono text-2xs">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-semibold ${
                              act.priority.includes('Critical') || act.priority.includes('P1')
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : act.priority.includes('High') || act.priority.includes('P2')
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {act.priority}
                          </span>
                        </td>

                        {/* 5. Timestamp */}
                        <td className="py-3 px-4 font-mono text-slate-400 text-2xs whitespace-nowrap">
                          {act.displayTimestamp || act.normalizedTimestamp}
                        </td>

                        {/* 6. Category Selector */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={act.category}
                            onChange={(e) =>
                              onUpdateCategory(
                                act.source,
                                act.recordId,
                                e.target.value as HandoverCategory
                              )
                            }
                            className={`py-1 px-2.5 rounded-lg text-2xs font-semibold border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              act.category === 'COMPLETED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : act.category === 'IN_PROGRESS'
                                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                : act.category === 'BLOCKERS'
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            <option value="COMPLETED">Completed</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="BLOCKERS">Blocker / Escalation</option>
                            <option value="WATCH_LIST">Watch-list</option>
                          </select>
                        </td>
                      </tr>

                      {/* Expanded Row for Detailed Inspection */}
                      {isExpanded && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={6} className="p-4 border-b border-slate-800">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              <div className="md:col-span-2 space-y-2">
                                <p className="text-2xs font-semibold text-slate-500 uppercase tracking-wider">
                                  Full Item Context &amp; Details
                                </p>
                                <p className="text-slate-200">{act.summary}</p>
                                {act.handoffNotes && (
                                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                                    <strong className="text-indigo-400 block text-2xs uppercase tracking-wider mb-0.5">
                                      Operational Notes:
                                    </strong>
                                    {act.handoffNotes}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1.5 text-2xs border-l border-slate-800 pl-4">
                                <div className="flex justify-between text-slate-400">
                                  <span>Assignee:</span>
                                  <span className="text-slate-200 font-medium">
                                    {act.assignee || 'Unassigned'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                  <span>Service / Repo:</span>
                                  <span className="font-mono text-slate-200">
                                    {act.service || 'Default'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                  <span>Deduplication:</span>
                                  <span className="text-emerald-400 font-medium">
                                    {act.updateCount > 1 ? `${act.updateCount} merged` : '1 event'}
                                  </span>
                                </div>
                                {act.isCarriedForward && (
                                  <div className="flex justify-between text-purple-400 font-medium">
                                    <span>Origin:</span>
                                    <span>{act.carriedFromShift || 'Previous Shift'}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
