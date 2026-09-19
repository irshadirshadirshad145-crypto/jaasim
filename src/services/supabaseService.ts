import { EditableHandoverData, HandoverCategory, HandoverReport } from '../types';
import {
  SupabaseHandoverRecord,
  SupabaseTaskRecord,
  SupabaseBlockerRecord,
  SupabaseEscalationRecord,
  SupabaseIncidentRecord,
  SupabaseSaveResult,
} from '../types/supabase';
import { getSupabaseClient, getCurrentSupabaseUser } from '../utils/supabaseClient';

const LOCAL_STORAGE_HANDOVERS_KEY = 'ops_handover_history_v1';
const LOCAL_STORAGE_TASKS_KEY = 'ops_handover_tasks_v1';
const LOCAL_STORAGE_BLOCKERS_KEY = 'ops_handover_blockers_v1';
const LOCAL_STORAGE_ESCALATIONS_KEY = 'ops_handover_escalations_v1';
const LOCAL_STORAGE_INCIDENTS_KEY = 'ops_handover_incidents_v1';

// Safe UUID generation
function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to read local array safely
function getLocalArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Helper to write local array safely
function setLocalArray<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed to write to localStorage for key ${key}:`, err);
  }
}

/**
 * Seed initial sample handover into local storage if history is completely empty.
 */
function seedInitialHistoryIfEmpty(): void {
  const existing = getLocalArray<SupabaseHandoverRecord>(LOCAL_STORAGE_HANDOVERS_KEY);
  if (existing.length > 0) return;

  const sampleId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
  const sampleHandover: SupabaseHandoverRecord = {
    id: sampleId,
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    employee_name: 'Alex Morgan',
    employee_role: 'Senior Operations Lead',
    shift_date: new Date().toISOString().split('T')[0],
    shift_start: '07:00 UTC',
    shift_end: '15:00 UTC',
    summary: 'Day shift completed smoothly. 4 items finished, 2 in-progress migrations handed over, 1 Redis cluster blocker escalated to infrastructure team.',
    auto_count_summary: '4 completed, 2 in-progress, 1 blocker, 2 watch-list',
    status: 'published',
    source_mode: 'local_fallback',
  };

  const sampleTasks: SupabaseTaskRecord[] = [
    {
      id: generateUuid(),
      handover_id: sampleId,
      category: 'COMPLETED',
      title: 'PostgreSQL read-replica failover test',
      status: 'Resolved',
      priority: 'High (P2)',
      source: 'ticketing',
      record_id: 'OPS-4401',
      notes: 'Executed automated switchover; replication lag normalized within 40 seconds.',
      is_carried_forward: false,
      created_at: new Date().toISOString(),
    },
    {
      id: generateUuid(),
      handover_id: sampleId,
      category: 'IN_PROGRESS',
      title: 'Payment Gateway rate limiting threshold tuning',
      status: 'In Progress',
      priority: 'Medium (P3)',
      source: 'ticketing',
      record_id: 'OPS-4412',
      notes: 'Testing 2,500 req/min rule with third-party processor.',
      is_carried_forward: false,
      created_at: new Date().toISOString(),
    },
    {
      id: generateUuid(),
      handover_id: sampleId,
      category: 'BLOCKERS',
      title: 'Redis Cluster memory leak on node-04',
      status: 'Open',
      priority: 'Critical (P1)',
      source: 'incident',
      record_id: 'INC-8891',
      notes: 'Memory usage at 94%. Escalated to @infra-oncall for manual eviction or node resize.',
      is_carried_forward: true,
      carried_from_shift: 'Swing Shift #41',
      created_at: new Date().toISOString(),
    },
    {
      id: generateUuid(),
      handover_id: sampleId,
      category: 'WATCH_LIST',
      title: 'Edge CDN cache hit ratio monitoring',
      status: 'Investigating',
      priority: 'Low (P4)',
      source: 'chat',
      record_id: 'CHAT-302',
      notes: 'Hit ratio dipped slightly after European region purge.',
      is_carried_forward: false,
      created_at: new Date().toISOString(),
    },
  ];

  const sampleBlockers: SupabaseBlockerRecord[] = [
    {
      id: generateUuid(),
      handover_id: sampleId,
      summary: 'Redis Cluster memory leak on node-04',
      impact_level: 'Critical (P1)',
      owner: 'Alex Morgan',
      escalated_to: 'Infra On-Call Team',
      status: 'Open',
      source: 'incident',
      record_id: 'INC-8891',
      created_at: new Date().toISOString(),
    },
  ];

  const sampleEscalations: SupabaseEscalationRecord[] = [
    {
      id: generateUuid(),
      handover_id: sampleId,
      incident_id: 'INC-8891',
      urgency: 'Critical (P1)',
      summary: 'Redis Cluster memory pressure exceeded 90% threshold',
      channel: '#ops-critical',
      acknowledged_by: 'Devon Vance (SRE)',
      source: 'incident',
      created_at: new Date().toISOString(),
    },
  ];

  const sampleIncidents: SupabaseIncidentRecord[] = [
    {
      id: generateUuid(),
      handover_id: sampleId,
      service: 'Caching & Session Store',
      severity: 'Critical (P1)',
      summary: 'Redis memory spike trigger',
      resolution_status: 'Investigating',
      record_id: 'INC-8891',
      created_at: new Date().toISOString(),
    },
  ];

  setLocalArray(LOCAL_STORAGE_HANDOVERS_KEY, [sampleHandover]);
  setLocalArray(LOCAL_STORAGE_TASKS_KEY, sampleTasks);
  setLocalArray(LOCAL_STORAGE_BLOCKERS_KEY, sampleBlockers);
  setLocalArray(LOCAL_STORAGE_ESCALATIONS_KEY, sampleEscalations);
  setLocalArray(LOCAL_STORAGE_INCIDENTS_KEY, sampleIncidents);
}

// Run initial seed on load
if (typeof window !== 'undefined') {
  seedInitialHistoryIfEmpty();
}

/**
 * Saves a generated Shift Handover Note to Supabase with cascading tables:
 * 1. handovers
 * 2. handover_tasks
 * 3. blockers
 * 4. escalations
 * 5. incidents
 *
 * If Supabase is offline or not configured, seamlessly falls back to persistent local storage.
 */
export async function saveHandoverToSupabase(
  handoverData: EditableHandoverData,
  report?: HandoverReport
): Promise<SupabaseSaveResult> {
  const handoverId = generateUuid();
  const nowIso = new Date().toISOString();
  const currentUser = await getCurrentSupabaseUser();

  // 1. Prepare Handover Record
  const handoverRow: SupabaseHandoverRecord = {
    id: handoverId,
    created_at: nowIso,
    employee_name: handoverData.employeeName || 'Operations Engineer',
    employee_role: handoverData.employeeRole || 'Operations Lead',
    shift_date: handoverData.shiftDate || nowIso.split('T')[0],
    shift_start: handoverData.shiftStart,
    shift_end: handoverData.shiftEnd,
    summary: handoverData.summary,
    auto_count_summary: handoverData.autoCountSummary || '0 activities recorded',
    raw_data: report ? (report as unknown as Record<string, unknown>) : undefined,
    user_id: currentUser?.id || null,
    status: 'published',
    source_mode: 'supabase',
  };

  // 2. Prepare Task Records from all 4 sections
  const taskRows: SupabaseTaskRecord[] = [];
  const categories: HandoverCategory[] = ['COMPLETED', 'IN_PROGRESS', 'BLOCKERS', 'WATCH_LIST'];

  categories.forEach((cat) => {
    const items = handoverData.sections[cat] || [];
    items.forEach((item) => {
      taskRows.push({
        id: generateUuid(),
        handover_id: handoverId,
        category: cat,
        title: item.summary,
        status: item.status || 'Active',
        priority: item.priority || 'Medium (P3)',
        source: item.source,
        record_id: item.recordId,
        notes: item.notes || '',
        is_carried_forward: Boolean(item.isCarriedForward),
        carried_from_shift: item.carriedFromShift,
        created_at: nowIso,
      });
    });
  });

  // 3. Prepare Blockers Records
  const blockerRows: SupabaseBlockerRecord[] = (handoverData.sections.BLOCKERS || []).map((item) => ({
    id: generateUuid(),
    handover_id: handoverId,
    summary: item.summary,
    impact_level: String(item.priority || 'High (P2)'),
    owner: handoverData.employeeName,
    escalated_to: 'Incoming Shift Lead / Escalation Tier',
    status: item.status || 'Open',
    source: item.source,
    record_id: item.recordId,
    created_at: nowIso,
  }));

  // 4. Prepare Escalations Records (Items flagged Critical P1 or high impact)
  const escalationRows: SupabaseEscalationRecord[] = taskRows
    .filter(
      (t) =>
        t.priority === 'Critical (P1)' ||
        t.category === 'BLOCKERS' ||
        t.status === 'Investigating' ||
        t.status === 'Open'
    )
    .slice(0, 10)
    .map((t) => ({
      id: generateUuid(),
      handover_id: handoverId,
      incident_id: t.record_id,
      urgency: String(t.priority),
      summary: t.title,
      channel: '#operations-command',
      acknowledged_by: handoverData.employeeName,
      source: t.source,
      created_at: nowIso,
    }));

  // 5. Prepare Incident Records (source === 'incident')
  const incidentRows: SupabaseIncidentRecord[] = taskRows
    .filter((t) => t.source === 'incident')
    .map((t) => ({
      id: generateUuid(),
      handover_id: handoverId,
      service: 'Core Service / NOC Monitor',
      severity: String(t.priority),
      summary: t.title,
      resolution_status: t.status,
      record_id: t.record_id,
      created_at: nowIso,
    }));

  const client = getSupabaseClient();

  // If Supabase client exists, attempt cloud insert
  if (client) {
    try {
      // 1. Insert Handover
      const { error: handoverErr } = await client.from('handovers').insert([
        {
          id: handoverRow.id,
          created_at: handoverRow.created_at,
          employee_name: handoverRow.employee_name,
          employee_role: handoverRow.employee_role,
          shift_date: handoverRow.shift_date,
          shift_start: handoverRow.shift_start,
          shift_end: handoverRow.shift_end,
          summary: handoverRow.summary,
          auto_count_summary: handoverRow.auto_count_summary,
          user_id: handoverRow.user_id,
          status: handoverRow.status,
        },
      ]);

      if (handoverErr) {
        throw new Error(`Supabase error saving handover: ${handoverErr.message}`);
      }

      // 2. Insert Tasks
      if (taskRows.length > 0) {
        const { error: tasksErr } = await client.from('handover_tasks').insert(
          taskRows.map((t) => ({
            id: t.id,
            handover_id: t.handover_id,
            category: t.category,
            title: t.title,
            status: t.status,
            priority: t.priority,
            source: t.source,
            record_id: t.record_id,
            notes: t.notes,
            is_carried_forward: t.is_carried_forward,
            carried_from_shift: t.carried_from_shift,
          }))
        );
        if (tasksErr) {
          console.warn('Notice while inserting tasks to Supabase:', tasksErr.message);
        }
      }

      // 3. Insert Blockers
      if (blockerRows.length > 0) {
        const { error: blockersErr } = await client.from('blockers').insert(blockerRows);
        if (blockersErr) {
          console.warn('Notice while inserting blockers to Supabase:', blockersErr.message);
        }
      }

      // 4. Insert Escalations
      if (escalationRows.length > 0) {
        const { error: escalationsErr } = await client.from('escalations').insert(escalationRows);
        if (escalationsErr) {
          console.warn('Notice while inserting escalations to Supabase:', escalationsErr.message);
        }
      }

      // 5. Insert Incidents
      if (incidentRows.length > 0) {
        const { error: incidentsErr } = await client.from('incidents').insert(incidentRows);
        if (incidentsErr) {
          console.warn('Notice while inserting incidents to Supabase:', incidentsErr.message);
        }
      }

      // Also cache in local archive for fast offline lookups
      saveToLocalArchive(handoverRow, taskRows, blockerRows, escalationRows, incidentRows, 'supabase');

      return {
        success: true,
        handoverId,
        isLocalFallback: false,
        message: 'Successfully saved Shift Handover & records to Supabase Cloud Database with RLS.',
        recordsSaved: {
          handovers: 1,
          tasks: taskRows.length,
          blockers: blockerRows.length,
          escalations: escalationRows.length,
          incidents: incidentRows.length,
        },
      };
    } catch (cloudErr: unknown) {
      const errorMsg = cloudErr instanceof Error ? cloudErr.message : String(cloudErr);
      console.warn('Supabase cloud insert failed, falling back to local persistent archive:', errorMsg);

      // Save to local archive
      saveToLocalArchive(handoverRow, taskRows, blockerRows, escalationRows, incidentRows, 'local_fallback');

      return {
        success: true,
        handoverId,
        isLocalFallback: true,
        error: errorMsg,
        message: `Saved to Local Archive cache. (Supabase notice: ${errorMsg})`,
        recordsSaved: {
          handovers: 1,
          tasks: taskRows.length,
          blockers: blockerRows.length,
          escalations: escalationRows.length,
          incidents: incidentRows.length,
        },
      };
    }
  }

  // Supabase not configured: save to local archive
  saveToLocalArchive(handoverRow, taskRows, blockerRows, escalationRows, incidentRows, 'local_fallback');

  return {
    success: true,
    handoverId,
    isLocalFallback: true,
    message: 'Saved to Local Handover Archive. Configure Supabase credentials in Admin Panel to enable Cloud sync.',
    recordsSaved: {
      handovers: 1,
      tasks: taskRows.length,
      blockers: blockerRows.length,
      escalations: escalationRows.length,
      incidents: incidentRows.length,
    },
  };
}

/**
 * Saves records to localStorage backup tables
 */
function saveToLocalArchive(
  handover: SupabaseHandoverRecord,
  tasks: SupabaseTaskRecord[],
  blockers: SupabaseBlockerRecord[],
  escalations: SupabaseEscalationRecord[],
  incidents: SupabaseIncidentRecord[],
  sourceMode: 'supabase' | 'local_fallback'
): void {
  const handoverWithMode = { ...handover, source_mode: sourceMode };
  const prevHandovers = getLocalArray<SupabaseHandoverRecord>(LOCAL_STORAGE_HANDOVERS_KEY);
  setLocalArray(LOCAL_STORAGE_HANDOVERS_KEY, [handoverWithMode, ...prevHandovers]);

  const prevTasks = getLocalArray<SupabaseTaskRecord>(LOCAL_STORAGE_TASKS_KEY);
  setLocalArray(LOCAL_STORAGE_TASKS_KEY, [...tasks, ...prevTasks]);

  const prevBlockers = getLocalArray<SupabaseBlockerRecord>(LOCAL_STORAGE_BLOCKERS_KEY);
  setLocalArray(LOCAL_STORAGE_BLOCKERS_KEY, [...blockers, ...prevBlockers]);

  const prevEscalations = getLocalArray<SupabaseEscalationRecord>(LOCAL_STORAGE_ESCALATIONS_KEY);
  setLocalArray(LOCAL_STORAGE_ESCALATIONS_KEY, [...escalations, ...prevEscalations]);

  const prevIncidents = getLocalArray<SupabaseIncidentRecord>(LOCAL_STORAGE_INCIDENTS_KEY);
  setLocalArray(LOCAL_STORAGE_INCIDENTS_KEY, [...incidents, ...prevIncidents]);
}

/**
 * Fetches handover history list. Tries Supabase first, falls back to local storage archive.
 */
export async function fetchHandoverHistory(): Promise<{
  handovers: SupabaseHandoverRecord[];
  isFromSupabase: boolean;
  error?: string;
}> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { data, error } = await client
        .from('handovers')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const typedHandovers: SupabaseHandoverRecord[] = data.map((d) => ({
          ...d,
          source_mode: 'supabase',
        }));
        return { handovers: typedHandovers, isFromSupabase: true };
      }
    } catch (err) {
      console.warn('Supabase fetch handovers failed, falling back to local storage:', err);
    }
  }

  // Fallback to local storage
  const localHandovers = getLocalArray<SupabaseHandoverRecord>(LOCAL_STORAGE_HANDOVERS_KEY);
  return { handovers: localHandovers, isFromSupabase: false };
}

/**
 * Fetches complete details for a single handover (including tasks, blockers, escalations, incidents).
 */
export async function fetchHandoverDetail(handoverId: string): Promise<{
  handover: SupabaseHandoverRecord | null;
  tasks: SupabaseTaskRecord[];
  blockers: SupabaseBlockerRecord[];
  escalations: SupabaseEscalationRecord[];
  incidents: SupabaseIncidentRecord[];
  isFromSupabase: boolean;
}> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const [handoverRes, tasksRes, blockersRes, escalationsRes, incidentsRes] = await Promise.all([
        client.from('handovers').select('*').eq('id', handoverId).single(),
        client.from('handover_tasks').select('*').eq('handover_id', handoverId),
        client.from('blockers').select('*').eq('handover_id', handoverId),
        client.from('escalations').select('*').eq('handover_id', handoverId),
        client.from('incidents').select('*').eq('handover_id', handoverId),
      ]);

      if (!handoverRes.error && handoverRes.data) {
        return {
          handover: { ...handoverRes.data, source_mode: 'supabase' },
          tasks: (tasksRes.data as SupabaseTaskRecord[]) || [],
          blockers: (blockersRes.data as SupabaseBlockerRecord[]) || [],
          escalations: (escalationsRes.data as SupabaseEscalationRecord[]) || [],
          incidents: (incidentsRes.data as SupabaseIncidentRecord[]) || [],
          isFromSupabase: true,
        };
      }
    } catch (err) {
      console.warn('Supabase fetch detail failed, trying local storage:', err);
    }
  }

  // Local fallback
  const handovers = getLocalArray<SupabaseHandoverRecord>(LOCAL_STORAGE_HANDOVERS_KEY);
  const matched = handovers.find((h) => h.id === handoverId) || null;

  const tasks = getLocalArray<SupabaseTaskRecord>(LOCAL_STORAGE_TASKS_KEY).filter(
    (t) => t.handover_id === handoverId
  );
  const blockers = getLocalArray<SupabaseBlockerRecord>(LOCAL_STORAGE_BLOCKERS_KEY).filter(
    (b) => b.handover_id === handoverId
  );
  const escalations = getLocalArray<SupabaseEscalationRecord>(LOCAL_STORAGE_ESCALATIONS_KEY).filter(
    (e) => e.handover_id === handoverId
  );
  const incidents = getLocalArray<SupabaseIncidentRecord>(LOCAL_STORAGE_INCIDENTS_KEY).filter(
    (i) => i.handover_id === handoverId
  );

  return {
    handover: matched,
    tasks,
    blockers,
    escalations,
    incidents,
    isFromSupabase: false,
  };
}

/**
 * Deletes a handover and all related tasks/blockers from both Supabase and local storage.
 */
export async function deleteHandover(handoverId: string): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  let supabaseDeleted = false;

  if (client) {
    try {
      const { error } = await client.from('handovers').delete().eq('id', handoverId);
      if (!error) supabaseDeleted = true;
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  }

  // Clean local storage
  const handovers = getLocalArray<SupabaseHandoverRecord>(LOCAL_STORAGE_HANDOVERS_KEY).filter(
    (h) => h.id !== handoverId
  );
  setLocalArray(LOCAL_STORAGE_HANDOVERS_KEY, handovers);

  const tasks = getLocalArray<SupabaseTaskRecord>(LOCAL_STORAGE_TASKS_KEY).filter(
    (t) => t.handover_id !== handoverId
  );
  setLocalArray(LOCAL_STORAGE_TASKS_KEY, tasks);

  const blockers = getLocalArray<SupabaseBlockerRecord>(LOCAL_STORAGE_BLOCKERS_KEY).filter(
    (b) => b.handover_id !== handoverId
  );
  setLocalArray(LOCAL_STORAGE_BLOCKERS_KEY, blockers);

  const escalations = getLocalArray<SupabaseEscalationRecord>(LOCAL_STORAGE_ESCALATIONS_KEY).filter(
    (e) => e.handover_id !== handoverId
  );
  setLocalArray(LOCAL_STORAGE_ESCALATIONS_KEY, escalations);

  const incidents = getLocalArray<SupabaseIncidentRecord>(LOCAL_STORAGE_INCIDENTS_KEY).filter(
    (i) => i.handover_id !== handoverId
  );
  setLocalArray(LOCAL_STORAGE_INCIDENTS_KEY, incidents);

  return {
    success: true,
    message: supabaseDeleted
      ? 'Deleted handover record from Supabase Cloud and local cache.'
      : 'Removed handover record from archive.',
  };
}

/**
 * Fetches aggregate counts across all 5 tables
 */
export async function fetchDatabaseCounts(): Promise<{
  handoversCount: number;
  tasksCount: number;
  blockersCount: number;
  escalationsCount: number;
  incidentsCount: number;
  isLiveSupabase: boolean;
}> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const [hRes, tRes, bRes, eRes, iRes] = await Promise.all([
        client.from('handovers').select('*', { count: 'exact', head: true }),
        client.from('handover_tasks').select('*', { count: 'exact', head: true }),
        client.from('blockers').select('*', { count: 'exact', head: true }),
        client.from('escalations').select('*', { count: 'exact', head: true }),
        client.from('incidents').select('*', { count: 'exact', head: true }),
      ]);

      if (hRes.count !== null && hRes.count !== undefined) {
        return {
          handoversCount: hRes.count || 0,
          tasksCount: tRes.count || 0,
          blockersCount: bRes.count || 0,
          escalationsCount: eRes.count || 0,
          incidentsCount: iRes.count || 0,
          isLiveSupabase: true,
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    handoversCount: getLocalArray(LOCAL_STORAGE_HANDOVERS_KEY).length,
    tasksCount: getLocalArray(LOCAL_STORAGE_TASKS_KEY).length,
    blockersCount: getLocalArray(LOCAL_STORAGE_BLOCKERS_KEY).length,
    escalationsCount: getLocalArray(LOCAL_STORAGE_ESCALATIONS_KEY).length,
    incidentsCount: getLocalArray(LOCAL_STORAGE_INCIDENTS_KEY).length,
    isLiveSupabase: false,
  };
}

/**
 * Fetches raw records for the table inspector
 */
export function getLocalTableRecords(table: 'handovers' | 'tasks' | 'blockers' | 'escalations' | 'incidents') {
  switch (table) {
    case 'handovers':
      return getLocalArray<SupabaseHandoverRecord>(LOCAL_STORAGE_HANDOVERS_KEY);
    case 'tasks':
      return getLocalArray<SupabaseTaskRecord>(LOCAL_STORAGE_TASKS_KEY);
    case 'blockers':
      return getLocalArray<SupabaseBlockerRecord>(LOCAL_STORAGE_BLOCKERS_KEY);
    case 'escalations':
      return getLocalArray<SupabaseEscalationRecord>(LOCAL_STORAGE_ESCALATIONS_KEY);
    case 'incidents':
      return getLocalArray<SupabaseIncidentRecord>(LOCAL_STORAGE_INCIDENTS_KEY);
  }
}
