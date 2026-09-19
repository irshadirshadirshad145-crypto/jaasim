import React from 'react';
import {
  User,
  Calendar,
  Clock,
  RotateCcw,
  Sparkles,
  Ticket,
  AlertTriangle,
  MessageSquare,
  GitCommit,
  Check,
  Zap,
  Download,
  ShieldCheck,
  ArrowRight,
  Repeat,
  SlidersHorizontal,
} from 'lucide-react';
import { ShiftSetupConfig, SourceType } from '../types';
import { calculateDurationHours, getPresetRange } from '../utils/dateUtils';

interface ShiftSetupFormProps {
  config: ShiftSetupConfig;
  onChangeConfig: (updated: Partial<ShiftSetupConfig>) => void;
  onToggleSource: (source: SourceType) => void;
  onGenerate: () => void;
  onReset: () => void;
  inShiftEventsCount: number;
  totalEventsCount: number;
  isGenerating?: boolean;
  onQuickDownloadPdf?: () => void;
  onOpenSchemasModal?: () => void;
  onLoadHighVolumePreset?: () => void;
  onLoadZeroEventPreset?: () => void;
}

export const ShiftSetupForm: React.FC<ShiftSetupFormProps> = ({
  config,
  onChangeConfig,
  onToggleSource,
  onGenerate,
  onReset,
  inShiftEventsCount,
  totalEventsCount,
  isGenerating = false,
  onQuickDownloadPdf,
  onOpenSchemasModal,
  onLoadHighVolumePreset,
  onLoadZeroEventPreset,
}) => {
  const duration = calculateDurationHours(config.startDateTime, config.endDateTime);

  const applyPreset = (preset: '8h' | '12h' | 'day' | 'evening' | 'night' | '24h') => {
    const range = getPresetRange(preset);
    onChangeConfig({
      startDateTime: range.start,
      endDateTime: range.end,
    });
  };

  const sourcesList: {
    id: SourceType;
    label: string;
    description: string;
    icon: React.ElementType;
    badge: string;
  }[] = [
    {
      id: 'ticketing',
      label: 'Ticketing Board',
      description: 'Jira / Linear tickets, customer escalations & tasks',
      icon: Ticket,
      badge: 'Jira / Linear',
    },
    {
      id: 'incident',
      label: 'Incident Log',
      description: 'PagerDuty / Opsgenie outages, alerts & severity logs',
      icon: AlertTriangle,
      badge: 'PagerDuty',
    },
    {
      id: 'chat',
      label: 'Ops Chat Feed',
      description: 'Slack / Teams on-call channels, updates & threads',
      icon: MessageSquare,
      badge: 'Slack Ops',
    },
    {
      id: 'commit',
      label: 'Commit History',
      description: 'GitHub / GitLab releases, hotfixes & PR merges',
      icon: GitCommit,
      badge: 'GitHub Prod',
    },
  ];

  const anySourceSelected = Object.values(config.selectedSources).some(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-2xs font-semibold text-indigo-400 uppercase tracking-wider">
            <span>Operations Command</span>
            <span>•</span>
            <span>Shift Setup</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 mt-1">
            Shift Setup &amp; Configuration
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Define shift interval, operator details, and active operational telemetry sources
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onLoadHighVolumePreset && (
            <button
              type="button"
              onClick={onLoadHighVolumePreset}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              High-Volume Preset
            </button>
          )}

          {onLoadZeroEventPreset && (
            <button
              type="button"
              onClick={onLoadZeroEventPreset}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              Zero-Event Preset
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Form Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Operator & Timing */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Operator Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  1. Operator on Duty
                </h3>
              </div>
              <span className="text-2xs text-slate-500">Handover author</span>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Engineer Name *
                </label>
                <input
                  type="text"
                  id="employee-name-input"
                  value={config.employeeName}
                  onChange={(e) => onChangeConfig({ employeeName: e.target.value })}
                  placeholder="e.g., Alex Morgan"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Role / Track
                </label>
                <input
                  type="text"
                  id="employee-role-input"
                  value={config.employeeRole}
                  onChange={(e) => onChangeConfig({ employeeRole: e.target.value })}
                  placeholder="e.g., Senior Operations Lead"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Shift Interval & Presets */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  2. Shift Interval Window
                </h3>
              </div>
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-2xs text-indigo-400 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>{duration}</span>
              </div>
            </div>

            {/* Quick Shift Presets */}
            <div className="mt-4">
              <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Standard Operational Presets
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { id: '8h', label: '8-Hour' },
                  { id: '12h', label: '12-Hour' },
                  { id: 'day', label: 'Day Shift' },
                  { id: 'evening', label: 'Evening' },
                  { id: 'night', label: 'Night' },
                  { id: '24h', label: '24-Hour' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id as any)}
                    className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-2xs font-medium transition-colors text-center"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DateTime Pickers */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Shift Start Time *
                </label>
                <input
                  type="datetime-local"
                  id="shift-start-datetime"
                  value={config.startDateTime}
                  onChange={(e) => onChangeConfig({ startDateTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Shift End Time *
                </label>
                <input
                  type="datetime-local"
                  id="shift-end-datetime"
                  value={config.endDateTime}
                  onChange={(e) => onChangeConfig({ endDateTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Orphaned Task Detector & Overlap Cushion */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Repeat className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  3. Continuity &amp; Handover Guardrails
                </h3>
              </div>
              <span className="text-2xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded font-medium">
                Orphan Detector
              </span>
            </div>

            {/* Orphaned Task Detector Toggle */}
            <div
              onClick={() =>
                onChangeConfig({
                  enableOrphanedTaskDetector: !config.enableOrphanedTaskDetector,
                })
              }
              className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                config.enableOrphanedTaskDetector
                  ? 'bg-slate-950 border-purple-500/40'
                  : 'bg-slate-950/40 border-slate-800 opacity-70'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    config.enableOrphanedTaskDetector
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Orphaned Task Detector
                  </span>
                  <p className="text-2xs text-slate-400">
                    Carries unresolved In Progress &amp; Blockers from the previous shift forward
                  </p>
                </div>
              </div>

              <div
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  config.enableOrphanedTaskDetector
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                {config.enableOrphanedTaskDetector && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            {/* Overlap Buffer Selector */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-semibold text-slate-300 block">Handover Overlap Cushion</span>
                <span className="text-2xs text-slate-500">
                  Expands start time backwards to capture transition communication
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                {[0, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onChangeConfig({ overlapBufferMinutes: mins })}
                    className={`px-2.5 py-1 rounded-lg text-2xs font-mono font-semibold transition-all border ${
                      (config.overlapBufferMinutes || 0) === mins
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    +{mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 4 Data Sources & Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 4: Telemetry Sources */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  4. Telemetry Feeds
                </h3>
              </div>
              <span className="text-2xs text-slate-400">
                {Object.values(config.selectedSources).filter(Boolean).length}/4 Active
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {sourcesList.map((src) => {
                const isChecked = config.selectedSources[src.id];
                const Icon = src.icon;

                return (
                  <div
                    key={src.id}
                    onClick={() => onToggleSource(src.id)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isChecked
                        ? 'bg-slate-950 border-slate-700'
                        : 'bg-slate-950/40 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isChecked
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-slate-200">
                            {src.label}
                          </span>
                          <span className="text-3xs px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {src.badge}
                          </span>
                        </div>
                        <p className="text-2xs text-slate-500">{src.description}</p>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isChecked
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {!anySourceSelected && (
              <p className="text-2xs text-amber-400 mt-3 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Select at least one telemetry feed to generate the note.
              </p>
            )}

            {/* In-Window Events Callout */}
            <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-300 text-2xs">
                  Matching Events: <strong className="text-slate-100">{inShiftEventsCount}</strong> of {totalEventsCount}
                </span>
              </div>
              {inShiftEventsCount === 0 ? (
                <span className="text-3xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                  Zero-Event Ready
                </span>
              ) : (
                <span className="text-3xs text-slate-500">Telemetry In-Window</span>
              )}
            </div>
          </div>

          {/* Actions Card: Generate Note & Reset */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <button
              type="button"
              id="shift-generate-handover-btn"
              onClick={onGenerate}
              disabled={isGenerating || !anySourceSelected || !config.employeeName.trim()}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs tracking-wide transition-colors shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span>{isGenerating ? 'Synthesizing Pipeline...' : 'Synthesize Handover Note'}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>

            <button
              type="button"
              id="shift-reset-btn"
              onClick={onReset}
              className="w-full inline-flex items-center justify-center px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium text-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Reset Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
