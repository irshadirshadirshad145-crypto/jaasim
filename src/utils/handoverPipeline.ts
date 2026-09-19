import {
  ShiftEvent,
  ShiftSetupConfig,
  ProcessedActivity,
  HandoverCategory,
  DataProcessingResult,
  ProcessingLog,
  SourceType,
} from '../types';
import {
  normalizeTimestamp,
  getResolvedShiftWindow,
  formatDateTimeDisplay,
} from './dateUtils';
import { PREVIOUS_SHIFT_UNRESOLVED_EVENTS } from '../data/mockData';

/**
 * Rule-based category determination strictly adhering to the 4 sections:
 * - BLOCKERS: critical/blocker/escalation
 * - WATCH_LIST: monitoring/watch/follow-up
 * - COMPLETED: completed/resolved/closed/merged
 * - IN_PROGRESS: open/in progress/pending
 */
export function determineInitialCategory(event: ShiftEvent): HandoverCategory {
  const text = `${event.summary} ${event.details || ''} ${event.handoffNotes || ''}`.toLowerCase();
  const isCriticalPriority = event.priority.includes('Critical') || event.priority.includes('P1');
  const isHighPriority = event.priority.includes('High') || event.priority.includes('P2');

  // 1. BLOCKERS / ESCALATIONS
  // Critical priority, or investigating active outage, or blocker/escalation keywords
  if (
    isCriticalPriority ||
    text.includes('blocker') ||
    text.includes('escalat') ||
    text.includes('outage') ||
    (isHighPriority && event.status === 'Investigating')
  ) {
    return 'BLOCKERS';
  }

  // 2. WATCH-LIST
  // Mitigated items, flagged for handoff follow-up, or watch/monitoring terms
  if (
    event.status === 'Mitigated' ||
    event.actionRequired ||
    text.includes('watch') ||
    text.includes('monitor') ||
    text.includes('follow-up') ||
    text.includes('followup') ||
    text.includes('checklist')
  ) {
    return 'WATCH_LIST';
  }

  // 3. COMPLETED
  // Resolved, closed, merged, completed
  if (
    event.status === 'Resolved' ||
    event.status === 'Closed' ||
    event.status === 'Merged' ||
    text.includes('resolved') ||
    text.includes('completed') ||
    text.includes('merged')
  ) {
    return 'COMPLETED';
  }

  // 4. IN PROGRESS (Default for open / active / pending operations)
  return 'IN_PROGRESS';
}

/**
 * Pipeline Options
 */
export interface PipelineOptions {
  manualCategoryOverrides?: Record<string, HandoverCategory>; // key: `${source}:${recordId}`
  previousShiftEvents?: ShiftEvent[]; // Custom previous shift feed for Orphaned Task Detector
}

/**
 * Main Core Data Processing Logic
 * Executes in strictly mandated order:
 * 1. Shift Window Filtering (start_time <= event_time <= end_time)
 *    - With optional shift overlap cushion (15-30m) for shift changeovers.
 * 2. Timestamp Normalization into consistent ISO 8601 UTC & localized display
 *    - Detects and handles out-of-order arrival and malformed timestamps.
 * 3. Deduplication by unique identifier (source + recordId)
 *    - Keeps one item, using the latest relevant status/progression.
 * 4. Orphaned Task Detector
 *    - Identifies unresolved IN PROGRESS & BLOCKERS from previous shift
 *    - Carries them forward into current shift with explicit attribution.
 * 5. Rule-based Categorization into EXACTLY four main sections:
 *    - COMPLETED
 *    - IN_PROGRESS
 *    - BLOCKERS
 *    - WATCH_LIST
 */
