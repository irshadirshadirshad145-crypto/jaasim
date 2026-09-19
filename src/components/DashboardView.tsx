import React, { useState, useMemo } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Eye,
  Repeat,
  Ticket,
  AlertTriangle,
  MessageSquare,
  GitCommit,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  SlidersHorizontal,
  FileText,
  Radio,
} from 'lucide-react';
import {
  ShiftSetupConfig,
  DataProcessingResult,
  ShiftEvent,
  SourceType,
  AppPage,
} from '../types';
import { formatDateTimeDisplay } from '../utils/dateUtils';

interface DashboardViewProps {
  config: ShiftSetupConfig;
  processingResult: DataProcessingResult;
  events: ShiftEvent[];
  inShiftEvents: ShiftEvent[];
  onNavigate: (page: AppPage) => void;
  onToggleSource: (source: SourceType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  config,
  processingResult,
  events,
  inShiftEvents,
  onNavigate,
  onToggleSource,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceType | 'all'>('all');

  const { stats, categorized, activities } = processingResult;

  const totalActivitiesCount = activities.length;
  const completedCount = categorized.COMPLETED?.length || 0;
  const inProgressCount = categorized.IN_PROGRESS?.length || 0;
  const blockersCount = categorized.BLOCKERS?.length || 0;
  const watchListCount = categorized.WATCH_LIST?.length || 0;
  const carriedForwardCount = stats.carriedForwardCount || 0;

  // 6 Uniform Metric Cards Data
  const metricCards = [
    {
      id: 'metric-total',
      label: 'Total Activities',
      value: totalActivitiesCount,
      subtext: `${inShiftEvents.length} raw telemetry in window`,
      icon: Activity,
      color: 'text-indigo-400',
      badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    },
    {
      id: 'metric-completed',
      label: 'Completed',
      value: completedCount,
      subtext: 'Resolved tickets & merged commits',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      id: 'metric-inprogress',
      label: 'In Progress',
      value: inProgressCount,
      subtext: 'Ongoing active work items',
      icon: Clock,
      color: 'text-sky-400',
      badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    },
    {
      id: 'metric-blockers',
      label: 'Blockers',
      value: blockersCount,
      subtext: 'High-severity escalations',
      icon: AlertOctagon,
      color: 'text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    {
      id: 'metric-watchlist',
      label: 'Watch-list',
      value: watchListCount,
      subtext: 'Pending monitors & canary checks',
      icon: Eye,
      color: 'text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    {
      id: 'metric-carried',
      label: 'Carried Forward',
      value: carriedForwardCount,
      subtext: 'Orphaned from previous shift',
      icon: Repeat,
      color: 'text-purple-400',
      badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    },
  ];

  // Feed sources statistics
  const feedStats: {
    source: SourceType;
    name: string;
    icon: React.ElementType;
    badge: string;
    total: number;
    inShift: number;
    isActive: boolean;
  }[] = [
    {
      source: 'ticketing',
      name: 'Ticketing Feed',
      icon: Ticket,
      badge: 'Jira / Linear',
      total: events.filter((e) => e.source === 'ticketing').length,
      inShift: inShiftEvents.filter((e) => e.source === 'ticketing').length,
      isActive: config.selectedSources.ticketing,
    },
    {
      source: 'incident',
      name: 'Incident Alerts',
      icon: AlertTriangle,
      badge: 'PagerDuty',
      total: events.filter((e) => e.source === 'incident').length,
      inShift: inShiftEvents.filter((e) => e.source === 'incident').length,
      isActive: config.selectedSources.incident,
    },
    {
      source: 'chat',
      name: 'Ops Chat Feed',
      icon: MessageSquare,
      badge: 'Slack / Teams',
      total: events.filter((e) => e.source === 'chat').length,
      inShift: inShiftEvents.filter((e) => e.source === 'chat').length,
      isActive: config.selectedSources.chat,
    },
    {
      source: 'commit',
      name: 'Git Commits',
      icon: GitCommit,
      badge: 'GitHub / GitLab',
      total: events.filter((e) => e.source === 'commit').length,
      inShift: inShiftEvents.filter((e) => e.source === 'commit').length,
      isActive: config.selectedSources.commit,
    },
  ];

  // Filtered preview activities
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (sourceFilter !== 'all' && act.source !== sourceFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          act.recordId.toLowerCase().includes(query) ||
          act.summary.toLowerCase().includes(query) ||
          (act.assignee && act.assignee.toLowerCase().includes(query)) ||
          act.category.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [activities, sourceFilter, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-2xs font-semibold text-indigo-400 uppercase tracking-wider">
            <span>Operations Command</span>
            <span>•</span>
            <span>Shift Dashboard</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 mt-1">
            Operations Shift Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time shift telemetry, operational metrics, and transition intelligence
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('setup')}
            className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Configure Shift
          </button>

          <button
            type="button"
            onClick={() => onNavigate('handover')}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            View Handover Note
          </button>
        </div>
      </div>

      {/* 3. UNIFORM METRIC CARDS (Exact sizes, spacing & card styling) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-xs transition-all hover:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider truncate">
                  {card.label}
                </span>
                <div className={`p-1.5 rounded-lg border ${card.badgeBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className="text-2xl font-bold font-mono text-slate-100 leading-none">
                  {card.value}
                </div>
                <p className="text-3xs text-slate-500 mt-1.5 truncate">{card.subtext}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Section: Shift Status & Telemetry Sources Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Shift Context & Pipeline State */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-semibold text-slate-200">Shift Parameters</h3>
              </div>
              <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Live Window
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">On-Call Operator:</span>
                <span className="font-semibold text-slate-200">{config.employeeName || 'Unassigned'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Operational Role:</span>
                <span className="text-slate-300">{config.employeeRole || 'Operations Lead'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Shift Start:</span>
                <span className="font-mono text-slate-300">{formatDateTimeDisplay(config.startDateTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Shift End:</span>
                <span className="font-mono text-slate-300">{formatDateTimeDisplay(config.endDateTime)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Overlap Cushion:</span>
                <span className="font-mono text-slate-300">+{config.overlapBufferMinutes || 0} minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Orphaned Tasks:</span>
                <span className={`font-medium ${config.enableOrphanedTaskDetector ? 'text-purple-400' : 'text-slate-500'}`}>
                  {config.enableOrphanedTaskDetector ? `${carriedForwardCount} carried forward` : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-2xs text-slate-500">Deduplication: {stats.deduplicatedCount} merged</span>
            <button
              type="button"
              onClick={() => onNavigate('setup')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Edit Setup
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Data Telemetry Feeds */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Operational Data Feeds</h3>
              <p className="text-2xs text-slate-400">Toggle active feeds to include in handover processing</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('validation')}
              className="text-2xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Feed Schemas
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {feedStats.map((feed) => {
              const Icon = feed.icon;
              return (
                <div
                  key={feed.source}
                  onClick={() => onToggleSource(feed.source)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    feed.isActive
                      ? 'bg-slate-950 border-slate-700 hover:border-slate-600'
                      : 'bg-slate-950/40 border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        feed.isActive
                          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-semibold text-slate-200">{feed.name}</span>
                        <span className="text-3xs px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {feed.badge}
                        </span>
                      </div>
                      <p className="text-2xs text-slate-400 mt-0.5">
                        <strong className="text-slate-200">{feed.inShift}</strong> in shift ({feed.total} total)
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center ${
                      feed.isActive
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {feed.isActive && <CheckCircle2 className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Active Synthesis Queue: <strong className="text-slate-200">{totalActivitiesCount}</strong> activities across 4 categories
            </span>
            <button
              type="button"
              onClick={() => onNavigate('review')}
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Open Review Table
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Shift Stream Inspection */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Shift Telemetry Stream</h3>
            <p className="text-2xs text-slate-400">
              Normalized activities within the active shift window
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search record or summary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44 sm:w-56"
              />
            </div>

            {/* Source Filter Select */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as SourceType | 'all')}
              className="py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Sources</option>
              <option value="ticketing">Ticketing</option>
              <option value="incident">Incidents</option>
              <option value="chat">Ops Chat</option>
              <option value="commit">Commits</option>
            </select>
          </div>
        </div>

        {/* Activity Table */}
        <div className="mt-4 overflow-x-auto">
          {filteredActivities.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              No matching activities found in current filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-2xs uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-semibold">Source</th>
                  <th className="py-2.5 px-3 font-semibold">Record ID</th>
                  <th className="py-2.5 px-3 font-semibold">Summary</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Priority</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredActivities.slice(0, 8).map((act) => (
                  <tr key={`${act.source}-${act.recordId}`} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="text-2xs px-2 py-0.5 rounded font-mono uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {act.source}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                      {act.recordId}
                      {act.isCarriedForward && (
                        <span className="ml-1.5 text-3xs px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Carried
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                      {act.summary}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-2xs text-slate-400">{act.status}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-2xs">
                      {act.priority}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-2xs whitespace-nowrap">
                      {act.displayTimestamp || act.normalizedTimestamp}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`text-2xs px-2 py-0.5 rounded font-medium border ${
                          act.category === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : act.category === 'IN_PROGRESS'
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                            : act.category === 'BLOCKERS'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {act.category.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {filteredActivities.length > 8 && (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-2xs text-slate-500">
            <span>Showing 8 of {filteredActivities.length} activities in preview</span>
            <button
              type="button"
              onClick={() => onNavigate('review')}
              className="text-indigo-400 hover:text-indigo-300 font-medium"
            >
              View All in Activity Review &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
