import React, { useState } from 'react';
import {
  Download,
  FileText,
  Copy,
  Check,
  RotateCcw,
  CheckCircle2,
  FileCheck,
  Code2,
  FileSpreadsheet,
  Printer,
  Share2,
} from 'lucide-react';
import { HandoverReport, ShiftSetupConfig, EditableHandoverData, EditableHandoverItem, HandoverCategory } from '../types';
import { exportHandoverToPdf } from '../utils/pdfExporter';
import { exportHandoverToDocx } from '../utils/docxExporter';
import { formatDateTimeDisplay } from '../utils/dateUtils';

interface ExportViewProps {
  report: HandoverReport;
  config: ShiftSetupConfig;
  onGenerateAgain: () => void;
}

export const ExportView: React.FC<ExportViewProps> = ({
  report,
  config,
  onGenerateAgain,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Synthesize editable data for exporters
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

  const handoverData: EditableHandoverData = {
    employeeName: config.employeeName || 'Operations Engineer',
    employeeRole: config.employeeRole || 'Operations Lead',
    shiftDate,
    shiftStart,
    shiftEnd,
    autoCountSummary: countSummaryStr,
    summary: report.summary || `Shift concluded for ${config.employeeName || 'on-call staff'} covering interval ${shiftStart} to ${shiftEnd}. Key highlights include ${countSummaryStr}. High-priority blockers have been escalated to incoming on-call personnel.`,
    sections: {
      COMPLETED: completed,
      IN_PROGRESS: inProgress,
      BLOCKERS: blockers,
      WATCH_LIST: watchList,
    },
  };

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

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-2xs font-semibold text-indigo-400 uppercase tracking-wider">
            <span>Operations Command</span>
            <span>•</span>
            <span>Export &amp; Dispatch</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 mt-1">
            Handover Export &amp; Dispatch Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Single-click generation and distribution across PDF, DOCX, Markdown, and JSON
          </p>
        </div>

        {/* UNIFORM BUTTON STYLE: Generate Again, Copy Note, Download PDF, Download DOCX */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="export-page-generate-again-btn"
            onClick={onGenerateAgain}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span>Generate Again</span>
          </button>

          <button
            type="button"
            id="export-page-copy-note-btn"
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
            id="export-page-download-pdf-btn"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>{isExportingPdf ? 'Exporting PDF...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            id="export-page-download-docx-btn"
            onClick={handleDownloadDocx}
            disabled={isExportingDocx}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            <span>{isExportingDocx ? 'Exporting DOCX...' : 'Download DOCX'}</span>
          </button>
        </div>
      </div>

      {/* Export Format Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PDF Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold text-rose-400 uppercase tracking-wider">
                Document Export
              </span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Download className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mt-2">Adobe PDF</h3>
            <p className="text-2xs text-slate-400 mt-1">
              Engineered with jsPDF. Includes formal NOC header, shift stats, 4 category tables, and carried-forward tags.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="mt-4 w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download PDF
          </button>
        </div>

        {/* Word DOCX Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold text-sky-400 uppercase tracking-wider">
                Word Document
              </span>
              <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mt-2">Microsoft Word DOCX</h3>
            <p className="text-2xs text-slate-400 mt-1">
              Editable Word document built with docx library. Formatted metadata table, bold section headers, and bulleted activity items.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadDocx}
            disabled={isExportingDocx}
            className="mt-4 w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Download DOCX
          </button>
        </div>

        {/* Markdown / Clipboard Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold text-emerald-400 uppercase tracking-wider">
                Ops Chat / Slack
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Copy className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mt-2">Markdown Summary</h3>
            <p className="text-2xs text-slate-400 mt-1">
              Clean, pre-formatted Markdown text ready for immediate paste into Slack handover channels, MS Teams, or Jira comments.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyNote}
            className="mt-4 w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Copied Note!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Copy Markdown Note
              </>
            )}
          </button>
        </div>

        {/* Machine JSON Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-2xs font-semibold text-purple-400 uppercase tracking-wider">
                Machine Ingestion
              </span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Code2 className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mt-2">Raw JSON Payload</h3>
            <p className="text-2xs text-slate-400 mt-1">
              Full structured JSON state containing report metadata, pipeline statistics, categorized items, and deduplication logs.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyJson}
            className="mt-4 w-full inline-flex items-center justify-center px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            {copiedJson ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                Copied JSON!
              </>
            ) : (
              <>
                <Code2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                Copy Raw JSON
              </>
            )}
          </button>
        </div>
      </div>

      {/* Formatted Text Note Preview Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Exact Handover Output Document
            </h3>
            <p className="text-2xs text-slate-400">
              Live text rendering of what is dispatched in PDF, DOCX, and Clipboard
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopyNote}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" />
            Quick Copy
          </button>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
{`================================================================================
SHIFT HANDOVER NOTE
================================================================================
Date:               ${handoverData.shiftDate}
Shift Window:       ${handoverData.shiftStart} to ${handoverData.shiftEnd}
Operator on Duty:   ${handoverData.employeeName} (${handoverData.employeeRole})
Shift Activity:     ${handoverData.autoCountSummary}
--------------------------------------------------------------------------------

EXECUTIVE SUMMARY
${handoverData.summary}

--------------------------------------------------------------------------------
1. COMPLETED WORK (${handoverData.sections.COMPLETED.length})
--------------------------------------------------------------------------------
${
  handoverData.sections.COMPLETED.length === 0
    ? 'Nothing to report.'
    : handoverData.sections.COMPLETED.map(
        (i) =>
          `* [${i.source.toUpperCase()}] ${i.recordId}${
            i.isCarriedForward ? ' [CARRIED FORWARD]' : ''
          }: ${i.summary} (Status: ${i.status})${i.notes ? `\n  Remarks: ${i.notes}` : ''}`
      ).join('\n')
}

--------------------------------------------------------------------------------
2. IN PROGRESS (${handoverData.sections.IN_PROGRESS.length})
--------------------------------------------------------------------------------
${
  handoverData.sections.IN_PROGRESS.length === 0
    ? 'Nothing to report.'
    : handoverData.sections.IN_PROGRESS.map(
        (i) =>
          `* [${i.source.toUpperCase()}] ${i.recordId}${
            i.isCarriedForward ? ' [CARRIED FORWARD]' : ''
          }: ${i.summary} (Status: ${i.status})${i.notes ? `\n  Remarks: ${i.notes}` : ''}`
      ).join('\n')
}

--------------------------------------------------------------------------------
3. BLOCKERS / ESCALATIONS (${handoverData.sections.BLOCKERS.length})
--------------------------------------------------------------------------------
${
  handoverData.sections.BLOCKERS.length === 0
    ? 'Nothing to report.'
    : handoverData.sections.BLOCKERS.map(
        (i) =>
          `* [${i.source.toUpperCase()}] ${i.recordId}${
            i.isCarriedForward ? ' [CARRIED FORWARD]' : ''
          }: ${i.summary} (Status: ${i.status})${i.notes ? `\n  Remarks: ${i.notes}` : ''}`
      ).join('\n')
}

--------------------------------------------------------------------------------
4. WATCH-LIST (${handoverData.sections.WATCH_LIST.length})
--------------------------------------------------------------------------------
${
  handoverData.sections.WATCH_LIST.length === 0
    ? 'Nothing to report.'
    : handoverData.sections.WATCH_LIST.map(
        (i) =>
          `* [${i.source.toUpperCase()}] ${i.recordId}${
            i.isCarriedForward ? ' [CARRIED FORWARD]' : ''
          }: ${i.summary} (Status: ${i.status})${i.notes ? `\n  Remarks: ${i.notes}` : ''}`
      ).join('\n')
}

================================================================================
Generated deterministically via Shift Handover Note Generator
================================================================================`}
        </div>
      </div>
    </div>
  );
};