export function processShiftActivities(
  config: ShiftSetupConfig,
  rawEvents: ShiftEvent[],
  options?: PipelineOptions
): DataProcessingResult {
  const logs: ProcessingLog[] = [];
  const resolvedWindow = getResolvedShiftWindow(config.startDateTime, config.endDateTime);

  if (resolvedWindow.isCrossMidnight) {
    logs.push({
      id: `log-window-${Date.now()}`,
      type: 'info',
      message: `Shift window spans past midnight: ${formatDateTimeDisplay(
        resolvedWindow.startIso
      )} to ${formatDateTimeDisplay(resolvedWindow.endIso)} (+24h overnight rollover detected).`,
    });
  }

  // Shift overlap cushion (e.g. 15 or 30 minutes before shift start)
  const overlapMinutes = config.overlapBufferMinutes || 0;
  const effectiveStartMs = resolvedWindow.startMs - overlapMinutes * 60 * 1000;

  if (overlapMinutes > 0) {
    logs.push({
      id: `log-overlap-${Date.now()}`,
      type: 'info',
      message: `Shift overlap cushion active: window expanded by ${overlapMinutes}m before shift start to capture handoff transition events.`,
    });
  }

  let totalEvaluated = 0;
  let inWindowCount = 0;
  let outOfWindowCount = 0;
  let malformedSkippedCount = 0;
  let sourceDeselectedCount = 0;
  let outOfOrderCount = 0;

  // Track timestamp ordering to detect out-of-order feeds
  let prevTimestampMs = 0;

  // STEP 1: SHIFT WINDOW FILTERING & SOURCE FILTERING
  const inWindowEvents: {
    event: ShiftEvent;
    normTime: ReturnType<typeof normalizeTimestamp>;
  }[] = [];

  for (const ev of rawEvents) {
    totalEvaluated++;

    // Source selection check
    if (!config.selectedSources[ev.source]) {
      sourceDeselectedCount++;
      continue;
    }

    // Parse and normalize timestamp first to evaluate window bounds
    const norm = normalizeTimestamp(ev.timestamp);

    // Error handling: Malformed timestamp
    if (!norm.isValid || !norm.date) {
      malformedSkippedCount++;
      logs.push({
        id: `err-${ev.source}-${ev.recordId}-${malformedSkippedCount}-${Date.now()}`,
        type: 'error',
        message: `Skipped event [${ev.recordId}]: Malformed timestamp "${ev.timestamp}". ${
          norm.error || ''
        }`,
        recordId: ev.recordId,
        source: ev.source,
        rawTimestamp: ev.timestamp,
      });
      continue;
    }

    // Detect out-of-order event sequence
    if (prevTimestampMs > 0 && norm.epochMs < prevTimestampMs) {
      outOfOrderCount++;
    }
    prevTimestampMs = norm.epochMs;

    // Exact shift window condition: start_time <= event_time <= end_time
    const eventTimeMs = norm.epochMs;
    const isInsideWindow =
      effectiveStartMs <= eventTimeMs && eventTimeMs <= resolvedWindow.endMs;

    if (!isInsideWindow) {
      outOfWindowCount++;
      continue;
    }

    inWindowCount++;
    inWindowEvents.push({ event: ev, normTime: norm });
  }

  if (outOfOrderCount > 0) {
    logs.push({
      id: `log-order-${Date.now()}`,
      type: 'warning',
      message: `Out-of-order event delivery detected (${outOfOrderCount} events arrived non-sequentially). Deterministic reverse-chronological sorting applied.`,
    });
  }

  // STEP 2: DEDUPLICATION
  // Unique identifier: source + recordId
  // If the same record has multiple updates:
  // - keep one item
  // - use the latest relevant status/progression (latest parsed timestamp)
  const dedupMap = new Map<
    string,
    {
      event: ShiftEvent;
      normTime: ReturnType<typeof normalizeTimestamp>;
      updateCount: number;
    }
  >();

  let deduplicatedRepeatsCount = 0;

  for (const item of inWindowEvents) {
    const uniqueKey = `${item.event.source}:${item.event.recordId}`;
    const existing = dedupMap.get(uniqueKey);

    if (!existing) {
      dedupMap.set(uniqueKey, {
        event: item.event,
        normTime: item.normTime,
        updateCount: 1,
      });
    } else {
      deduplicatedRepeatsCount++;
      // Compare timestamps to retain the latest progression
      if (item.normTime.epochMs >= existing.normTime.epochMs) {
        logs.push({
          id: `dedup-${uniqueKey}-${deduplicatedRepeatsCount}-${Date.now()}`,
          type: 'warning',
          message: `Deduplicated repeated update for [${item.event.recordId}]: superseded older status (${existing.event.status}) with latest update (${item.event.status}) at ${item.normTime.display}.`,
          recordId: item.event.recordId,
          source: item.event.source,
        });

        dedupMap.set(uniqueKey, {
          event: item.event,
          normTime: item.normTime,
          updateCount: existing.updateCount + 1,
        });
      } else {
        logs.push({
          id: `dedup-kept-${uniqueKey}-${deduplicatedRepeatsCount}-${Date.now()}`,
          type: 'warning',
          message: `Deduplicated out-of-order repeated event for [${item.event.recordId}]: retained latest update (${existing.event.status}).`,
          recordId: item.event.recordId,
          source: item.event.source,
        });
        existing.updateCount += 1;
      }
    }
  }

  // STEP 3: ORPHANED TASK DETECTOR (Review 2 Requirement)
  // Carries unresolved IN PROGRESS and BLOCKERS/ESCALATIONS items
  // from the previous shift into the current shift.
  let carriedForwardCount = 0;
  const carriedForwardActivities: ProcessedActivity[] = [];

  if (config.enableOrphanedTaskDetector) {
    const prevItems = options?.previousShiftEvents || PREVIOUS_SHIFT_UNRESOLVED_EVENTS;

    for (const prevEv of prevItems) {
      // Must pass source selection
      if (!config.selectedSources[prevEv.source]) continue;

      const uniqueKey = `${prevEv.source}:${prevEv.recordId}`;
      const currentShiftUpdate = dedupMap.get(uniqueKey);

      // Check if item was resolved or closed during the current shift
      const isResolvedInCurrentShift =
        currentShiftUpdate &&
        ['Resolved', 'Closed', 'Merged', 'Mitigated'].includes(currentShiftUpdate.event.status);

      if (!isResolvedInCurrentShift) {
        // Item remained unresolved: Carry forward!
        carriedForwardCount++;
        const normTime = normalizeTimestamp(prevEv.timestamp);

        // Check manual category override or rule-based category
        const manualCat = options?.manualCategoryOverrides?.[uniqueKey];
        const category = manualCat || determineInitialCategory(prevEv);

        const carriedActivity: ProcessedActivity = {
          source: prevEv.source,
          recordId: prevEv.recordId,
          rawTimestamp: prevEv.timestamp,
          normalizedTimestamp: normTime.iso,
          displayTimestamp: normTime.display,
          parsedTimestampMs: normTime.epochMs,
          summary: prevEv.summary,
          status: prevEv.status,
          priority: prevEv.priority,
          category,
          service: prevEv.service,
          assignee: prevEv.assignee,
          details: prevEv.details,
          actionRequired: true,
          handoffNotes: prevEv.handoffNotes,
          updateCount: currentShiftUpdate ? currentShiftUpdate.updateCount + 1 : 1,
          isCarriedForward: true,
          carriedFromShift: prevEv.carriedFromShift || 'Previous Shift (Morning 00:00 - 08:00)',
          originalShiftStatus: prevEv.status,
        };

        carriedForwardActivities.push(carriedActivity);

        // Remove from current shift dedupMap if it existed so we don't duplicate
        dedupMap.delete(uniqueKey);

        logs.push({
          id: `log-orphan-${uniqueKey}-${Date.now()}`,
          type: 'warning',
          message: `Orphaned Task Detected: [${prevEv.recordId}] carried forward from previous shift (${prevEv.status} / ${prevEv.priority}) to prevent dropped incidents.`,
          recordId: prevEv.recordId,
          source: prevEv.source,
        });
      } else {
        logs.push({
          id: `log-orphan-resolved-${uniqueKey}-${Date.now()}`,
          type: 'info',
          message: `Previous shift item [${prevEv.recordId}] was resolved during current shift (${currentShiftUpdate.event.status}). Not carried forward.`,
          recordId: prevEv.recordId,
          source: prevEv.source,
        });
      }
    }
  }

  // STEP 4: BUILD PROCESSED ACTIVITIES & SORT DETERMINISTICALLY
  const processedList: ProcessedActivity[] = [];

  dedupMap.forEach((val, uniqueKey) => {
    const { event, normTime, updateCount } = val;

    // Check manual user override if any, otherwise determine rule-based category
    const manualCategory = options?.manualCategoryOverrides?.[uniqueKey];
    const category: HandoverCategory = manualCategory || determineInitialCategory(event);

    processedList.push({
      source: event.source,
      recordId: event.recordId,
      rawTimestamp: event.timestamp,
      normalizedTimestamp: normTime.iso,
      displayTimestamp: normTime.display,
      parsedTimestampMs: normTime.epochMs,
      summary: event.summary,
      status: event.status,
      priority: event.priority,
      category,
      service: event.service,
      assignee: event.assignee,
      details: event.details,
      actionRequired: event.actionRequired,
      handoffNotes: event.handoffNotes,
      updateCount,
      isCarriedForward: event.isCarriedForward || false,
      carriedFromShift: event.carriedFromShift,
      originalShiftStatus: event.originalShiftStatus,
    });
  });

  // Append carried forward items
  processedList.push(...carriedForwardActivities);

  // Sort by timestamp descending (newest first) to ensure deterministic order
  processedList.sort((a, b) => b.parsedTimestampMs - a.parsedTimestampMs);

  // STEP 5: CATEGORIZE INTO EXACTLY FOUR MAIN SECTIONS
  const categorized: Record<HandoverCategory, ProcessedActivity[]> = {
    BLOCKERS: [],
    IN_PROGRESS: [],
    WATCH_LIST: [],
    COMPLETED: [],
  };

  for (const act of processedList) {
    categorized[act.category].push(act);
  }

  if (processedList.length > 0) {
    logs.push({
      id: `log-success-${Date.now()}`,
      type: 'success',
      message: `Shift processing complete: ${processedList.length} unique activities synthesized (${inWindowCount} in-window, ${deduplicatedRepeatsCount} duplicates merged, ${carriedForwardCount} carried forward from previous shift, ${outOfWindowCount} out of window).`,
    });
  } else {
    logs.push({
      id: `log-zero-${Date.now()}`,
      type: 'info',
      message: `Zero events detected in active shift window. Steady-state monitoring maintained with "Nothing to report." across all sections.`,
    });
  }

  return {
    activities: processedList,
    categorized,
    stats: {
      totalEvaluated,
      inWindowCount,
      outOfWindowCount,
      deduplicatedCount: deduplicatedRepeatsCount,
      malformedSkippedCount,
      sourceDeselectedCount,
      carriedForwardCount,
      outOfOrderCount,
    },
    logs,
  };
}
