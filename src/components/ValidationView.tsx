import React, { useState } from 'react';
import {
  ShieldCheck,
  Code2,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  FileCode,
  ArrowRight,
  Ticket,
  AlertTriangle,
  MessageSquare,
  GitCommit,
  Upload,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  TICKETING_SCHEMA,
  INCIDENT_SCHEMA,
  CHAT_SCHEMA,
  COMMIT_SCHEMA,
  COMBINED_FEED_SCHEMA,
  FeedSchemaDefinition,
  validateFeedPayload,
} from '../data/jsonSchemas';
import { ShiftEvent, SourceType, DataProcessingResult } from '../types';

interface ValidationViewProps {
  onIngestCustomEvents?: (events: ShiftEvent[]) => void;
  processingResult?: DataProcessingResult;
}

export const ValidationView: React.FC<ValidationViewProps> = ({
  onIngestCustomEvents,
  processingResult,
}) => {
  const [selectedSchema, setSelectedSchema] = useState<SourceType | 'combined'>('ticketing');
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);

  // Live Tester State
  const [testPayload, setTestPayload] = useState<string>('');
  const [validationOutput, setValidationOutput] = useState<{
    tested: boolean;
    valid: boolean;
    validCount: number;
    errors: string[];
    warnings: string[];
    parsedEvents: ShiftEvent[];
  }>({
    tested: false,
    valid: false,
    validCount: 0,
    errors: [],
    warnings: [],
    parsedEvents: [],
  });

  const isCombined = selectedSchema === 'combined';
  const currentFeedDef: FeedSchemaDefinition =
    selectedSchema === 'ticketing'
      ? TICKETING_SCHEMA
      : selectedSchema === 'incident'
      ? INCIDENT_SCHEMA
      : selectedSchema === 'chat'
      ? CHAT_SCHEMA
      : selectedSchema === 'commit'
      ? COMMIT_SCHEMA
      : TICKETING_SCHEMA;

  const currentSchemaObject = isCombined ? COMBINED_FEED_SCHEMA : currentFeedDef.schemaObject;
  const currentTitle = isCombined ? 'Combined Feed Array JSON Schema' : currentFeedDef.title;
  const currentDescription = isCombined
    ? 'Array of operational events spanning all 4 telemetry sources for an entire shift window.'
    : currentFeedDef.description;

  const handleCopySchema = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(currentSchemaObject, null, 2));
      setCopiedSchema(true);
      setTimeout(() => setCopiedSchema(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopySample = async () => {
    try {
      const sample = isCombined
        ? [
            TICKETING_SCHEMA.samplePayload,
            INCIDENT_SCHEMA.samplePayload,
            CHAT_SCHEMA.samplePayload,
            COMMIT_SCHEMA.samplePayload,
          ]
        : currentFeedDef.samplePayload;
      await navigator.clipboard.writeText(JSON.stringify(sample, null, 2));
      setCopiedSample(true);
      setTimeout(() => setCopiedSample(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadSampleIntoTester = () => {
    const sample = isCombined
      ? [
          TICKETING_SCHEMA.samplePayload,
          INCIDENT_SCHEMA.samplePayload,
          CHAT_SCHEMA.samplePayload,
          COMMIT_SCHEMA.samplePayload,
        ]
      : [currentFeedDef.samplePayload];
    setTestPayload(JSON.stringify(sample, null, 2));
  };

  const handleValidatePayload = () => {
    if (!testPayload.trim()) {
      setValidationOutput({
        tested: true,
        valid: false,
        validCount: 0,
        errors: ['Payload is empty. Please enter or paste JSON.'],
        warnings: [],
        parsedEvents: [],
      });
      return;
    }

    try {
      const parsed = JSON.parse(testPayload);
      const res = validateFeedPayload(parsed);
      setValidationOutput({
        tested: true,
        valid: res.isValid,
        validCount: res.events ? res.events.length : 0,
        errors: res.errors,
        warnings: res.warnings,
        parsedEvents: res.events || [],
      });
    } catch (err: any) {
      setValidationOutput({
        tested: true,
        valid: false,
        validCount: 0,
        errors: [`Syntax Error: Malformed JSON (${err.message})`],
        warnings: [],
        parsedEvents: [],
      });
    }
  };

  const handleIngestValidatedEvents = () => {
    if (validationOutput.valid && validationOutput.parsedEvents.length > 0 && onIngestCustomEvents) {
      onIngestCustomEvents(validationOutput.parsedEvents);
      setTestPayload('');
      setValidationOutput({
        tested: false,
        valid: false,
        validCount: 0,
        errors: [],
        warnings: [],
        parsedEvents: [],
      });
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
            <span>Feed Validation &amp; Schemas</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 mt-1">
            Feed JSON Schemas &amp; Pipeline Validation
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Formal JSON Schema specifications (Draft 2020-12), payload tester, and pipeline integrity matrix
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySchema}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            {copiedSchema ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied Schema!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span>Copy JSON Schema</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopySample}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
          >
            {copiedSample ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied Sample!</span>
              </>
            ) : (
              <>
                <FileCode className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                <span>Copy Sample Payload</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Schema Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {[
          { id: 'ticketing', label: 'Ticketing Feed', icon: Ticket, badge: 'Jira/Linear' },
          { id: 'incident', label: 'Incident Log', icon: AlertTriangle, badge: 'PagerDuty' },
          { id: 'chat', label: 'Ops Chat', icon: MessageSquare, badge: 'Slack/Teams' },
          { id: 'commit', label: 'Commit History', icon: GitCommit, badge: 'GitHub' },
          { id: 'combined', label: 'Combined Array', icon: ShieldCheck, badge: 'All Feeds' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedSchema === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedSchema(tab.id as any)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-slate-900 border-indigo-500/50 shadow-xs'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}
                />
                <span className="text-3xs px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  {tab.badge}
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-200 block truncate">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Schema Details & JSON Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Schema Specification */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  {currentTitle}
                </h3>
                <p className="text-2xs text-slate-400 mt-0.5">{currentDescription}</p>
              </div>
              <span className="text-2xs font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-400">
                Draft 2020-12
              </span>
            </div>

            {/* Field requirements breakdown */}
            {!isCombined ? (
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Required Fields ({currentFeedDef.requiredFields.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentFeedDef.requiredFields.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono text-2xs"
                      >
                        {f}*
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Optional Fields ({currentFeedDef.optionalFields.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentFeedDef.optionalFields.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 font-mono text-2xs"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                Combined array schema validates heterogeneous JSON payloads containing events from any or all of the four feeds (Ticketing, Incidents, Ops Chat, Git Commits).
              </div>
            )}

            {/* Code preview */}
            <div className="mt-4">
              <div className="flex items-center justify-between pb-1 text-2xs text-slate-500">
                <span>Schema JSON</span>
                <button
                  type="button"
                  onClick={handleCopySchema}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  Copy JSON
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-3xs font-mono text-slate-300 max-h-72 overflow-y-auto leading-relaxed">
                {JSON.stringify(currentSchemaObject, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Right: Live Ingestion & Payload Tester */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Live JSON Payload Tester &amp; Ingestion
                </h3>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleIntoTester}
                className="text-2xs font-medium text-indigo-400 hover:text-indigo-300"
              >
                Load Sample Payload
              </button>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Paste JSON Array or Object
              </label>
              <textarea
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={8}
                placeholder='[{"source": "ticketing", "recordId": "OPS-100", "timestamp": "2026-09-08T14:30:00Z", "summary": "Fix auth gateway", "status": "In Progress", "priority": "High (P2)"}]'
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Test Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleValidatePayload}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Validate JSON Payload
              </button>

              <button
                type="button"
                onClick={() => {
                  setTestPayload('');
                  setValidationOutput({
                    tested: false,
                    valid: false,
                    validCount: 0,
                    errors: [],
                    warnings: [],
                    parsedEvents: [],
                  });
                }}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Clear
              </button>
            </div>

            {/* Validation Results Report */}
            {validationOutput.tested && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  validationOutput.valid
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {validationOutput.valid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span
                      className={`font-semibold ${
                        validationOutput.valid ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {validationOutput.valid
                        ? `Valid Payload: ${validationOutput.validCount} compliant event(s)`
                        : 'Validation Failed'}
                    </span>
                  </div>

                  {validationOutput.valid && onIngestCustomEvents && (
                    <button
                      type="button"
                      onClick={handleIngestValidatedEvents}
                      className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-2xs font-semibold transition-colors"
                    >
                      <Upload className="w-3 h-3 mr-1" />
                      Ingest into Shift Stream
                    </button>
                  )}
                </div>

                {validationOutput.errors.length > 0 && (
                  <div className="space-y-1 text-2xs text-rose-300">
                    <strong className="block font-semibold">Validation Errors:</strong>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {validationOutput.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationOutput.warnings.length > 0 && (
                  <div className="space-y-1 text-2xs text-amber-300">
                    <strong className="block font-semibold">Warnings:</strong>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {validationOutput.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Health & Verification Check Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              Pipeline Health &amp; Robustness Matrix
            </h3>
          </div>
          <span className="text-2xs text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            All 5 Guardrails Active
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">
              1. Deduplication Key
            </span>
            <span className="text-slate-200 font-mono text-2xs block">
              Map&lt;source:recordId&gt;
            </span>
            <p className="text-3xs text-slate-500">
              Eliminates repeat records and merges latest updates deterministically.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">
              2. Timestamp Normalization
            </span>
            <span className="text-slate-200 font-mono text-2xs block">
              ISO 8601 UTC / Epoch
            </span>
            <p className="text-3xs text-slate-500">
              Handles out-of-order timestamps and normalizes diverse date representations.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">
              3. Zero-Event Shifts
            </span>
            <span className="text-emerald-400 font-medium text-2xs block">
              "Nothing to report"
            </span>
            <p className="text-3xs text-slate-500">
              Cleanly partitions calm overnight shifts without crashing or producing blanks.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider block">
              4. Orphaned Task Detector
            </span>
            <span className="text-purple-400 font-medium text-2xs block">
              Continuity Protection
            </span>
            <p className="text-3xs text-slate-500">
              Automatically carries forward unresolved items from preceding shift.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
