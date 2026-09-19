import { ShiftEvent, SourceType, EventStatus, PrioritySeverity } from '../types';

/**
 * JSON Input Schemas & Specifications for the 4 Telemetry Feeds:
 * 1. Ticketing (Jira / ServiceNow / Linear / Zendesk)
 * 2. Incident Log (PagerDuty / Opsgenie / Datadog Incident)
 * 3. Chat (Slack / Microsoft Teams / Mattermost)
 * 4. Commit (GitHub / GitLab / Bitbucket)
 */

export interface FeedSchemaDefinition {
  source: SourceType;
  title: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  schemaObject: Record<string, unknown>;
  samplePayload: ShiftEvent;
}

export const TICKETING_SCHEMA: FeedSchemaDefinition = {
  source: 'ticketing',
  title: 'Ticketing Feed JSON Schema',
  description: 'Ingests tasks, service requests, operational bugs, and work items from Jira, ServiceNow, or Linear.',
  requiredFields: ['source', 'recordId', 'timestamp', 'summary', 'status', 'priority'],
  optionalFields: ['service', 'assignee', 'details', 'actionRequired', 'handoffNotes'],
  schemaObject: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://shift-handover.internal/schemas/ticketing.json',
    title: 'TicketingEvent',
    type: 'object',
    required: ['source', 'recordId', 'timestamp', 'summary', 'status', 'priority'],
    properties: {
      source: {
        type: 'string',
        enum: ['ticketing'],
        description: 'Source identifier. Must strictly be "ticketing".',
      },
      recordId: {
        type: 'string',
        pattern: '^[A-Z0-9]+-[0-9]+$',
        description: 'Unique ticket identifier (e.g. "OPS-8921", "JIRA-402").',
      },
      timestamp: {
        oneOf: [
          { type: 'string', format: 'date-time', description: 'ISO 8601 UTC timestamp' },
          { type: 'string', description: 'Standard formatted date: "YYYY-MM-DD HH:mm:ss"' },
          { type: 'number', description: 'UNIX epoch timestamp in seconds or milliseconds' },
        ],
        description: 'Time when the ticket was created or last updated in shift window.',
      },
      summary: {
        type: 'string',
        minLength: 5,
        maxLength: 250,
        description: 'Brief, clear summary of the ticket subject.',
      },
      status: {
        type: 'string',
        enum: ['Open', 'In Progress', 'Investigating', 'Mitigated', 'Resolved', 'Closed'],
        description: 'Current ticket lifecycle state.',
      },
      priority: {
        type: 'string',
        enum: ['Critical (P1)', 'High (P2)', 'Medium (P3)', 'Low (P4)'],
        description: 'Ticket urgency and business impact rating.',
      },
      service: {
        type: 'string',
        description: 'Target component or microservice (e.g. "Payment Gateway", "Auth Service").',
      },
      assignee: {
        type: 'string',
        description: 'Primary engineer or team currently assigned.',
      },
      details: {
        type: 'string',
        description: 'Technical context, diagnostic steps taken, or root cause hypothesis.',
      },
      actionRequired: {
        type: 'boolean',
        description: 'Flag indicating oncoming shift must take proactive action.',
      },
      handoffNotes: {
        type: 'string',
        description: 'Direct verbal or tactical handoff guidance for the next shift engineer.',
      },
    },
    additionalProperties: true,
  },
  samplePayload: {
    source: 'ticketing',
    recordId: 'OPS-8921',
    timestamp: '2026-09-08T14:15:00Z',
    summary: 'Payment Gateway Stripe Webhook Timeout Spike (EU Cluster)',
    status: 'Resolved',
    priority: 'Medium (P3)',
    service: 'Payment Gateway',
    assignee: 'Alex Chen',
    details: 'Deployed patch to webhook worker queue pool. Retried 412 queued events with zero loss.',
    actionRequired: false,
    handoffNotes: 'Check Datadog payment webhook latency chart at 18:00 UTC.',
  },
};

