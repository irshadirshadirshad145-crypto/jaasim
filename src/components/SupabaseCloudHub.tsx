import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Database,
  ShieldCheck,
  Key,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Lock,
  UserCheck,
  LogOut,
  ExternalLink,
  Eye,
  EyeOff,
  Server,
  Layers,
  FileCode,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  saveSupabaseCredentials,
  testSupabaseConnection,
  getCurrentSupabaseUser,
  signInWithSupabase,
  signUpWithSupabase,
  signOutSupabase,
  SUPABASE_SCHEMA_SQL,
} from '../utils/supabaseClient';
import {
  fetchDatabaseCounts,
  getLocalTableRecords,
} from '../services/supabaseService';
import { User } from '@supabase/supabase-js';

interface SupabaseCloudHubProps {
  showToast: (msg: string) => void;
}

export const SupabaseCloudHub: React.FC<SupabaseCloudHubProps> = ({ showToast }) => {
  // Credentials state
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    tablesFound?: boolean;
  } | null>(null);

  // Database stats state
  const [dbStats, setDbStats] = useState<{
    handoversCount: number;
    tasksCount: number;
    blockersCount: number;
    escalationsCount: number;
    incidentsCount: number;
    isLiveSupabase: boolean;
  }>({
    handoversCount: 0,
    tasksCount: 0,
    blockersCount: 0,
    escalationsCount: 0,
    incidentsCount: 0,
    isLiveSupabase: false,
  });

  // Table inspector state
  const [selectedTable, setSelectedTable] = useState<
    'handovers' | 'tasks' | 'blockers' | 'escalations' | 'incidents'
  >('handovers');
  const [tableRecords, setTableRecords] = useState<any[]>([]);
  const [recordsSearch, setRecordsSearch] = useState('');

  // Optional Auth state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // SQL Copy state
  const [copiedSql, setCopiedSql] = useState(false);

  // Sub-tabs in Cloud Hub
  const [hubTab, setHubTab] = useState<'status' | 'inspector' | 'rls' | 'auth'>('status');

  // Load initial credentials & status
  useEffect(() => {
    const creds = getSupabaseCredentials();
    setUrlInput(creds.url);
    setKeyInput(creds.anonKey);
    refreshData();
  }, []);

  const refreshData = async () => {
    const counts = await fetchDatabaseCounts();
    setDbStats(counts);

    const user = await getCurrentSupabaseUser();
    setAuthUser(user);

    loadTableRecords(selectedTable);
  };

  const loadTableRecords = (table: 'handovers' | 'tasks' | 'blockers' | 'escalations' | 'incidents') => {
    const records = getLocalTableRecords(table);
    setTableRecords(records || []);
  };

  useEffect(() => {
    loadTableRecords(selectedTable);
  }, [selectedTable]);

  // Handle Save Credentials
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    saveSupabaseCredentials(urlInput, keyInput);

    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      showToast('Supabase connection verified successfully!');
    } else {
      showToast('Credentials saved. Fallback local cache active.');
    }

    refreshData();
  };

  // Test connection manually
  const handleTestPing = async () => {
    setIsTesting(true);
    const res = await testSupabaseConnection();
    setTestResult(res);
    setIsTesting(false);
    showToast(res.message);
  };

  // Copy SQL script
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    showToast('Copied Supabase RLS Schema SQL to clipboard!');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Optional Auth submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      showToast('Please enter both email and password.');
      return;
    }

    setIsAuthLoading(true);
    if (authMode === 'signin') {
      const res = await signInWithSupabase(authEmail, authPassword);
      showToast(res.message);
      if (res.success && res.user) {
        setAuthUser(res.user);
        setAuthEmail('');
        setAuthPassword('');
      }
    } else {
      const res = await signUpWithSupabase(authEmail, authPassword);
      showToast(res.message);
      if (res.success && res.user) {
        setAuthUser(res.user);
        setAuthEmail('');
        setAuthPassword('');
      }
    }
    setIsAuthLoading(false);
  };

  const handleSignOut = async () => {
    await signOutSupabase();
    setAuthUser(null);
    showToast('Signed out of Supabase.');
  };

  const filteredRecords = tableRecords.filter((rec) => {
    const text = JSON.stringify(rec).toLowerCase();
    return text.includes(recordsSearch.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHubTab('status')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              hubTab === 'status'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Connection & Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => setHubTab('inspector')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              hubTab === 'inspector'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Table Inspector</span>
          </button>

          <button
            type="button"
            onClick={() => setHubTab('rls')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              hubTab === 'rls'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RLS & SQL Schema</span>
          </button>

          <button
            type="button"
            onClick={() => setHubTab('auth')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              hubTab === 'auth'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Operator Auth (Optional)</span>
            {authUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={refreshData}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">
            Handovers
          </div>
          <div className="text-xl font-bold text-slate-100 mt-1">
            {dbStats.handoversCount}
          </div>
          <div className="text-3xs text-indigo-400 font-mono mt-0.5">public.handovers</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">
            Shift Tasks
          </div>
          <div className="text-xl font-bold text-slate-100 mt-1">
            {dbStats.tasksCount}
          </div>
          <div className="text-3xs text-sky-400 font-mono mt-0.5">public.handover_tasks</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">
            Blockers
          </div>
          <div className="text-xl font-bold text-rose-300 mt-1">
            {dbStats.blockersCount}
          </div>
          <div className="text-3xs text-rose-400 font-mono mt-0.5">public.blockers</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs">
          <div className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">
            Escalations
          </div>
          <div className="text-xl font-bold text-amber-300 mt-1">
            {dbStats.escalationsCount}
          </div>
          <div className="text-3xs text-amber-400 font-mono mt-0.5">public.escalations</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-3xs font-semibold text-slate-400 uppercase tracking-wider">
            Incidents
          </div>
          <div className="text-xl font-bold text-indigo-300 mt-1">
            {dbStats.incidentsCount}
          </div>
          <div className="text-3xs text-indigo-400 font-mono mt-0.5">public.incidents</div>
        </div>
      </div>

      {/* TAB 1: STATUS & CONNECTION CONFIG */}
      {hubTab === 'status' && (
        <div className="space-y-6">
          {/* Connection Status Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    dbStats.isLiveSupabase
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100">
                      Supabase Cloud Storage Engine
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-semibold uppercase ${
                        dbStats.isLiveSupabase
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {dbStats.isLiveSupabase ? 'Cloud Live' : 'Offline / Local Cache Mode'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {dbStats.isLiveSupabase
                      ? 'Connected to remote Supabase project with Row Level Security (RLS) active.'
                      : 'Running in safe local fallback mode. Handovers are persistently cached in the browser and will never fail to generate.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestPing}
                disabled={isTesting}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTesting ? 'animate-spin text-indigo-400' : ''}`} />
                <span>{isTesting ? 'Testing Latency...' : 'Test Connection'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-4 p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border border-emerald-900/60 text-emerald-300'
                    : 'bg-amber-950/40 border border-amber-900/60 text-amber-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold">{testResult.message}</span>
                  {testResult.latencyMs !== undefined && (
                    <span className="ml-2 font-mono text-3xs">({testResult.latencyMs}ms roundtrip)</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Credentials Configuration Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Project Credentials & Keys</span>
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Enter your Supabase Project URL and Anon Public Key. You can find these in your Supabase Dashboard under <strong>Project Settings → API</strong>.
            </p>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div>
                <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://your-project.supabase.co"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-2xs font-semibold text-slate-300 uppercase tracking-wider">
                    Supabase Anon / Public API Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="text-3xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showKey ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('');
                    setKeyInput('');
                    saveSupabaseCredentials('', '');
                    showToast('Credentials cleared. Switched to Local Cache mode.');
                    refreshData();
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                >
                  Clear & Use Local Storage
                </button>

                <button
                  type="submit"
                  disabled={isTesting}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  <span>Save & Connect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: TABLE INSPECTOR */}
      {hubTab === 'inspector' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Table selector buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {(['handovers', 'tasks', 'blockers', 'escalations', 'incidents'] as const).map(
                (tbl) => (
                  <button
                    key={tbl}
                    type="button"
                    onClick={() => setSelectedTable(tbl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedTable === tbl
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                    }`}
                  >
                    public.{tbl}
                  </button>
                )
              )}
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder={`Search in ${selectedTable}...`}
              value={recordsSearch}
              onChange={(e) => setRecordsSearch(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500"
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-950 border-b border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>
                Table: <code className="text-indigo-400 font-mono">public.{selectedTable}</code>
              </span>
              <span className="text-slate-500 font-mono text-3xs">
                {filteredRecords.length} record(s) loaded
              </span>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No records found in public.{selectedTable}. Save a handover note to populate tables.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Timestamp / Date</th>
                      <th className="p-3">Summary / Title</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Raw JSON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-2xs">
                    {filteredRecords.slice(0, 50).map((row, idx) => (
                      <tr key={row.id || idx} className="hover:bg-slate-850/50 transition-colors">
                        <td className="p-3 text-slate-400 truncate max-w-[120px]">
                          {row.id ? String(row.id).slice(0, 8) + '...' : '-'}
                        </td>
                        <td className="p-3 text-slate-300 whitespace-nowrap">
                          {row.created_at ? new Date(row.created_at).toLocaleTimeString() : row.shift_date || '-'}
                        </td>
                        <td className="p-3 text-slate-200 font-sans truncate max-w-xs">
                          {row.summary || row.title || row.employee_name || '-'}
                        </td>
                        <td className="p-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-3xs">
                            {row.status || row.impact_level || 'Logged'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(row, null, 2));
                              showToast('Record JSON copied to clipboard!');
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-3xs font-sans"
                          >
                            Copy
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RLS & SQL SCHEMA */}
      {hubTab === 'rls' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Row Level Security (RLS) & Table Creation Script</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Execute this idempotent DDL script in your Supabase project's SQL Editor to set up all 5 tables and RLS security policies.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-xs"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-300" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1.5" />
                    <span>Copy SQL Script</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick 3-step guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-3xs font-bold text-indigo-400 uppercase">Step 1</span>
                <p className="text-xs text-slate-200 mt-1 font-medium">Open Supabase Dashboard</p>
                <p className="text-3xs text-slate-400 mt-0.5">
                  Go to your Supabase project → click <strong>SQL Editor</strong> in the left sidebar.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-3xs font-bold text-indigo-400 uppercase">Step 2</span>
                <p className="text-xs text-slate-200 mt-1 font-medium">Paste & Run Script</p>
                <p className="text-3xs text-slate-400 mt-0.5">
                  Click <strong>New query</strong>, paste this script, and click <strong>Run</strong>.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-3xs font-bold text-indigo-400 uppercase">Step 3</span>
                <p className="text-xs text-slate-200 mt-1 font-medium">Automatic RLS Protection</p>
                <p className="text-3xs text-slate-400 mt-0.5">
                  Tables, foreign key cascades, and RLS policies are applied immediately.
                </p>
              </div>
            </div>

            {/* SQL Code block */}
            <div className="relative mt-2">
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-3xs font-mono text-indigo-300 overflow-x-auto max-h-96 leading-relaxed">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OPTIONAL AUTHENTICATION */}
      {hubTab === 'auth' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xs">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Optional Supabase Authentication</span>
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Shift handover generation remains fully operational without logging in. Signing in links saved handovers directly to your Supabase User ID for strict personal RLS policies.
            </p>

            {authUser ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-3xs font-semibold uppercase text-emerald-400">
                      Logged in Operator
                    </span>
                    <p className="text-xs font-bold text-slate-100">{authUser.email}</p>
                    <p className="text-3xs font-mono text-slate-400">UID: {authUser.id}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-3 max-w-md">
                <div className="flex items-center gap-2 pb-2">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className={`px-3 py-1 rounded-md text-xs font-medium ${
                      authMode === 'signin'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`px-3 py-1 rounded-md text-xs font-medium ${
                      authMode === 'signup'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Register / Sign Up
                  </button>
                </div>

                <div>
                  <label className="block text-3xs font-semibold text-slate-400 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="operator@ops.corp"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-3xs font-semibold text-slate-400 uppercase mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <span>
                    {isAuthLoading
                      ? 'Authenticating...'
                      : authMode === 'signin'
                      ? 'Sign In to Supabase'
                      : 'Create Account'}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
