import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  AlertOctagon,
  Clock,
  SlidersHorizontal,
  Cloud,
  Database,
  ExternalLink,
  ShieldCheck,
  Calendar,
  User,
  X,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  SupabaseHandoverRecord,
  SupabaseTaskRecord,
  SupabaseBlockerRecord,
  SupabaseEscalationRecord,
  SupabaseIncidentRecord,
} from '../types/supabase';
import {
  fetchHandoverHistory,
  fetchHandoverDetail,
  deleteHandover,
} from '../services/supabaseService';
import { getSupabaseCredentials } from '../utils/supabaseClient';
import { exportHandoverToPdf } from '../utils/pdfExporter';
import { EditableHandoverData, HandoverCategory, AuthUserProfile } from '../types';

interface HandoverHistoryProps {
  onNavigateToHandover?: () => void;
  showToast: (msg: string) => void;
  currentUser?: AuthUserProfile | null;
}

export const HandoverHistory: React.FC<HandoverHistoryProps> = ({
  onNavigateToHandover,
  showToast,
  currentUser,
}) => {
  const [handovers, setHandovers] = useState<SupabaseHandoverRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFromSupabase, setIsFromSupabase] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'supabase' | 'local'>('all');

  // Inspection modal state
  const [selectedHandoverId, setSelectedHandoverId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    handover: SupabaseHandoverRecord | null;
    tasks: SupabaseTaskRecord[];
    blockers: SupabaseBlockerRecord[];
    escalations: SupabaseEscalationRecord[];
    incidents: SupabaseIncidentRecord[];
  } | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'summary' | 'tasks' | 'blockers' | 'escalations' | 'incidents' | 'raw'>('summary');
  const [copiedJson, setCopiedJson] = useState(false);

  const credentials = getSupabaseCredentials();

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetchHandoverHistory();
      setHandovers(res.handovers);
      setIsFromSupabase(res.isFromSupabase);
    } catch (err) {
      console.error('Error fetching handover history:', err);
      showToast('Failed to load handover history. Showing local records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Open detail modal
  const handleInspect = async (id: string) => {
    setSelectedHandoverId(id);
    setDetailLoading(true);
    setActiveDetailTab('summary');
    try {
      const detail = await fetchHandoverDetail(id);
      setDetailData(detail);
    } catch (err) {
      console.error('Error loading handover detail:', err);
      showToast('Failed to load detail for this handover.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this handover record and its associated tasks/blockers?')) {
      const res = await deleteHandover(id);
      showToast(res.message);
      if (selectedHandoverId === id) {
        setSelectedHandoverId(null);
        setDetailData(null);
      }
      loadHistory();
    }
  };

  // Export selected historic handover to PDF
  const handleExportPdf = (handover: SupabaseHandoverRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Reconstruct minimal EditableHandoverData for PDF generator
      const pdfData: EditableHandoverData = {
        employeeName: handover.employee_name,
        employeeRole: handover.employee_role,
        shiftDate: handover.shift_date,
        shiftStart: handover.shift_start,
        shiftEnd: handover.shift_end,
        autoCountSummary: handover.auto_count_summary,
        summary: handover.summary,
        sections: {
          COMPLETED: [],
          IN_PROGRESS: [],
          BLOCKERS: [],
          WATCH_LIST: [],
        },
      };

      // If we have detail cached
      if (detailData && detailData.handover?.id === handover.id) {
        const catMap: Record<HandoverCategory, SupabaseTaskRecord[]> = {
          COMPLETED: detailData.tasks.filter((t) => t.category === 'COMPLETED'),
          IN_PROGRESS: detailData.tasks.filter((t) => t.category === 'IN_PROGRESS'),
          BLOCKERS: detailData.tasks.filter((t) => t.category === 'BLOCKERS'),
          WATCH_LIST: detailData.tasks.filter((t) => t.category === 'WATCH_LIST'),
        };

        const cats: HandoverCategory[] = ['COMPLETED', 'IN_PROGRESS', 'BLOCKERS', 'WATCH_LIST'];
        cats.forEach((cat) => {
          pdfData.sections[cat] = catMap[cat].map((t) => ({
            id: t.id,
            source: t.source,
            recordId: t.record_id,
            timestamp: t.created_at,
            status: t.status,
            summary: t.title,
            priority: t.priority,
            notes: t.notes,
            isCarriedForward: t.is_carried_forward,
            carriedFromShift: t.carried_from_shift,
          }));
        });
      }

      exportHandoverToPdf(pdfData);
      showToast(`Exported PDF for ${handover.employee_name} (${handover.shift_date})`);
    } catch (err) {
      console.error('Historic PDF export error:', err);
      showToast('Failed to export PDF.');
    }
  };

  // Filtered handovers
  const filtered = handovers.filter((h) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      h.employee_name.toLowerCase().includes(q) ||
      h.employee_role.toLowerCase().includes(q) ||
      h.shift_date.toLowerCase().includes(q) ||
      h.summary.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (filterMode === 'supabase') return h.source_mode === 'supabase';
    if (filterMode === 'local') return h.source_mode !== 'supabase';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-2xs font-semibold text-indigo-400 uppercase tracking-wider">
            <span>Database Archive</span>
            <span>•</span>
            <span>Handover History</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 mt-1 flex items-center gap-2.5">
            <History className="w-6 h-6 text-indigo-400" />
            <span>Shift Handover History</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Archived handover documents, cascading tasks, blockers, escalations, and incidents
          </p>
        </div>

        {/* Status indicator & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {currentUser && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>Operator: {currentUser.name}</span>
            </div>
          )}

          {credentials.isConfigured ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Cloud className="w-3.5 h-3.5" />
              <span>Supabase Cloud Sync</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Database className="w-3.5 h-3.5" />
              <span>Local Archive (Offline Safe)</span>
            </div>
          )}

          <button
            type="button"
            onClick={loadHistory}
            disabled={isLoading}
            className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by operator, date, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Storage:
          </span>
          <div className="inline-flex p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'all'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({handovers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('supabase')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'supabase'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cloud ({handovers.filter((h) => h.source_mode === 'supabase').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('local')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'local'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Local ({handovers.filter((h) => h.source_mode !== 'supabase').length})
            </button>
          </div>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-300 font-medium">Loading handover history records...</p>
          <p className="text-xs text-slate-500 mt-1">Querying database archive & cascading tables</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">No shift handovers found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {searchQuery
              ? 'No records match your filter criteria. Try clearing the search query.'
              : 'Generate a shift handover in the main workflow and save a copy to populate this archive.'}
          </p>
          {onNavigateToHandover && (
            <button
              type="button"
              onClick={onNavigateToHandover}
              className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Go to Shift Handover Generator
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => handleInspect(item.id)}
              className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                      {item.employee_name}
                    </span>
                    <span className="text-xs text-slate-400">({item.employee_role})</span>

                    {item.source_mode === 'supabase' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Cloud className="w-2.5 h-2.5" />
                        <span>Supabase RLS</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Database className="w-2.5 h-2.5" />
                        <span>Local Cache</span>
                      </span>
                    )}

                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{item.shift_date}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {item.shift_start} → {item.shift_end}
                      </span>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 font-mono text-3xs">
                      Saved {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInspect(item.id);
                    }}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    <span>Inspect</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleExportPdf(item, e)}
                    className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
                    title="Export PDF of this note"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 text-xs transition-colors"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Summary snippet */}
              <div className="mt-3">
                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {item.summary}
                </p>
              </div>

              {/* Auto Count Badges */}
              <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-2xs">
                <div className="text-slate-400 font-mono">
                  <span className="text-indigo-400 font-semibold">Metrics: </span>
                  <span>{item.auto_count_summary}</span>
                </div>
                <span className="text-slate-500 font-mono text-3xs">ID: {item.id.slice(0, 8)}...</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INSPECTION MODAL */}
      {selectedHandoverId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Handover Record & Cascading Tables
                  </h3>
                  <p className="text-xs text-slate-400">
                    {detailData?.handover?.employee_name} • {detailData?.handover?.shift_date} (
                    {detailData?.handover?.shift_start} → {detailData?.handover?.shift_end})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHandoverId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800 bg-slate-950/40 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveDetailTab('summary')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors ${
                  activeDetailTab === 'summary'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Summary & Details
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailTab('tasks')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeDetailTab === 'tasks'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Tasks</span>
                <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-3xs">
                  {detailData?.tasks.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailTab('blockers')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeDetailTab === 'blockers'
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Blockers</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-3xs">
                  {detailData?.blockers.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailTab('escalations')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeDetailTab === 'escalations'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Escalations</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-3xs">
                  {detailData?.escalations.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailTab('incidents')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
                  activeDetailTab === 'incidents'
                    ? 'border-sky-500 text-sky-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Incidents</span>
                <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 text-3xs">
                  {detailData?.incidents.length || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailTab('raw')}
                className={`px-3 py-2 border-b-2 font-medium transition-colors ${
                  activeDetailTab === 'raw'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Raw Database JSON
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              {detailLoading ? (
                <div className="py-12 text-center">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Loading cascading records...</p>
                </div>
              ) : !detailData?.handover ? (
                <div className="py-8 text-center text-slate-400 text-xs">Record not found.</div>
              ) : (
                <>
                  {/* TAB 1: SUMMARY */}
                  {activeDetailTab === 'summary' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-3xs font-semibold text-slate-500 uppercase">Operator</span>
                          <p className="text-xs font-bold text-slate-200 mt-0.5">
                            {detailData.handover.employee_name}
                          </p>
                          <p className="text-3xs text-slate-400">{detailData.handover.employee_role}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-3xs font-semibold text-slate-500 uppercase">Shift Window</span>
                          <p className="text-xs font-bold text-slate-200 mt-0.5">
                            {detailData.handover.shift_date}
                          </p>
                          <p className="text-3xs text-slate-400 font-mono">
                            {detailData.handover.shift_start} - {detailData.handover.shift_end}
                          </p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-3xs font-semibold text-slate-500 uppercase">Database Storage</span>
                          <p className="text-xs font-bold text-slate-200 mt-0.5 flex items-center gap-1">
                            {detailData.handover.source_mode === 'supabase' ? (
                              <>
                                <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Supabase RLS</span>
                              </>
                            ) : (
                              <>
                                <Database className="w-3.5 h-3.5 text-amber-400" />
                                <span>Local Cache</span>
                              </>
                            )}
                          </p>
                          <p className="text-3xs text-slate-400">Status: {detailData.handover.status}</p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                          <span className="text-3xs font-semibold text-slate-500 uppercase">Total Items</span>
                          <p className="text-xs font-bold text-slate-200 mt-0.5">
                            {detailData.tasks.length} tasks
                          </p>
                          <p className="text-3xs text-rose-400 font-semibold">
                            {detailData.blockers.length} blockers, {detailData.escalations.length} escalations
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                          Shift Executive Summary
                        </h4>
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {detailData.handover.summary}
                        </p>
                      </div>

                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                          Count Metrics
                        </h4>
                        <p className="text-xs font-mono text-indigo-300">
                          {detailData.handover.auto_count_summary}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: TASKS */}
                  {activeDetailTab === 'tasks' && (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-400 flex items-center justify-between pb-1">
                        <span>Stored in <code className="text-indigo-300 font-mono">public.handover_tasks</code></span>
                        <span>{detailData.tasks.length} total tasks</span>
                      </div>
                      {detailData.tasks.length === 0 ? (
                        <p className="text-xs text-slate-500 py-4 text-center">No individual tasks stored.</p>
                      ) : (
                        detailData.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-3xs font-bold font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {task.record_id}
                                </span>
                                <span
                                  className={`text-3xs font-semibold px-2 py-0.5 rounded-full border ${
                                    task.category === 'COMPLETED'
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      : task.category === 'IN_PROGRESS'
                                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                                      : task.category === 'BLOCKERS'
                                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}
                                >
                                  {task.category.replace('_', ' ')}
                                </span>
                                <span className="text-xs font-medium text-slate-200">{task.title}</span>
                              </div>
                              {task.notes && (
                                <p className="text-2xs text-slate-400 pl-1">{task.notes}</p>
                              )}
                              {task.is_carried_forward && (
                                <span className="inline-flex items-center text-3xs text-purple-400">
                                  Carried forward from: {task.carried_from_shift || 'Previous shift'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-3xs shrink-0 font-mono">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {task.status}
                              </span>
                              <span className="text-slate-500">[{task.priority}]</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 3: BLOCKERS */}
                  {activeDetailTab === 'blockers' && (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-400 pb-1">
                        Stored in <code className="text-rose-300 font-mono">public.blockers</code>
                      </div>
                      {detailData.blockers.length === 0 ? (
                        <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                          <span>No blockers recorded for this shift.</span>
                        </div>
                      ) : (
                        detailData.blockers.map((b) => (
                          <div
                            key={b.id}
                            className="bg-slate-950 border border-rose-900/30 rounded-lg p-3.5 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                                <span>{b.summary}</span>
                              </span>
                              <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                {b.impact_level}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs text-slate-400">
                              <div>
                                <span className="text-slate-500">Record ID:</span>{' '}
                                <span className="font-mono text-slate-300">{b.record_id}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Status:</span>{' '}
                                <span className="text-slate-300">{b.status}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Owner:</span>{' '}
                                <span className="text-slate-300">{b.owner || 'Unassigned'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Escalated To:</span>{' '}
                                <span className="text-amber-300">{b.escalated_to || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 4: ESCALATIONS */}
                  {activeDetailTab === 'escalations' && (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-400 pb-1">
                        Stored in <code className="text-amber-300 font-mono">public.escalations</code>
                      </div>
                      {detailData.escalations.length === 0 ? (
                        <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                          <span>No escalations recorded for this shift.</span>
                        </div>
                      ) : (
                        detailData.escalations.map((e) => (
                          <div
                            key={e.id}
                            className="bg-slate-950 border border-amber-900/30 rounded-lg p-3.5 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-amber-200">
                                {e.summary}
                              </span>
                              <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                {e.urgency}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-2xs text-slate-400">
                              <div>
                                <span className="text-slate-500">Incident:</span>{' '}
                                <span className="font-mono text-slate-300">{e.incident_id}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Channel:</span>{' '}
                                <span className="text-slate-300">{e.channel || '#ops'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Ack By:</span>{' '}
                                <span className="text-slate-300">{e.acknowledged_by || 'Lead'}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 5: INCIDENTS */}
                  {activeDetailTab === 'incidents' && (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-400 pb-1">
                        Stored in <code className="text-sky-300 font-mono">public.incidents</code>
                      </div>
                      {detailData.incidents.length === 0 ? (
                        <div className="p-6 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                          <span>No incidents recorded for this shift.</span>
                        </div>
                      ) : (
                        detailData.incidents.map((inc) => (
                          <div
                            key={inc.id}
                            className="bg-slate-950 border border-sky-900/30 rounded-lg p-3.5 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-sky-200">
                                {inc.summary}
                              </span>
                              <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                                {inc.severity}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-2xs text-slate-400">
                              <div>
                                <span className="text-slate-500">Service:</span>{' '}
                                <span className="text-slate-300">{inc.service}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Status:</span>{' '}
                                <span className="text-slate-300">{inc.resolution_status}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Record:</span>{' '}
                                <span className="font-mono text-slate-300">{inc.record_id}</span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 6: RAW DATABASE JSON */}
                  {activeDetailTab === 'raw' && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(detailData, null, 2));
                          setCopiedJson(true);
                          setTimeout(() => setCopiedJson(false), 2000);
                        }}
                        className="absolute right-3 top-3 inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-2xs font-medium border border-slate-700 transition-colors"
                      >
                        {copiedJson ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>Copy JSON</span>
                          </>
                        )}
                      </button>
                      <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-3xs text-indigo-300 font-mono overflow-x-auto max-h-96 leading-normal">
                        {JSON.stringify(detailData, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
              <span className="text-3xs text-slate-500 font-mono">
                Primary Key: {detailData?.handover?.id}
              </span>
              <div className="flex items-center gap-2">
                {detailData?.handover && (
                  <button
                    type="button"
                    onClick={(e) => handleExportPdf(detailData.handover!, e)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    <span>Download PDF</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedHandoverId(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
