import {
  HandoverReport,
  ShiftEvent,
  ShiftSetupConfig,
  HandoverCategory,
} from '../types';
import { calculateDurationHours } from './dateUtils';
import { processShiftActivities, PipelineOptions } from './handoverPipeline';

export function generateHandoverNote(
  config: ShiftSetupConfig,
  allEvents: ShiftEvent[],
  options?: PipelineOptions
): HandoverReport {
  // Execute pure data processing pipeline: Filtering -> Normalization -> Deduplication -> Categorization
  const processingResult = processShiftActivities(config, allEvents, options);
  const shiftEvents = processingResult.activities;

  const durationStr = calculateDurationHours(config.startDateTime, config.endDateTime);

  // Stats computation
  const tickets = shiftEvents.filter((e) => e.source === 'ticketing').length;
  const incidents = shiftEvents.filter((e) => e.source === 'incident').length;
  const chats = shiftEvents.filter((e) => e.source === 'chat').length;
  const commits = shiftEvents.filter((e) => e.source === 'commit').length;

  const criticalCount = shiftEvents.filter((e) =>
    e.priority.includes('Critical') || e.priority.includes('High')
  ).length;

  const actionRequiredCount = shiftEvents.filter((e) => e.actionRequired).length;
  const resolvedCount = shiftEvents.filter((e) =>
    ['Resolved', 'Closed', 'Merged', 'Mitigated'].includes(e.status)
  ).length;
  const inProgressCount = shiftEvents.filter((e) =>
    ['In Progress', 'Investigating', 'Open'].includes(e.status)
  ).length;

  // Synthesize executive briefing summary
  let summaryText = `Shift handover completed by ${config.employeeName}${
    config.employeeRole ? ` (${config.employeeRole})` : ''
  } covering a ${durationStr} operations window. `;

  if (shiftEvents.length === 0) {
    summaryText += `Zero operational events occurred within this shift window. Normal steady-state monitoring maintained with no active incidents or blockers.`;
  } else {
    const blockersCount = processingResult.categorized.BLOCKERS.length;
    const watchListCount = processingResult.categorized.WATCH_LIST.length;
    const completedCount = processingResult.categorized.COMPLETED.length;
    const inProgressCountTotal = processingResult.categorized.IN_PROGRESS.length;
    const carriedCount = processingResult.stats.carriedForwardCount;

    summaryText += `A total of ${shiftEvents.length} unique activities were synthesized (${completedCount} completed, ${inProgressCountTotal} in-progress, ${watchListCount} on watch-list, ${blockersCount} blockers). `;

    if (carriedCount > 0) {
      summaryText += `Includes ${carriedCount} unresolved item(s) carried forward from previous shift by Orphaned Task Detector. `;
    }

    if (blockersCount > 0) {
      summaryText += `ATTENTION: ${blockersCount} active blocker/escalation item(s) require immediate follow-up by oncoming lead. `;
    } else {
      summaryText += `No open P1 blockers or escalated service outages currently active. `;
    }

    if (watchListCount > 0) {
      summaryText += `${watchListCount} item(s) are placed under observation on the Watch-List. `;
    }
  }

  // Deterministic report ID based on shift window & employee to ensure re-generation idempotency
  const windowKey = `${config.startDateTime}_${config.endDateTime}_${config.employeeName}`;
  let hash = 0;
  for (let i = 0; i < windowKey.length; i++) {
    hash = (hash << 5) - hash + windowKey.charCodeAt(i);
    hash |= 0;
  }
  const reportId = `HANDOVER-${Math.abs(hash).toString(36).toUpperCase()}`;

  return {
    id: reportId,
    generatedAt: new Date().toISOString(),
    config,
    events: shiftEvents,
    categorized: processingResult.categorized,
    processingResult,
    stats: {
      tickets,
      incidents,
      chats,
      commits,
      criticalCount,
      actionRequiredCount,
      resolvedCount,
      inProgressCount,
    },
    summary: summaryText,
  };
}