export const INCIDENT_SCHEMA: FeedSchemaDefinition = {
  source: 'incident',
  title: 'Incident Log JSON Schema',
  description: 'Ingests service alerts, outages, on-call escalations, and pager events from PagerDuty, Opsgenie, or Datadog.',
  requiredFields: ['source', 'recordId', 'timestamp', 'summary', 'status', 'priority'],
  optionalFields: ['service', 'assignee', 'details', 'actionRequired', 'handoffNotes'],
  schemaObject: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://shift-handover.internal/schemas/incident.json',
    title: 'IncidentEvent',
    type: 'object',
    required: ['source', 'recordId', 'timestamp', 'summary', 'status', 'priority'],
    properties: {
      source: {
        type: 'string',
        enum: ['incident'],
        description: 'Source identifier. Must strictly be "incident".',
      },
      recordId: {
        type: 'string',
        pattern: '^INC-[0-9]+$',
        description: 'Unique incident identifier (e.g. "INC-4091").',
      },
      timestamp: {
        oneOf: [
          { type: 'string', format: 'date-time' },
          { type: 'string' },
          { type: 'number' },
        ],
        description: 'Timestamp of alert trigger, escalation, or status progression.',
      },
      summary: {
        type: 'string',
        description: 'Incident title detailing impacted system or symptom.',
      },
      status: {
        type: 'string',
        enum: ['Investigating', 'In Progress', 'Mitigated', 'Resolved', 'Closed'],
        description: 'Current incident management response phase.',
      },
      priority: {
        type: 'string',
        enum: ['Critical (P1)', 'High (P2)', 'Medium (P3)', 'Low (P4)'],
        description: 'Incident severity. Critical (P1) routes directly to Section 3: Blockers.',
      },
      service: {
        type: 'string',
        description: 'Impacted infrastructure or user-facing service.',
      },
      assignee: {
        type: 'string',
        description: 'Incident commander or primary on-call responder.',
      },
      details: {
        type: 'string',
        description: 'Incident diagnostics, blast radius, error percentages, or mitigations applied.',
      },
      actionRequired: {
        type: 'boolean',
        description: 'Whether immediate monitoring or follow-up action is required.',
      },
      handoffNotes: {
        type: 'string',
        description: 'Specific on-call handoff instructions.',
      },
    },
  },
  samplePayload: {
    source: 'incident',
    recordId: 'INC-4091',
    timestamp: '2026-09-08T11:30:00Z',
    summary: 'PostgreSQL Read Replica Replication Lag Exceeding 120s',
    status: 'Resolved',
    priority: 'Critical (P1)',
    service: 'Database Cluster',
    assignee: 'Sarah Miller',
    details: 'Vacuum stall on billing transactions table cleared. Replication lag normalized to 0.4s.',
    actionRequired: false,
    handoffNotes: 'Ensure long-running cron report on read replica-02 does not re-trigger vacuum lock.',
  },
};

export const CHAT_SCHEMA: FeedSchemaDefinition = {
  source: 'chat',
  title: 'Ops Chat Feed JSON Schema',
  description: 'Ingests discussions, acknowledgments, status reports, and on-call notes from Slack (#ops, #incident-bridge) or Microsoft Teams.',
  requiredFields: ['source', 'recordId', 'timestamp', 'summary', 'status', 'priority'],
  optionalFields: ['service', 'assignee', 'details', 'actionRequired', 'handoffNotes'],
  schemaObject: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://shift-handover.internal/schemas/chat.json',
    title: 'ChatEvent',
    type: 'object',
    required: ['source', 'recordId', 'timestamp', 'summary', 'status', 'priority'],
    properties: {
      source: {
        type: 'string',
        enum: ['chat'],
        description: 'Source identifier. Must strictly be "chat".',
      },
      recordId: {
        type: 'string',
        description: 'Unique message or thread reference ID (e.g. "CHAT-9002" or Slack ts).',
      },
      timestamp: {
        oneOf: [
          { type: 'string', format: 'date-time' },
          { type: 'string', pattern: '^\\d+(\\.\\d+)?$', description: 'Slack decimal epoch string e.g. "1788421800.000214"' },
          { type: 'number' },
        ],
        description: 'Message timestamp.',
      },
      summary: {
        type: 'string',
        description: 'Channel context and key message takeaway.',
      },
      status: {
        type: 'string',
        enum: ['Open', 'In Progress', 'Investigating', 'Mitigated', 'Resolved', 'Closed'],
      },
      priority: {
        type: 'string',
        enum: ['Critical (P1)', 'High (P2)', 'Medium (P3)', 'Low (P4)'],
      },
      service: {
        type: 'string',
      },
      assignee: {
        type: 'string',
        description: 'Author or mentioned on-call engineer.',
      },
      details: {
        type: 'string',
        description: 'Full chat excerpt or thread link.',
      },
    },
  },
  samplePayload: {
    source: 'chat',
    recordId: 'CHAT-9002',
    timestamp: '1788421800.000214',
    summary: 'Slack #ops-infra: Memory utilization on k8s-worker-pool-04 elevated at 88%',
    status: 'In Progress',
    priority: 'High (P2)',
    service: 'Kubernetes Cluster',
    assignee: 'David K.',
    details: 'Thread in #ops-infra discussing memory headroom before European traffic peak.',
    actionRequired: true,
    handoffNotes: 'If worker pool node 04 exceeds 92%, trigger manual pod drain.',
  },
};

