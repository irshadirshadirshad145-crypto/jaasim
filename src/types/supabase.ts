import { HandoverCategory, PrioritySeverity, SourceType } from '../types';

export interface SupabaseHandoverRecord {
  id: string;
  created_at: string;
  employee_name: string;
  employee_role: string;
  shift_date: string;
  shift_start: string;
  shift_end: string;
  summary: string;
  auto_count_summary: string;
  raw_data?: Record<string, unknown>;
  user_id?: string | null;
  status: 'draft' | 'published' | 'archived';
  source_mode?: 'supabase' | 'local_fallback';
}

export interface SupabaseTaskRecord {
  id: string;
  handover_id: string;
  category: HandoverCategory;
  title: string;
  status: string;
  priority: PrioritySeverity | string;
  source: SourceType | 'manual';
  record_id: string;
  notes?: string;
  is_carried_forward: boolean;
  carried_from_shift?: string;
  created_at: string;
}

export interface SupabaseBlockerRecord {
  id: string;
  handover_id: string;
  summary: string;
  impact_level: string;
  owner?: string;
  escalated_to?: string;
  status: string;
  source: string;
  record_id: string;
  created_at: string;
}

export interface SupabaseEscalationRecord {
  id: string;
  handover_id: string;
  incident_id: string;
  urgency: string;
  summary: string;
  channel?: string;
  acknowledged_by?: string;
  source: string;
  created_at: string;
}

export interface SupabaseIncidentRecord {
  id: string;
  handover_id: string;
  service: string;
  severity: string;
  summary: string;
  resolution_status: string;
  record_id: string;
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastTested?: string;
  isUsingFallback: boolean;
}

export interface SupabaseSaveResult {
  success: boolean;
  handoverId: string;
  message: string;
  isLocalFallback: boolean;
  recordsSaved: {
    handovers: number;
    tasks: number;
    blockers: number;
    escalations: number;
    incidents: number;
  };
  error?: string;
}
