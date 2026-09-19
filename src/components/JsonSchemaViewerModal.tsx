import React, { useState } from 'react';
import {
  X,
  Code2,
  Copy,
  Check,
  FileJson,
  Upload,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Ticket,
  AlertOctagon,
  MessageSquare,
  GitCommit,
  Sparkles,
} from 'lucide-react';
import {
  ALL_SCHEMAS,
  COMBINED_FEED_SCHEMA,
  validateFeedPayload,
  ValidationResult,
} from '../data/jsonSchemas';
import { ShiftEvent, SourceType } from '../types';

interface JsonSchemaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestCustomEvents?: (events: ShiftEvent[]) => void;
}

type TabType = 'ticketing' | 'incident' | 'chat' | 'commit' | 'combined' | 'tester';

export const JsonSchemaViewerModal: React.FC<JsonSchemaViewerModalProps> = ({
  isOpen,
  onClose,
  onIngestCustomEvents,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ticketing');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Ingestion Tester State
  const [testerInput, setTesterInput] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleValidateTester = () => {
    const res = validateFeedPayload(testerInput);
    setValidationResult(res);
  };

  const handleLoadSampleInTester = (source: SourceType) => {
    const sample = [ALL_SCHEMAS[source].samplePayload];
    setTesterInput(JSON.stringify(sample, null, 2));
    setValidationResult(null);
  };

  const handleLoadAllSamples = () => {
    const all = Object.values(ALL_SCHEMAS).map((s) => s.samplePayload);
    setTesterInput(JSON.stringify(all, null, 2));
    setValidationResult(null);
  };

  const handleIngest = () => {
    if (validationResult && validationResult.isValid && validationResult.events.length > 0) {
      if (onIngestCustomEvents) {
        onIngestCustomEvents(validationResult.events);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Feed JSON Input Schemas & Custom Ingestion
              </h2>
              <p className="text-xs text-slate-500">
                Formal JSON schemas, required properties, and real-time schema validation for the 4 telemetry feeds.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-4 pt-2 bg-slate-50/40 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ticketing')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'ticketing'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-blue-600" />
            <span>Ticketing Feed</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('incident')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'incident'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-600" />
            <span>Incident Log</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
            <span>Ops Chat Feed</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('commit')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'commit'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 text-emerald-600" />
            <span>Git Commits</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('combined')}
            className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 ${
              activeTab === 'combined'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileJson className="w-3.5 h-3.5 text-slate-600" />
            <span>Combined Array</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tester')}
            className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ml-auto ${
              activeTab === 'tester'
                ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                : 'border-transparent text-emerald-700 bg-emerald-50/70 hover:bg-emerald-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Custom Ingestion Tester</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* SINGLE FEED SCHEMA VIEW */}
          {activeTab !== 'combined' && activeTab !== 'tester' && (
            <div className="space-y-4">
              {(() => {
                const schemaDef = ALL_SCHEMAS[activeTab as SourceType];
                const schemaJson = JSON.stringify(schemaDef.schemaObject, null, 2);
                const sampleJson = JSON.stringify(schemaDef.samplePayload, null, 2);

                return (
                  <div className="space-y-4">
                    {/* Description and Badges */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">{schemaDef.title}</h3>
                        <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          source: "{schemaDef.source}"
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{schemaDef.description}</p>

                      <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-4 text-xs">
                        <div>
                          <span className="font-semibold text-slate-700 block mb-1">
                            Required Fields (Must not be omitted):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {schemaDef.requiredFields.map((f) => (
                              <span
                                key={f}
                                className="px-2 py-0.5 rounded text-3xs font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                              >
                                {f}*
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="font-semibold text-slate-700 block mb-1">
                            Optional Fields (Contextual / Enriched):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {schemaDef.optionalFields.map((f) => (
                              <span
                                key={f}
                                className="px-2 py-0.5 rounded text-3xs font-mono bg-slate-100 text-slate-600 border border-slate-200"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* JSON Schema Definition */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          JSON Schema Definition (Draft 2020-12)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(schemaJson, `schema-${activeTab}`)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-2xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                        >
                          {copiedKey === `schema-${activeTab}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-500" />
                              <span>Copy Schema</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                        {schemaJson}
                      </pre>
                    </div>

                    {/* Sample Payload */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Sample Valid Payload
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleLoadSampleInTester(activeTab as SourceType);
                              setActiveTab('tester');
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-2xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-600" />
                            <span>Test in Ingestion Tester</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(sampleJson, `sample-${activeTab}`)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-2xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                          >
                            {copiedKey === `sample-${activeTab}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-500" />
                                <span>Copy Sample</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-300 text-xs font-mono overflow-x-auto max-h-56 leading-relaxed border border-slate-800">
                        {sampleJson}
                      </pre>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* COMBINED ARRAY SCHEMA VIEW */}
          {activeTab === 'combined' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-950 space-y-1.5">
                <h3 className="font-bold text-sm text-indigo-900">Combined Shift Event Feed Array</h3>
                <p>
                  Any shift data payload consumed by the Shift Handover Note Generator should be an array of objects
                  satisfying one of the 4 individual schemas (<code className="font-mono bg-indigo-100 px-1 py-0.5 rounded">ticketing</code>,{' '}
                  <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded">incident</code>,{' '}
                  <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded">chat</code>, or{' '}
                  <code className="font-mono bg-indigo-100 px-1 py-0.5 rounded">commit</code>).
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Full Feed Array Schema
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(JSON.stringify(COMBINED_FEED_SCHEMA, null, 2), 'combined-schema')
                    }
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-2xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  >
                    {copiedKey === 'combined-schema' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500" />
                        <span>Copy Full Schema</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed border border-slate-800">
                  {JSON.stringify(COMBINED_FEED_SCHEMA, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* LIVE INGESTION TESTER TAB */}
          {activeTab === 'tester' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs sm:text-sm font-bold text-emerald-900">
                      Live Feed Validator & Ingestion Engine
                    </h3>
                  </div>
                  <div className="flex items-center space-x-1.5 text-2xs">
                    <button
                      type="button"
                      onClick={() => handleLoadSampleInTester('ticketing')}
                      className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      + Ticket
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSampleInTester('incident')}
                      className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      + Incident
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadAllSamples}
                      className="px-2 py-0.5 rounded bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors"
                    >
                      + All 4 Feeds
                    </button>
                  </div>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Paste any JSON payload to validate it against the feed schemas. You can test custom ticketing alerts,
                  Slack logs, or Git commits and immediately inject them into the active shift events!
                </p>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
                  <span>Custom JSON Payload (Array or Object):</span>
                  {testerInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setTesterInput('');
                        setValidationResult(null);
                      }}
                      className="text-2xs text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={testerInput}
                  onChange={(e) => {
                    setTesterInput(e.target.value);
                    setValidationResult(null);
                  }}
                  rows={8}
                  placeholder={`[\n  {\n    "source": "ticketing",\n    "recordId": "OPS-9901",\n    "timestamp": "${new Date().toISOString()}",\n    "summary": "Custom task...",\n    "status": "In Progress",\n    "priority": "High (P2)"\n  }\n]`}
                  className="w-full p-3 font-mono text-xs text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Validation Action */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleValidateTester}
                  disabled={!testerInput.trim()}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-2xs transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Validate JSON Against Schemas</span>
                </button>

                {validationResult && validationResult.isValid && validationResult.events.length > 0 && onIngestCustomEvents && (
                  <button
                    type="button"
                    onClick={handleIngest}
                    className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors animate-in fade-in"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Ingest {validationResult.events.length} Event(s) into Active Shift</span>
                  </button>
                )}
              </div>

              {/* Validation Feedback */}
              {validationResult && (
                <div className="space-y-3 pt-2">
                  {/* Errors */}
                  {!validationResult.isValid && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                      <div className="flex items-center space-x-2 text-rose-800 font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Validation Failed ({validationResult.errors.length} error(s)):</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 font-mono text-2xs text-rose-800">
                        {validationResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {validationResult.warnings.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                      <div className="flex items-center space-x-2 text-amber-800 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Warnings / Non-fatal defaults applied ({validationResult.warnings.length}):</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 font-mono text-2xs text-amber-800">
                        {validationResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Success */}
                  {validationResult.isValid && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-emerald-800 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Schema Validation Passed! ({validationResult.events.length} valid events parsed)</span>
                        </div>
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5">
                        {validationResult.events.map((ev, i) => (
                          <div
                            key={i}
                            className="p-2 rounded-lg bg-white border border-emerald-200 flex items-center justify-between text-2xs"
                          >
                            <span className="font-bold text-slate-800">
                              [{ev.source.toUpperCase()}] {ev.recordId}: {ev.summary}
                            </span>
                            <span className="px-2 py-0.5 rounded font-mono text-3xs font-bold bg-slate-100 text-slate-700">
                              {ev.status} • {ev.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Supported feeds: Jira, ServiceNow, PagerDuty, Slack, Teams, GitHub, GitLab</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