export const COMMIT_SCHEMA: FeedSchemaDefinition = {
  source: 'commit',
  title: 'Commit / Deployment Feed JSON Schema',
  description: 'Ingests merged pull requests, hotfixes, CI/CD deploys, and config changes from GitHub or GitLab.',
  requiredFields: ['source', 'recordId', 'timestamp', 'summary', 'status', 'priority'],
  optionalFields: ['service', 'assignee', 'details', 'actionRequired', 'handoffNotes'],
  schemaObject: {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://shift-handover.internal/schemas/commit.json',
    title: 'CommitEvent',
    type: 'object',
    required: ['source', 'recordId', 'timestamp', 'summary', 'status', 'priority'],
    properties: {
      source: {
        type: 'string',
        enum: ['commit'],
        description: 'Source identifier. Must strictly be "commit".',
      },
      recordId: {
        type: 'string',
        description: 'Git commit SHA or tracking ID (e.g. "GIT-7782" or "8f2a1b9").',
      },
      timestamp: {
        oneOf: [
          { type: 'string', format: 'date-time' },
          { type: 'string' },
          { type: 'number' },
        ],
        description: 'Commit author date or merge timestamp.',
      },
      summary: {
        type: 'string',
        description: 'Conventional commit message (e.g. "fix(auth): renew revoked oauth token TTL").',
      },
      status: {
        type: 'string',
        enum: ['Merged', 'Open', 'In Progress', 'Resolved', 'Closed'],
      },
      priority: {
        type: 'string',
        enum: ['Critical (P1)', 'High (P2)', 'Medium (P3)', 'Low (P4)'],
      },
      service: {
        type: 'string',
      },
      assignee: {
        type: 'string',
        description: 'Commit author or deploying engineer.',
      },
      details: {
        type: 'string',
        description: 'PR description, deploy target environment, or CI pipeline status.',
      },
    },
  },
  samplePayload: {
    source: 'commit',
    recordId: 'GIT-7782',
    timestamp: '2026-09-08T15:40:00Z',
    summary: 'fix(auth): renew revoked oauth token cache TTL to prevent 401 loop',
    status: 'Merged',
    priority: 'Medium (P3)',
    service: 'Authentication API',
    assignee: 'Alex Chen',
    details: 'Hotfix merged to main and rolled out across production edge cluster with zero downtime.',
    actionRequired: false,
    handoffNotes: 'Monitor auth 401 error rate in Grafana to verify fix.',
  },
};

export const ALL_SCHEMAS: Record<SourceType, FeedSchemaDefinition> = {
  ticketing: TICKETING_SCHEMA,
  incident: INCIDENT_SCHEMA,
  chat: CHAT_SCHEMA,
  commit: COMMIT_SCHEMA,
};

export const COMBINED_FEED_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://shift-handover.internal/schemas/shift-feed.json',
  title: 'ShiftHandoverFeedArray',
  description: 'Array of telemetry events across ticketing, incidents, chat, and commits for a shift window.',
  type: 'array',
  items: {
    oneOf: [
      TICKETING_SCHEMA.schemaObject,
      INCIDENT_SCHEMA.schemaObject,
      CHAT_SCHEMA.schemaObject,
      COMMIT_SCHEMA.schemaObject,
    ],
  },
};

/**
 * Validates a raw JSON string or object against feed requirements.
 * Returns structured validation result with any formatting or required field errors.
 */
export interface ValidationResult {
  isValid: boolean;
  events: ShiftEvent[];
  errors: string[];
  warnings: string[];
}

