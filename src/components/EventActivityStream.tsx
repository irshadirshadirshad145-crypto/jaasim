import React, { useState } from 'react';
import {
  Ticket,
  AlertTriangle,
  MessageSquare,
  GitCommit,
  Search,
  Filter,
  CheckCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ShiftEvent, SourceType } from '../types';
import { formatDateTimeDisplay, isWithinShift } from '../utils/dateUtils';

interface EventActivityStreamProps {
  events: ShiftEvent[];
  shiftStart: string;
  shiftEnd: string;
  selectedSources: Record<SourceType, boolean>;
  activeSourceFilter: SourceType | 'all';
  onSelectFilter: (filter: SourceType | 'all') => void;
}

export const EventActivityStream: React.FC<EventActivityStreamProps> = ({
  events,
  shiftStart,
  shiftEnd,
  selectedSources,
  activeSourceFilter,
  onSelectFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyInShift, setOnlyInShift] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<ShiftEvent | null>(null);

  // Filter events
  const filteredEvents = events.filter((ev) => {
    // Source active in form config
    if (!selectedSources[ev.source]) return false;

    // Source tab filter
    if (activeSourceFilter !== 'all' && ev.source !== activeSourceFilter) return false;

    // Shift window check
    const inWindow = isWithinShift(ev.timestamp, shiftStart, shiftEnd);
    if (onlyInShift && !inWindow) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = ev.recordId.toLowerCase().includes(q);
      const matchSummary = ev.summary.toLowerCase().includes(q);
      const matchService = ev.service?.toLowerCase().includes(q);
      const matchAssignee = ev.assignee?.toLowerCase().includes(q);
      const matchStatus = ev.status.toLowerCase().includes(q);
      return matchId || matchSummary || matchService || matchAssignee || matchStatus;
    }

    return true;
  });

  const getSourceIcon = (source: SourceType) => {
    switch (source) {
      case 'ticketing':
        return <Ticket className="w-4 h-4 text-blue-600" />;
      case 'incident':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      case 'commit':
        return <GitCommit className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (priority.includes('Critical')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          {priority}
        </span>
      );
    }
    if (priority.includes('High')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          {priority}
        </span>
      );
    }
    if (priority.includes('Medium')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          {priority}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        {priority}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Resolved':
      case 'Closed':
      case 'Merged':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            {status}
          </span>
        );
      case 'In Progress':
      case 'Investigating':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            {status}
          </span>
        );
      case 'Mitigated':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-2xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Shift Activity Stream & Mock Data
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {filteredEvents.length} records
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real & realistic mock activity feed feeding into the handover generator
          </p>
        </div>

        {/* Search and Shift Window Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Bar */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              id="event-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search record, service..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Only in shift window toggle */}
          <button
            type="button"
            id="toggle-in-shift-filter"
            onClick={() => setOnlyInShift(!onlyInShift)}
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              onlyInShift
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            {onlyInShift ? 'Shift Window Only' : 'Showing All Times'}
          </button>
        </div>
      </div>

      {/* Events Table / List */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-100 text-2xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-2.5 px-4">Source & ID</th>
              <th className="py-2.5 px-4">Summary</th>
              <th className="py-2.5 px-4">Priority / Severity</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Timestamp</th>
              <th className="py-2.5 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  <Info className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                  No mock events found matching current criteria or shift window.
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev, idx) => {
                const inShift = isWithinShift(ev.timestamp, shiftStart, shiftEnd);

                return (
                  <tr
                    key={`${ev.source}-${ev.recordId}-${ev.timestamp}-${idx}`}
                    onClick={() => setSelectedEvent(ev)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    {/* Source & ID */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="p-1.5 rounded-md bg-slate-100 group-hover:bg-white border border-slate-200 transition-colors">
                          {getSourceIcon(ev.source)}
                        </div>
                        <div>
                          <span className="font-mono font-bold text-slate-900 block">
                            {ev.recordId}
                          </span>
                          <span className="text-2xs text-slate-400 capitalize">
                            {ev.source}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Summary */}
                    <td className="py-3 px-4 max-w-xs md:max-w-md">
                      <div className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {ev.summary}
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5 text-2xs text-slate-500">
                        {ev.service && <span>Service: {ev.service}</span>}
                        {ev.assignee && (
                          <>
                            <span>•</span>
                            <span>Assignee: {ev.assignee}</span>
                          </>
                        )}
                        {ev.actionRequired && (
                          <span className="text-rose-600 font-semibold">
                            • Needs Handoff
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getPriorityBadge(ev.priority)}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getStatusBadge(ev.status)}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500 text-2xs">
                      <div>{formatDateTimeDisplay(ev.timestamp)}</div>
                      <div className="mt-0.5">
                        {inShift ? (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-3xs">
                            In Shift
                          </span>
                        ) : (
                          <span className="text-slate-400 text-3xs">Outside window</span>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-200 text-slate-400 group-hover:text-indigo-600">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal / Flyout Details for Selected Item */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 text-slate-900 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                  {getSourceIcon(selectedEvent.source)}
                </div>
                <div>
                  <h4 className="font-mono font-bold text-base text-slate-900">
                    {selectedEvent.recordId}
                  </h4>
                  <span className="text-xs text-slate-500 capitalize">
                    {selectedEvent.source} Feed Record
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                Summary
              </label>
              <p className="text-sm font-semibold text-slate-900 mt-0.5">
                {selectedEvent.summary}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Priority / Severity:</span>
                <div className="mt-1">{getPriorityBadge(selectedEvent.priority)}</div>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Status:</span>
                <div className="mt-1">{getStatusBadge(selectedEvent.status)}</div>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Service / Component:</span>
                <span className="font-semibold text-slate-800 mt-1 block">
                  {selectedEvent.service || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Assignee / Author:</span>
                <span className="font-semibold text-slate-800 mt-1 block">
                  {selectedEvent.assignee || 'Unassigned'}
                </span>
              </div>
            </div>

            {selectedEvent.details && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500 font-semibold block mb-1">
                  Investigation & Activity Details:
                </span>
                <p className="text-slate-700 leading-relaxed">
                  {selectedEvent.details}
                </p>
              </div>
            )}

            {selectedEvent.handoffNotes && (
              <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200 text-xs">
                <span className="text-rose-800 font-semibold block mb-1">
                  Shift Handoff Instruction:
                </span>
                <p className="text-rose-900 leading-relaxed font-medium">
                  {selectedEvent.handoffNotes}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
