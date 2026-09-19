import React from 'react';
import { Ticket, AlertTriangle, MessageSquare, GitCommit, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { ShiftEvent, SourceType } from '../types';

interface DashboardStatsProps {
  events: ShiftEvent[];
  inShiftEvents: ShiftEvent[];
  selectedSources: Record<SourceType, boolean>;
  onToggleSource?: (source: SourceType) => void;
  activeFilter?: SourceType | 'all';
  onSelectFilter?: (filter: SourceType | 'all') => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  events,
  inShiftEvents,
  selectedSources,
  onToggleSource,
  activeFilter = 'all',
  onSelectFilter,
}) => {
  // Counts overall & in-shift
  const getCounts = (source: SourceType) => {
    const total = events.filter((e) => e.source === source).length;
    const inShift = inShiftEvents.filter((e) => e.source === source);
    const critical = inShift.filter((e) => e.priority.includes('Critical') || e.priority.includes('High')).length;
    const actionRequired = inShift.filter((e) => e.actionRequired).length;
    const resolved = inShift.filter((e) => e.status === 'Resolved' || e.status === 'Closed' || e.status === 'Merged').length;

    return {
      total,
      inShiftCount: inShift.length,
      critical,
      actionRequired,
      resolved,
    };
  };

  const ticketStats = getCounts('ticketing');
  const incidentStats = getCounts('incident');
  const chatStats = getCounts('chat');
  const commitStats = getCounts('commit');

  const cards: {
    source: SourceType;
    title: string;
    label: string;
    icon: React.ElementType;
    stats: ReturnType<typeof getCounts>;
    accentColor: string;
    badgeColor: string;
    borderColor: string;
  }[] = [
    {
      source: 'ticketing',
      title: 'Ticketing Board',
      label: 'Tickets',
      icon: Ticket,
      stats: ticketStats,
      accentColor: 'text-blue-600 bg-blue-50 border-blue-200',
      badgeColor: 'bg-blue-100 text-blue-800',
      borderColor: 'hover:border-blue-300',
    },
    {
      source: 'incident',
      title: 'Incident Log',
      label: 'Incidents',
      icon: AlertTriangle,
      stats: incidentStats,
      accentColor: 'text-rose-600 bg-rose-50 border-rose-200',
      badgeColor: 'bg-rose-100 text-rose-800',
      borderColor: 'hover:border-rose-300',
    },
    {
      source: 'chat',
      title: 'Chat Activity',
      label: 'Chats',
      icon: MessageSquare,
      stats: chatStats,
      accentColor: 'text-purple-600 bg-purple-50 border-purple-200',
      badgeColor: 'bg-purple-100 text-purple-800',
      borderColor: 'hover:border-purple-300',
    },
    {
      source: 'commit',
      title: 'Commit History',
      label: 'Commits',
      icon: GitCommit,
      stats: commitStats,
      accentColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
      badgeColor: 'bg-emerald-100 text-emerald-800',
      borderColor: 'hover:border-emerald-300',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <span>Shift Activity Overview</span>
            <span className="text-xs font-normal text-slate-500">
              ({inShiftEvents.length} items within shift window)
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time feed metrics from connected infrastructure sources
          </p>
        </div>

        {onSelectFilter && (
          <div className="flex items-center space-x-1 self-start sm:self-auto text-xs bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              id="filter-all-btn"
              onClick={() => onSelectFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                activeFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Sources
            </button>
            {cards.map((c) => (
              <button
                key={c.source}
                id={`filter-${c.source}-btn`}
                onClick={() => onSelectFilter(c.source)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all capitalize ${
                  activeFilter === c.source
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c.source}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const isSelected = selectedSources[card.source];
          const isFilterActive = activeFilter === card.source;

          return (
            <div
              key={card.source}
              id={`stat-card-${card.source}`}
              onClick={() => onSelectFilter && onSelectFilter(card.source)}
              className={`relative bg-white rounded-xl border p-4 transition-all duration-150 cursor-pointer ${
                isFilterActive
                  ? 'ring-2 ring-indigo-500 border-indigo-400 shadow-sm'
                  : isSelected
                  ? 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  : 'opacity-60 bg-slate-50 border-dashed border-slate-300'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-2 rounded-lg border ${card.accentColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-500 block">
                      {card.label}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {card.title}
                    </span>
                  </div>
                </div>

                {onToggleSource && (
                  <button
                    type="button"
                    title={isSelected ? 'Source Included' : 'Source Excluded'}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSource(card.source);
                    }}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isSelected ? 'Active' : 'Muted'}
                  </button>
                )}
              </div>

              {/* Main Number: in Shift Window */}
              <div className="mt-4 flex items-baseline justify-between">
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-bold tracking-tight text-slate-900">
                    {card.stats.inShiftCount}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    in shift
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {card.stats.total} total logged
                </span>
              </div>

              {/* Contextual Pills */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {card.stats.critical > 0 ? (
                  <span className="inline-flex items-center text-amber-700 font-medium bg-amber-50 px-1.5 py-0.5 rounded">
                    <AlertCircle className="w-3 h-3 mr-1 text-amber-600" />
                    {card.stats.critical} Critical/High
                  </span>
                ) : (
                  <span className="inline-flex items-center text-slate-500">
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />
                    0 Critical
                  </span>
                )}

                <span className="text-slate-500 font-medium">
                  {card.stats.resolved} resolved
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
