import { ShiftEvent, ShiftSetupConfig } from '../types';

// Helper to generate ISO timestamps relative to now in hours
const hoursAgoIso = (hours: number, minutes = 0): string => {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  d.setMinutes(d.getMinutes() - minutes);
  return d.toISOString();
};

// Helper to generate normal "YYYY-MM-DD HH:mm:ss" date string
const hoursAgoFormatted = (hours: number, minutes = 0): string => {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  d.setMinutes(d.getMinutes() - minutes);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// Helper to generate epoch milliseconds
const hoursAgoEpochMs = (hours: number, minutes = 0): number => {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  d.setMinutes(d.getMinutes() - minutes);
  return d.getTime();
};

// Helper to generate Slack-style decimal epoch string
const hoursAgoSlackTs = (hours: number, minutes = 0): string => {
  const ms = hoursAgoEpochMs(hours, minutes);
  return `${Math.floor(ms / 1000)}.000214`;
};

export const INITIAL_MOCK_EVENTS: ShiftEvent[] = [
  // -------------------------------------------------------------
  // INCIDENTS (Incident Log)
  // Demonstrating: ISO timestamps, normal date strings, duplicates & progressions
  // -------------------------------------------------------------
  // Earlier update of INC-4091 (to test deduplication -> should be superseded by the later Mitigated update)
  {
    source: 'incident',
    recordId: 'INC-4091',
    timestamp: hoursAgoFormatted(1, 45), // Normal "YYYY-MM-DD HH:mm:ss" format
    summary: 'Payment Webhook Service Elevated 504 Gateway Timeouts [Initial Alert]',
    status: 'Investigating',
    priority: 'Critical (P1)',
    service: 'Payment Gateway',
    assignee: 'Alex Chen',
    details: 'Initial alert triggered by Datadog webhook monitor. 504 gateway timeout rate at 18.4%.',
    actionRequired: true,
    handoffNotes: 'Investigating upstream routing failure.',
  },
  // Latest update of INC-4091 (Mitigated)
  {
    source: 'incident',
    recordId: 'INC-4091',
    timestamp: hoursAgoIso(1, 15), // Standard ISO 8601 string
    summary: 'Payment Webhook Service Elevated 504 Gateway Timeouts',
    status: 'Mitigated',
    priority: 'Critical (P1)',
    service: 'Payment Gateway',
    assignee: 'Alex Chen',
    details: 'Traffic routed through backup payment gateway. Primary provider acknowledged upstream DNS failure.',
    actionRequired: true,
    handoffNotes: 'Check with payment provider support at 14:00 UTC for post-incident root cause report.',
  },
  {
    source: 'incident',
    recordId: 'INC-4092',
    timestamp: hoursAgoEpochMs(3, 40), // Epoch Milliseconds timestamp
    summary: 'PostgreSQL Read-Replica Replication Lag Exceeded 450s',
    status: 'Resolved',
    priority: 'High (P2)',
    service: 'Database Cluster',
    assignee: 'Sarah Miller',
    details: 'Long-running analytical query killed on replica-02. WAL replication resumed normal lag (<2s).',
    actionRequired: false,
    handoffNotes: 'Analytics team notified to restrict ad-hoc table scans during peak business hours.',
  },
  {
    source: 'incident',
    recordId: 'INC-4093',
    timestamp: hoursAgoIso(5, 10),
    summary: 'Auth0 Token Refresh Latency Spike (>1200ms)',
    status: 'Investigating',
    priority: 'High (P2)',
    service: 'Identity & Access',
    assignee: 'Elena Rostova',
    details: 'Intermittent rate-limiting threshold observed on European edge cluster.',
    actionRequired: true,
    handoffNotes: 'Watch token validation error rate. Escalate to Identity On-Call if p99 exceeds 1500ms.',
  },
  {
    source: 'incident',
    recordId: 'INC-4094',
    timestamp: hoursAgoFormatted(7, 25),
    summary: 'Redis Cache Memory Utilization Warning (>88%)',
    status: 'Resolved',
    priority: 'Medium (P3)',
    service: 'Cache Layer',
    assignee: 'Alex Chen',
    details: 'Eviction policy triggered smoothly. Stale session tokens flushed via batch maintenance script.',
    actionRequired: false,
    handoffNotes: 'Memory normalized back to 62%. No further action needed.',
  },
  // OUTSIDE 8-HOUR WINDOW (10 hours ago -> test shift window exclusion)
  {
    source: 'incident',
    recordId: 'INC-4095',
    timestamp: hoursAgoIso(10, 5),
    summary: 'SSL Certificate Expiration Warning on api.staging.internal',
    status: 'Open',
    priority: 'Low (P4)',
    service: 'Ingress Proxy',
    assignee: 'DevOps Queue',
    details: 'Cert expires in 6 days. Automated ACME certbot failed due to ingress route check.',
    actionRequired: true,
    handoffNotes: 'Non-prod only. Renew before Friday deployment freeze.',
  },

  // -------------------------------------------------------------
  // TICKETING BOARD (Jira / Linear)
  // Demonstrating: repeated updates, diverse timestamps
  // -------------------------------------------------------------
  // Earlier update of OPS-8821
  {
    source: 'ticketing',
    recordId: 'OPS-8821',
    timestamp: hoursAgoFormatted(2, 45),
    summary: 'Customer Tier-1 Escalation: Bulk export failure for Enterprise tenant #4419 [Opened]',
    status: 'Open',
    priority: 'High (P2)',
    service: 'Export Worker',
    assignee: 'Marcus Vance',
    details: 'Support ticket received reporting CSV download 500 error.',
    actionRequired: true,
  },
  // Latest update of OPS-8821 (In Progress with memory bump)
  {
    source: 'ticketing',
    recordId: 'OPS-8821',
    timestamp: hoursAgoIso(2, 5),
    summary: 'Customer Tier-1 Escalation: Bulk export failure for Enterprise tenant #4419',
    status: 'In Progress',
    priority: 'High (P2)',
    service: 'Export Worker',
    assignee: 'Marcus Vance',
    details: 'Worker memory OOM killed during 4M row CSV generation. Temporary worker pod memory bumped to 8GB.',
    actionRequired: true,
    handoffNotes: 'Verify tenant export finishes successfully by 16:30 and confirm customer notification.',
  },
  {
    source: 'ticketing',
    recordId: 'OPS-8822',
    timestamp: hoursAgoFormatted(4, 15),
    summary: 'Scale Kubernetes Worker Nodes for Scheduled End-of-Month Payroll Batch',
    status: 'Resolved',
    priority: 'Medium (P3)',
    service: 'Compute Infrastructure',
    assignee: 'Sarah Miller',
    details: 'Increased node pool min/max from 6 to 14 instances in us-central1-a.',
    actionRequired: false,
    handoffNotes: 'Node pool auto-scaler scheduled to scale down automatically tomorrow at 06:00.',
  },
  {
    source: 'ticketing',
    recordId: 'OPS-8823',
    timestamp: hoursAgoEpochMs(6, 45),
    summary: 'Corrupted Webhook Retry Queue partition on Kafka Broker-3',
    status: 'Resolved',
    priority: 'High (P2)',
    service: 'Event Streaming',
    assignee: 'Alex Chen',
    details: 'Repaired offset pointer and cleared dead-letter payload; all 1,240 delayed webhooks re-delivered.',
    actionRequired: false,
    handoffNotes: 'Consumer group lag is now 0. Dead-letter queue dump saved to S3 bucket for audit.',
  },
  {
    source: 'ticketing',
    recordId: 'OPS-8824',
    timestamp: hoursAgoIso(7, 50),
    summary: 'Rotate IAM service account credentials for Data Pipeline Ingestion',
    status: 'In Progress',
    priority: 'Medium (P3)',
    service: 'Security & Compliance',
    assignee: 'Security Ops',
    details: 'Staging and dev keys rotated. Production key rotation waiting on next maintenance window.',
    actionRequired: true,
    handoffNotes: 'Do not rotate production key until batch ingestion stops at 23:00.',
  },
  // OUTSIDE 8-HOUR WINDOW (11 hours ago -> should be excluded in 8h shift)
  {
    source: 'ticketing',
    recordId: 'OPS-8825',
    timestamp: hoursAgoIso(11, 20),
    summary: 'Audit CloudTrail logs for unexpected security group ingress rules',
    status: 'Closed',
    priority: 'Low (P4)',
    service: 'VPC Security',
    assignee: 'Alex Chen',
    details: 'Audit completed. No anomalous IP ranges discovered. Report submitted to SecOps.',
    actionRequired: false,
    handoffNotes: 'Routine bi-weekly task completed.',
  },
  {
    source: 'ticketing',
    recordId: 'OPS-8826',
    timestamp: hoursAgoFormatted(0, 45),
    summary: 'Stripe Webhook Signature Verification intermittent mismatch',
    status: 'Investigating',
    priority: 'Critical (P1)',
    service: 'Billing Gateway',
    assignee: 'Marcus Vance',
    details: 'Approx 3% of incoming webhook events fail HMAC verification due to clock skew on worker-04.',
    actionRequired: true,
    handoffNotes: 'NTP sync daemon restarted on worker-04. Verify error rate drops to 0% over next 30 mins.',
  },

  // -------------------------------------------------------------
  // CHAT (Ops Channels / Handoff Comms)
  // Demonstrating: Slack style decimal epoch timestamps, out-of-order logs
  // -------------------------------------------------------------
  {
    source: 'chat',
    recordId: 'CHAT-104',
    timestamp: hoursAgoSlackTs(1, 30), // Slack decimal timestamp format "1788421800.000214"
    summary: 'Slack #incident-bridge: Payment provider status page acknowledged EU routing degradation',
    status: 'Open',
    priority: 'High (P2)',
    service: 'Partner Ops',
    assignee: 'Alex Chen',
    details: 'Chat thread with Stripe technical account manager confirmed hotfix deployment underway on their side.',
    actionRequired: true,
    handoffNotes: 'Keep monitoring #incident-bridge for provider resolution notice.',
  },
  {
    source: 'chat',
    recordId: 'CHAT-105',
    timestamp: hoursAgoFormatted(3, 10),
    summary: 'Slack #infra-announcements: Database maintenance window approved for tonight 02:00 UTC',
    status: 'Resolved',
    priority: 'Medium (P3)',
    service: 'Database Cluster',
    assignee: 'Database Admin',
    details: 'Maintenance notification emailed to enterprise customers with 5-minute anticipated downtime.',
    actionRequired: true,
    handoffNotes: 'Night shift engineer must verify maintenance checklist prior to execution.',
  },
  {
    source: 'chat',
    recordId: 'CHAT-106',
    timestamp: hoursAgoIso(5, 55),
    summary: 'Slack #security: Third-party vulnerability CVE-2026-3829 triage completed',
    status: 'Resolved',
    priority: 'Low (P4)',
    service: 'SecOps',
    assignee: 'Security Lead',
    details: 'Determined not applicable to production cluster architecture (missing vulnerable module).',
    actionRequired: false,
  },
  // OUTSIDE 8-HOUR WINDOW
  {
    source: 'chat',
    recordId: 'CHAT-107',
    timestamp: hoursAgoIso(8, 15),
    summary: 'Slack #ops-standup: Handover from APAC team to EMEA team logged',
    status: 'Closed',
    priority: 'Low (P4)',
    service: 'Team Ops',
    assignee: 'Kenji Sato',
    details: 'APAC shift completed with 0 P1s, 2 minor Jira tickets dispatched.',
    actionRequired: false,
  },

  // -------------------------------------------------------------
  // COMMIT HISTORY (Git Deployments & Production Changes)
  // Demonstrating: Git hashes, formatted timestamps
  // -------------------------------------------------------------
  {
    source: 'commit',
    recordId: 'GIT-7a91bf',
    timestamp: hoursAgoFormatted(2, 35),
    summary: 'fix(checkout): add fallback retry mechanism for secondary payment processor',
    status: 'Merged',
    priority: 'High (P2)',
    service: 'Payment Gateway',
    assignee: 'David K.',
    details: 'Production deploy tag v2.44.1 rolled out across all 3 production clusters.',
    actionRequired: false,
    handoffNotes: 'Canary checks healthy. Grafana dashboard 5xx errors dropped back to baseline 0.01%.',
  },
  {
    source: 'commit',
    recordId: 'GIT-3c224e',
    timestamp: hoursAgoIso(4, 50),
    summary: 'perf(db): optimize active session count query with compound index on accounts',
    status: 'Merged',
    priority: 'Medium (P3)',
    service: 'Database Cluster',
    assignee: 'Sarah Miller',
    details: 'Migration ran cleanly without table lock. Query execution time reduced from 840ms to 12ms.',
    actionRequired: false,
  },
  {
    source: 'commit',
    recordId: 'GIT-9f18dd',
    timestamp: hoursAgoFormatted(6, 20),
    summary: 'chore(config): bump rate limiter threshold on public healthcheck endpoints',
    status: 'Merged',
    priority: 'Low (P4)',
    service: 'Ingress Proxy',
    assignee: 'Alex Chen',
    details: 'Prevents Datadog synthetic monitors from triggering false positive 429 warnings.',
    actionRequired: false,
  },
  // OUTSIDE 8-HOUR WINDOW
  {
    source: 'commit',
    recordId: 'GIT-4b80aa',
    timestamp: hoursAgoIso(9, 45),
    summary: 'revert(auth): temporarily rollback JWT token compression pending iOS app update',
    status: 'Merged',
    priority: 'High (P2)',
    service: 'Identity & Access',
    assignee: 'Mobile Backend Lead',
    details: 'Rollback verified. Older iOS app clients can authenticate without parsing error.',
    actionRequired: false,
  },

  // -------------------------------------------------------------
  // ERROR HANDLING TEST CASE: MALFORMED TIMESTAMP
  // Demonstrates requirement: application must not crash on malformed timestamp
  // and logs an informative status message about the skipped event.
  // -------------------------------------------------------------
  {
    source: 'incident',
    recordId: 'INC-ERR-MALFORMED',
    timestamp: 'CORRUPTED_2026_09_03_T_INVALID',
    summary: 'Telemetry Ingestion Pipeline Buffer Depletion [Corrupted Timestamp Probe]',
    status: 'Investigating',
    priority: 'Medium (P3)',
    service: 'Telemetry Pipeline',
    assignee: 'Monitoring Daemon',
    details: 'Corrupted timestamp sent by legacy agent v1.1.',
    actionRequired: false,
  },

  // -------------------------------------------------------------
  // TEST CASE: EVENT AFTER SHIFT WINDOW (Future / Post-Shift)
  // Demonstrates requirement: events after shift window are strictly excluded
  // -------------------------------------------------------------
  {
    source: 'ticketing',
    recordId: 'OPS-9011',
    timestamp: hoursAgoIso(-2, 15), // 2 hours 15 mins after shift window
    summary: 'Next Shift Scheduled Maintenance: Storage Array Volume Compaction',
    status: 'Open',
    priority: 'Low (P4)',
    service: 'Storage Subsystem',
    assignee: 'Next Shift Queue',
    details: 'Created for upcoming shift window. Must be excluded from current shift.',
    actionRequired: false,
  },
  {
    source: 'chat',
    recordId: 'CHAT-9012',
    timestamp: hoursAgoFormatted(-1, 45), // Post-shift chat
    summary: 'Slack #ops-standup: Next shift engineer checked in early',
    status: 'Open',
    priority: 'Low (P4)',
    service: 'Team Ops',
    assignee: 'Next Shift On-Call',
    details: 'Post-shift communication check-in.',
    actionRequired: false,
  },
];

// -------------------------------------------------------------
// PREVIOUS SHIFT UNRESOLVED ITEMS (Orphaned Task Detector Source)
// These items were opened in the preceding shift and remained
// unresolved (IN PROGRESS or BLOCKERS). The Orphaned Task Detector
// automatically carries them forward into the active shift unless
// a resolution event occurs in the current shift.
// -------------------------------------------------------------
export const PREVIOUS_SHIFT_UNRESOLVED_EVENTS: ShiftEvent[] = [
  {
    source: 'ticketing',
    recordId: 'OPS-8705',
    timestamp: hoursAgoIso(11, 30), // From preceding shift window
    summary: 'Kubernetes ingress SSL certificate automated ACME renewal failure',
    status: 'Investigating',
    priority: 'Critical (P1)',
    service: 'Edge Ingress',
    assignee: 'Previous Shift Team',
    details: 'Cloudflare DNS-01 API rate-limit exceeded during automated certificate renewal. Ingress cert expires in 36 hours.',
    actionRequired: true,
    handoffNotes: 'Escalated from morning shift. Security team reviewing API token rate limit reset.',
    isCarriedForward: true,
    carriedFromShift: 'Previous Shift (Morning 00:00 - 08:00)',
    originalShiftStatus: 'Investigating',
  },
  {
    source: 'incident',
    recordId: 'INC-4078',
    timestamp: hoursAgoFormatted(10, 15),
    summary: 'Billing service Kafka dead-letter queue replay stalled at partition 3',
    status: 'In Progress',
    priority: 'High (P2)',
    service: 'Billing Pipeline',
    assignee: 'Previous Shift Lead',
    details: 'Dead-letter consumer queue stuck reprocessing malformed payload from legacy billing gateway.',
    actionRequired: true,
    handoffNotes: 'Consumer group offset paused. Incoming shift must monitor partition lag after schema patch.',
    isCarriedForward: true,
    carriedFromShift: 'Previous Shift (Morning 00:00 - 08:00)',
    originalShiftStatus: 'In Progress',
  },
  {
    source: 'ticketing',
    recordId: 'OPS-8699',
    timestamp: hoursAgoEpochMs(13, 0),
    summary: 'Legacy MySQL shard-04 backup snapshot IOPS bottleneck investigation',
    status: 'Open',
    priority: 'Medium (P3)',
    service: 'Database Storage',
    assignee: 'Storage Team',
    details: 'Snapshot creation taking 3.2x longer than baseline during morning peak.',
    actionRequired: false,
    handoffNotes: 'Awaiting storage vendor diagnostics ticket response.',
    isCarriedForward: true,
    carriedFromShift: 'Previous Shift (Morning 00:00 - 08:00)',
    originalShiftStatus: 'Open',
  },
];

// Helper to generate a 60+ event high-volume shift for performance & stress testing
export const getHighVolumeMockEvents = (): ShiftEvent[] => {
  const base = [...INITIAL_MOCK_EVENTS];
  const additional: ShiftEvent[] = [];

  const services = ['Auth API', 'Billing', 'Search Index', 'Worker Pool', 'CDN Cache', 'Database Cluster', 'Gateway'];
  const authors = ['Alex Chen', 'Sarah Miller', 'David K.', 'Elena Rostova', 'Jordan Lee', 'Marcus Vance'];

  for (let i = 1; i <= 40; i++) {
    const hours = (i % 7) + 0.5;
    const mins = (i * 13) % 60;
    const service = services[i % services.length];
    const assignee = authors[i % authors.length];

    if (i % 4 === 0) {
      additional.push({
        source: 'ticketing',
        recordId: `OPS-${9100 + i}`,
        timestamp: hoursAgoIso(hours, mins),
        summary: `Routine maintenance task #${i}: Verified ${service} health probes & log rotation`,
        status: i % 2 === 0 ? 'Resolved' : 'In Progress',
        priority: i % 5 === 0 ? 'High (P2)' : 'Medium (P3)',
        service,
        assignee,
        details: `Automated runbook check completed for ${service}.`,
        actionRequired: i % 6 === 0,
      });
    } else if (i % 4 === 1) {
      additional.push({
        source: 'chat',
        recordId: `CHAT-${9200 + i}`,
        timestamp: hoursAgoFormatted(hours, mins),
        summary: `Slack #ops-general: ${assignee} confirmed deployment canary for ${service}`,
        status: 'Closed',
        priority: 'Low (P4)',
        service,
        assignee,
        details: `Canary phase complete with 0 errors.`,
      });
    } else if (i % 4 === 2) {
      additional.push({
        source: 'commit',
        recordId: `GIT-${8000 + i}`,
        timestamp: hoursAgoEpochMs(hours, mins),
        summary: `chore(${service.toLowerCase().replace(/\s+/g, '-')}) sync config map v${i}.1`,
        status: 'Merged',
        priority: 'Low (P4)',
        service,
        assignee,
        details: `Config map revision ${i} applied to staging cluster.`,
      });
    } else {
      additional.push({
        source: 'incident',
        recordId: `INC-${4150 + i}`,
        timestamp: hoursAgoIso(hours, mins),
        summary: `Minor telemetry anomaly in ${service} worker replica-0${(i % 5) + 1}`,
        status: i % 3 === 0 ? 'Mitigated' : 'Resolved',
        priority: 'Medium (P3)',
        service,
        assignee,
        details: `Temporary CPU utilization blip resolved automatically via auto-scaling.`,
        actionRequired: false,
      });
    }
  }

  return [...base, ...additional];
};

// Helper to generate zero events inside the current shift window (e.g. quiet shift / off-hours)
export const getZeroEventMockEvents = (): ShiftEvent[] => {
  return [
    {
      source: 'ticketing',
      recordId: 'OPS-9991',
      timestamp: hoursAgoIso(26), // 26 hours ago (outside current 8h window)
      summary: 'Historical Archive: Previous day backup rotation',
      status: 'Resolved',
      priority: 'Low (P4)',
    },
    {
      source: 'commit',
      recordId: 'GIT-9992',
      timestamp: hoursAgoIso(-10), // 10 hours in future (outside window)
      summary: 'Upcoming release branch merge',
      status: 'Open',
      priority: 'Low (P4)',
    },
  ];
};

// Helper to get default shift start and end times
export const getDefaultShiftConfig = (): ShiftSetupConfig => {
  const now = new Date();
  
  // Default to an 8-hour shift ending right now
  const end = new Date(now);
  const start = new Date(now.getTime() - 8 * 60 * 60 * 1000);

  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return {
    employeeName: 'Alex Chen',
    employeeRole: 'Senior SRE / Incident Commander',
    startDateTime: formatDateTime(start),
    endDateTime: formatDateTime(end),
    selectedSources: {
      ticketing: true,
      incident: true,
      chat: true,
      commit: true,
    },
    enableOrphanedTaskDetector: true, // Review 2: Carries unresolved IN PROGRESS / BLOCKERS from previous shift
    overlapBufferMinutes: 0,
  };
};
