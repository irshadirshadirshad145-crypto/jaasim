export type SourceType = 'ticketing' | 'incident' | 'chat' | 'commit';

export type AppPage = 'dashboard' | 'setup' | 'review' | 'handover' | 'export' | 'validation' | 'admin' | 'history';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permission: 'Admin' | 'Lead' | 'Operator' | 'Auditor';
  status: 'Active' | 'On-Duty' | 'Off-Duty' | 'Suspended';
  shiftTrack: string;
  lastActive: string;
}

export interface AdminSystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'audit' | 'warning' | 'error';
  actor: string;
  module: 'Ingestion' | 'Deduplication' | 'Pipeline' | 'Security' | 'Export' | 'Config';
  action: string;
  details?: string;
}

export type PrioritySeverity = 'Critical (P1)' | 'High (P2)' | 'Medium (P3)' | 'Low (P4)';

export type EventStatus =
  | 'Open'
  | 'In Progress'
  | 'Investigating'
  | 'Mitigated'
  | 'Resolved'
  | 'Closed'
  | 'Merged';

export type HandoverCategory = 'COMPLETED' | 'IN_PROGRESS' | 'BLOCKERS' | 'WATCH_LIST';

export interface ShiftEvent {
  source: SourceType;
  recordId: string;
  timestamp: string | number; // ISO 8601, formatted date string, or epoch
  summary: string;
  status: EventStatus;
  priority: PrioritySeverity;
  service?: string;
  assignee?: string;
  details?: string;
  actionRequired?: boolean;
  handoffNotes?: string;
  isCarriedForward?: boolean;
  carriedFromShift?: string;
  originalShiftStatus?: EventStatus;
}

export interface ProcessedActivity {
  source: SourceType;
  recordId: string;
  rawTimestamp: string | number;
  normalizedTimestamp: string; // ISO 8601 UTC
  displayTimestamp: string;    // Human-readable formatted string
  parsedTimestampMs: number;
  summary: string;
  status: EventStatus;
  priority: PrioritySeverity;
  category: HandoverCategory;
  service?: string;
  assignee?: string;
  details?: string;
  actionRequired?: boolean;
  handoffNotes?: string;
  updateCount: number;         // Number of merged duplicate events
  isCarriedForward?: boolean;  // Flagged by Orphaned Task Detector
  carriedFromShift?: string;   // Label of preceding shift window
  originalShiftStatus?: EventStatus;
}

export interface ProcessingLog {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  recordId?: string;
  source?: SourceType;
  rawTimestamp?: string | number;
}

export interface DataProcessingResult {
  activities: ProcessedActivity[];
  categorized: Record<HandoverCategory, ProcessedActivity[]>;
  stats: {
    totalEvaluated: number;
    inWindowCount: number;
    outOfWindowCount: number;
    deduplicatedCount: number;
    malformedSkippedCount: number;
    sourceDeselectedCount: number;
    carriedForwardCount: number; // Orphaned tasks carried forward from previous shift
    outOfOrderCount?: number;     // Number of out-of-order events handled
  };
  logs: ProcessingLog[];
}

export interface ShiftSetupConfig {
  employeeName: string;
  employeeRole: string;
  startDateTime: string; // "YYYY-MM-DDTHH:mm"
  endDateTime: string;   // "YYYY-MM-DDTHH:mm"
  selectedSources: {
    ticketing: boolean;
    incident: boolean;
    chat: boolean;
    commit: boolean;
  };
  enableOrphanedTaskDetector: boolean; // Review 2: Carries unresolved IN PROGRESS / BLOCKERS from previous shift
  overlapBufferMinutes?: number;       // Review 2: 0, 15, or 30 mins changeover cushion
}

export interface EditableHandoverItem {
  id: string;
  source: SourceType | 'manual';
  recordId: string;
  timestamp: string;
  status: string;
  summary: string;
  priority?: PrioritySeverity | string;
  notes?: string;
  isCarriedForward?: boolean;
  carriedFromShift?: string;
}

export interface EditableHandoverData {
  employeeName: string;
  employeeRole: string;
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
  autoCountSummary: string;
  summary: string;
  sections: {
    COMPLETED: EditableHandoverItem[];
    IN_PROGRESS: EditableHandoverItem[];
    BLOCKERS: EditableHandoverItem[];
    WATCH_LIST: EditableHandoverItem[];
  };
}

export interface HandoverReport {
  id: string;
  generatedAt: string;
  config: ShiftSetupConfig;
  events: ProcessedActivity[];
  categorized: Record<HandoverCategory, ProcessedActivity[]>;
  processingResult: DataProcessingResult;
  stats: {
    tickets: number;
    incidents: number;
    chats: number;
    commits: number;
    criticalCount: number;
    actionRequiredCount: number;
    resolvedCount: number;
    inProgressCount: number;
  };
  summary: string;
}