export function validateFeedPayload(rawInput: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedEvents: ShiftEvent[] = [];

  if (!rawInput || !rawInput.trim()) {
    return {
      isValid: false,
      events: [],
      errors: ['Input payload is empty. Please provide a JSON array of events.'],
      warnings: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawInput);
  } catch (err: unknown) {
    return {
      isValid: false,
      events: [],
      errors: [`JSON Syntax Error: ${err instanceof Error ? err.message : 'Invalid JSON formatting'}`],
      warnings: [],
    };
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];

  if (items.length === 0) {
    warnings.push('Input is an empty array: 0 events detected.');
    return {
      isValid: true,
      events: [],
      errors: [],
      warnings,
    };
  }

  items.forEach((item, index) => {
    const itemPrefix = `Item #${index + 1}`;
    if (typeof item !== 'object' || item === null) {
      errors.push(`${itemPrefix}: Must be a JSON object.`);
      return;
    }

    const obj = item as Record<string, unknown>;

    // 1. Source check
    if (!obj.source || typeof obj.source !== 'string') {
      errors.push(`${itemPrefix}: Missing required field "source".`);
    } else if (!['ticketing', 'incident', 'chat', 'commit'].includes(obj.source)) {
      errors.push(`${itemPrefix}: Invalid "source" "${obj.source}". Must be one of: ticketing, incident, chat, commit.`);
    }

    // 2. Record ID check
    if (!obj.recordId || typeof obj.recordId !== 'string' || !obj.recordId.trim()) {
      errors.push(`${itemPrefix}: Missing or empty required field "recordId".`);
    }

    // 3. Timestamp check
    if (obj.timestamp === undefined || obj.timestamp === null) {
      errors.push(`${itemPrefix}: Missing required field "timestamp".`);
    } else if (typeof obj.timestamp !== 'string' && typeof obj.timestamp !== 'number') {
      errors.push(`${itemPrefix}: "timestamp" must be an ISO string, date string, or epoch number.`);
    }

    // 4. Summary check
    if (!obj.summary || typeof obj.summary !== 'string' || !obj.summary.trim()) {
      errors.push(`${itemPrefix}: Missing or empty required field "summary".`);
    }

    // 5. Status check
    const validStatuses: EventStatus[] = [
      'Open',
      'In Progress',
      'Investigating',
      'Mitigated',
      'Resolved',
      'Closed',
      'Merged',
    ];
    let status: EventStatus = 'Open';
    if (!obj.status || typeof obj.status !== 'string') {
      warnings.push(`${itemPrefix} [${obj.recordId || 'Unknown'}]: Missing "status", defaulting to "Open".`);
    } else {
      const match = validStatuses.find((s) => s.toLowerCase() === (obj.status as string).toLowerCase());
      if (match) {
        status = match;
      } else {
        warnings.push(`${itemPrefix}: Unrecognized status "${obj.status}", defaulting to "In Progress".`);
        status = 'In Progress';
      }
    }

    // 6. Priority check
    const validPriorities: PrioritySeverity[] = [
      'Critical (P1)',
      'High (P2)',
      'Medium (P3)',
      'Low (P4)',
    ];
    let priority: PrioritySeverity = 'Medium (P3)';
    if (!obj.priority || typeof obj.priority !== 'string') {
      warnings.push(`${itemPrefix} [${obj.recordId || 'Unknown'}]: Missing "priority", defaulting to "Medium (P3)".`);
    } else {
      const match = validPriorities.find((p) => p.toLowerCase().includes((obj.priority as string).toLowerCase()));
      if (match) {
        priority = match;
      } else {
        priority = 'Medium (P3)';
      }
    }

    if (errors.length === 0 || errors.filter((e) => e.startsWith(itemPrefix)).length === 0) {
      parsedEvents.push({
        source: obj.source as SourceType,
        recordId: String(obj.recordId),
        timestamp: obj.timestamp as string | number,
        summary: String(obj.summary),
        status,
        priority,
        service: obj.service ? String(obj.service) : undefined,
        assignee: obj.assignee ? String(obj.assignee) : undefined,
        details: obj.details ? String(obj.details) : undefined,
        actionRequired: Boolean(obj.actionRequired),
        handoffNotes: obj.handoffNotes ? String(obj.handoffNotes) : undefined,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    events: parsedEvents,
    errors,
    warnings,
  };
}
