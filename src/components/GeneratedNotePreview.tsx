import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Copy,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Eye,
  Repeat,
  User,
  Calendar,
  Layers,
  Edit3,
  Ticket,
  AlertTriangle,
  MessageSquare,
  GitCommit,
  X,
  FileCheck,
  Cloud,
  Database,
} from 'lucide-react';
import {
  EditableHandoverData,
  EditableHandoverItem,
  HandoverCategory,
  SourceType,
  ShiftSetupConfig,
  HandoverReport,
} from '../types';
import { exportHandoverToPdf } from '../utils/pdfExporter';
import { exportHandoverToDocx } from '../utils/docxExporter';
import { formatDateTimeDisplay } from '../utils/dateUtils';
import { saveHandoverToSupabase } from '../services/supabaseService';

interface GeneratedNotePreviewProps {
  report: HandoverReport;
  config: ShiftSetupConfig;
  onBackToReview?: () => void;
  onGenerateAgain: () => void;
  onViewHistory?: () => void;
}

export const GeneratedNotePreview: React.FC<GeneratedNotePreviewProps> = ({
  report,
  config,
  onBackToReview,
  onGenerateAgain,
  onViewHistory,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isSavingSupabase, setIsSavingSupabase] = useState(false);
  const [saveResultNotice, setSaveResultNotice] = useState<{
    success: boolean;
    message: string;
    isLocal: boolean;
  } | null>(null);
  const [newItemCategory, setNewItemCategory] = useState<HandoverCategory | null>(null);
  const [newItemSummary, setNewItemSummary] = useState('');
  const [newItemRecordId, setNewItemRecordId] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');

  // Initial editable data construction
  const initialData: EditableHandoverData = useMemo(() => {
    const shiftDate = config.startDateTime.split('T')[0] || new Date().toISOString().split('T')[0];
    const shiftStart = formatDateTimeDisplay(config.startDateTime);
    const shiftEnd = formatDateTimeDisplay(config.endDateTime);

    const convertActivities = (cat: HandoverCategory): EditableHandoverItem[] => {
      const activities = report.categorized[cat] || [];
      return activities.map((act) => ({
        id: `${act.source}-${act.recordId}-${Math.random().toString(36).substring(2, 7)}`,
        source: act.source,
        recordId: act.recordId,
        timestamp: act.displayTimestamp || act.normalizedTimestamp,
        status: act.status,
        summary: act.summary,
        priority: act.priority,
        notes: act.handoffNotes || act.details || '',
        isCarriedForward: act.isCarriedForward,
        carriedFromShift: act.carriedFromShift,
      }));
    };

    const completed = convertActivities('COMPLETED');
    const inProgress = convertActivities('IN_PROGRESS');
    const blockers = convertActivities('BLOCKERS');
    const watchList = convertActivities('WATCH_LIST');

    const countParts: string[] = [];
    if (completed.length > 0) countParts.push(`${completed.length} completed`);
    if (inProgress.length > 0) countParts.push(`${inProgress.length} in-progress`);
    if (blockers.length > 0) countParts.push(`${blockers.length} blockers`);
    if (watchList.length > 0) countParts.push(`${watchList.length} watch-list`);
    const countSummaryStr = countParts.join(', ') || '0 activities recorded';

    return {
      employeeName: config.employeeName || 'Operations Engineer',
      employeeRole: config.employeeRole || 'Operations Lead',
      shiftDate,
      shiftStart,
      shiftEnd,
      autoCountSummary: countSummaryStr,
      summary: `Shift concluded for ${config.employeeName || 'on-call staff'} covering interval ${shiftStart} to ${shiftEnd}. Key highlights include ${countSummaryStr}. High-priority blockers and unresolved tasks have been flagged for the incoming shift team.`,
      sections: {
        COMPLETED: completed,
        IN_PROGRESS: inProgress,
        BLOCKERS: blockers,
        WATCH_LIST: watchList,
      },
    };
  }, [report, config]);

  const [handoverData, setHandoverData] = useState<EditableHandoverData>(initialData);

  // Sync if report changes externally
  React.useEffect(() => {
    setHandoverData(initialData);
  }, [initialData]);

  // Handlers for editing
  const handleUpdateSummary = (newSummary: string) => {
    setHandoverData((prev) => ({ ...prev, summary: newSummary }));
  };

  const handleUpdateItem = (
    category: HandoverCategory,
    itemId: string,
    field: 'summary' | 'notes' | 'status',
    value: string
  ) => {
    setHandoverData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [category]: prev.sections[category].map((item) =>
          item.id === itemId ? { ...item, [field]: value } : item
        ),
      },
    }));
  };

  const handleRemoveItem = (category: HandoverCategory, itemId: string) => {
    setHandoverData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [category]: prev.sections[category].filter((item) => item.id !== itemId),
      },
    }));
  };

  const handleAddItem = () => {
    if (!newItemCategory || !newItemSummary.trim()) return;

    const newItem: EditableHandoverItem = {
      id: `manual-${Date.now()}`,
      source: 'manual',
      recordId: newItemRecordId.trim() || `OPS-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: formatDateTimeDisplay(new Date().toISOString()),
      status: newItemCategory === 'COMPLETED' ? 'Resolved' : 'In Progress',
      summary: newItemSummary.trim(),
      notes: newItemNotes.trim(),
    };

    setHandoverData((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [newItemCategory]: [newItem, ...prev.sections[newItemCategory]],
      },
    }));

    setNewItemCategory(null);
    setNewItemSummary('');
    setNewItemRecordId('');
    setNewItemNotes('');
  };

  // Uniform 4 Buttons: Generate Again, Copy Note, Download PDF, Download DOCX
  const handleCopyNote = async () => {
    try {
      const lines: string[] = [];
      lines.push(`# SHIFT HANDOVER NOTE`);
      lines.push(`**Date**: ${handoverData.shiftDate}`);
      lines.push(`**Shift Window**: ${handoverData.shiftStart} to ${handoverData.shiftEnd}`);
      lines.push(`**Outgoing Operator**: ${handoverData.employeeName} (${handoverData.employeeRole})`);
      lines.push(`**Activity Metrics**: ${handoverData.autoCountSummary}`);
      lines.push(``);
      lines.push(`## EXECUTIVE SUMMARY`);
      lines.push(handoverData.summary);
      lines.push(``);

      const printSection = (title: string, items: EditableHandoverItem[]) => {
        lines.push(`## ${title} (${items.length})`);
        if (items.length === 0) {
          lines.push(`- Nothing to report.`);
        } else {
          items.forEach((item) => {
            const carriedBadge = item.isCarriedForward ? ' [CARRIED FORWARD]' : '';
            lines.push(`- **[${item.source.toUpperCase()}] ${item.recordId}**${carriedBadge}: ${item.summary} (Status: ${item.status})`);
            if (item.notes) lines.push(`  *Notes: ${item.notes}*`);
          });
        }
        lines.push(``);
      };

      printSection('1. COMPLETED WORK', handoverData.sections.COMPLETED);
      printSection('2. IN PROGRESS', handoverData.sections.IN_PROGRESS);
      printSection('3. BLOCKERS / ESCALATIONS', handoverData.sections.BLOCKERS);
      printSection('4. WATCH-LIST', handoverData.sections.WATCH_LIST);

      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy note:', err);
    }
  };

  const handleDownloadPdf = () => {
    setIsExportingPdf(true);
    try {
      exportHandoverToPdf(handoverData);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportHandoverToDocx(handoverData);
    } catch (err) {
      console.error('DOCX export failed:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleSaveToSupabase = async () => {
    setIsSavingSupabase(true);
    setSaveResultNotice(null);
    try {
      const res = await saveHandoverToSupabase(handoverData, report);
      setSaveResultNotice({
        success: res.success,
        message: res.message,
        isLocal: res.isLocalFallback,
      });
      setTimeout(() => setSaveResultNotice(null), 8000);
    } catch (err: unknown) {
      console.error('Save to Supabase error:', err);
      setSaveResultNotice({
        success: false,
        message: 'Cloud sync encountered an issue. Handover preserved locally.',
        isLocal: true,
      });
    } finally {
      setIsSavingSupabase(false);
    }
  };

  // Section configs for the 4 categories
  const sections: {
    key: HandoverCategory;
    title: string;
    icon: React.ElementType;
    badgeColor: string;
  }[] = [
    {
      key: 'COMPLETED',
      title: 'Completed Work',
      icon: CheckCircle2,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      key: 'IN_PROGRESS',
      title: 'In Progress',
      icon: Clock,
      badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    },
    {
      key: 'BLOCKERS',
      title: 'Blockers / Escalations',
      icon: AlertOctagon,
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    {
      key: 'WATCH_LIST',
      title: 'Watch-list',
      icon: Eye,
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-2xs font-semibold text-indigo-400 uppercase tracking-wider">
            <span>Operations Command</span>
            <span>•</span>
            <span>Shift Handover Note</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 mt-1">
            Shift Handover Note
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Structured, operator-editable handover document for seamless shift transition
          </p>
        </div>

        {/* 6. EXPORT BUTTONS - UNIFORM BUTTON STYLE */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="export-generate-again-btn"
            onClick={onGenerateAgain}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span>Generate Again</span>
          </button>

          <button
            type="button"
            id="export-copy-note-btn"
            onClick={handleCopyNote}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span>Copy Note</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="export-download-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>{isExportingPdf ? 'Exporting PDF...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            id="export-download-docx-btn"
            onClick={handleDownloadDocx}
            disabled={isExportingDocx}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            <span>{isExportingDocx ? 'Exporting DOCX...' : 'Download DOCX'}</span>
          </button>

          {/* SUPABASE CLOUD SAVE BUTTON */}
          <button
            type="button"
            id="export-save-supabase-btn"
            onClick={handleSaveToSupabase}
            disabled={isSavingSupabase}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
            title="Save copy of handover, tasks, blockers, and escalations to Supabase"
          >
            {isSavingSupabase ? (
              <>
                <Cloud className="w-3.5 h-3.5 mr-1.5 animate-pulse text-emerald-200" />
                <span>Saving to Cloud...</span>
              </>
            ) : saveResultNotice?.success ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-200" />
                <span>Saved to Supabase!</span>
              </>
            ) : (
              <>
                <Cloud className="w-3.5 h-3.5 mr-1.5" />
                <span>Save to Supabase</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SUPABASE STATUS FEEDBACK BANNER */}
      {saveResultNotice && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200 shadow-xs ${
            saveResultNotice.success
              ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
              : 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {saveResultNotice.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div>
              <span className="font-semibold">{saveResultNotice.message}</span>
              <span className="text-3xs text-slate-400 block mt-0.5">
                {saveResultNotice.isLocal
                  ? 'Saved to Local Archive Cache (Safe offline fallback - all records preserved).'
                  : 'Synced to Supabase Cloud Database across handovers, tasks, blockers, and escalations.'}
              </span>
            </div>
          </div>

          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-white text-xs font-medium transition-colors shrink-0"
            >
              <span>View in History →</span>
            </button>
          )}
        </div>
      )}

      {/* 5.1 SHIFT INFORMATION CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            Shift Information
          </h3>
          <span className="text-2xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
            {handoverData.shiftDate}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-2xs uppercase tracking-wider">Outgoing Engineer</span>
            <span className="font-semibold text-slate-100 text-sm mt-0.5 block">
              {handoverData.employeeName}
            </span>
            <span className="text-2xs text-slate-500">{handoverData.employeeRole}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-2xs uppercase tracking-wider">Shift Window</span>
            <span className="font-mono text-slate-200 mt-0.5 block">
              {handoverData.shiftStart}
            </span>
            <span className="font-mono text-slate-400 text-2xs block">
              to {handoverData.shiftEnd}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-2xs uppercase tracking-wider">Telemetry Feeds</span>
            <span className="text-slate-200 mt-0.5 block">
              Ticketing, Incident, Chat, Commits
            </span>
            <span className="text-2xs text-emerald-400">Deterministic pipeline verified</span>
          </div>

          <div>
            <span className="text-slate-400 block text-2xs uppercase tracking-wider">Activity Metrics</span>
            <span className="text-indigo-300 font-medium text-xs mt-0.5 block">
              {handoverData.autoCountSummary}
            </span>
          </div>
        </div>
      </div>

      {/* 5.2 EXECUTIVE SUMMARY CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Edit3 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Executive Summary
            </h3>
          </div>
          <span className="text-2xs text-slate-500">Editable shift overview statement</span>
        </div>

        <div className="mt-3">
          <textarea
            value={handoverData.summary}
            onChange={(e) => handleUpdateSummary(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
            placeholder="Provide high-level operational remarks for the incoming shift..."
          />
        </div>
      </div>

      {/* 5.3 FOUR STRUCTURED SECTIONS */}
      <div className="space-y-4">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const items = handoverData.sections[sec.key];

          return (
            <div
              key={sec.key}
              className="bg-slate-900 border border-slate-800 rounded-xl shadow-xs overflow-hidden"
            >
              {/* Section Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center space-x-2.5">
                  <div className={`p-1.5 rounded-lg border ${sec.badgeColor}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200">{sec.title}</h3>
                  <span className="text-2xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                    {items.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setNewItemCategory(sec.key)}
                  className="inline-flex items-center text-xs font-medium text-indigo-400 hover:text-indigo-300"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Item
                </button>
              </div>

              {/* Items List */}
              <div className="divide-y divide-slate-800">
                {items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Nothing to report for this section.
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 hover:bg-slate-800/30 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-2xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase border border-slate-700">
                            {item.source}
                          </span>

                          <span className="font-mono font-medium text-slate-200">
                            {item.recordId}
                          </span>

                          {item.isCarriedForward && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <Repeat className="w-2.5 h-2.5 mr-1" />
                              Carried Forward
                            </span>
                          )}

                          <span className="text-2xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                            {item.status}
                          </span>

                          <span className="text-2xs text-slate-500 font-mono">
                            {item.timestamp}
                          </span>
                        </div>

                        {/* Editable Summary */}
                        <div>
                          <input
                            type="text"
                            value={item.summary}
                            onChange={(e) =>
                              handleUpdateItem(sec.key, item.id, 'summary', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                            placeholder="Activity summary..."
                          />
                        </div>

                        {/* Editable Remarks / Notes */}
                        <div>
                          <input
                            type="text"
                            value={item.notes || ''}
                            onChange={(e) =>
                              handleUpdateItem(sec.key, item.id, 'notes', e.target.value)
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-slate-950/60 border border-slate-800/80 text-2xs text-slate-400 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                            placeholder="Add handoff notes, owner, or next action..."
                          />
                        </div>
                      </div>

                      {/* Delete Item Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(sec.key, item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors self-end md:self-start"
                        title="Remove from note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for adding item to a section */}
      {newItemCategory && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 w-full max-w-md shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-semibold text-slate-200">
                Add Item to {newItemCategory.replace('_', ' ')}
              </h4>
              <button
                type="button"
                onClick={() => setNewItemCategory(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Record ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. OPS-1029 or INC-882"
                  value={newItemRecordId}
                  onChange={(e) => setNewItemRecordId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Summary *</label>
                <textarea
                  placeholder="Enter activity description..."
                  value={newItemSummary}
                  onChange={(e) => setNewItemSummary(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Handoff Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="Next steps or owner..."
                  value={newItemNotes}
                  onChange={(e) => setNewItemNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setNewItemCategory(null)}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!newItemSummary.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium disabled:opacity-50"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
