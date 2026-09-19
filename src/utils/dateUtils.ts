/**
 * Date & Timestamp Normalization Utilities
 * Supports:
 * - ISO 8601 timestamps (with/without timezone offsets, Z, ms)
 * - Normal date/time strings ("YYYY-MM-DD HH:mm:ss", "MM/DD/YYYY HH:mm", etc.)
 * - Unix Epoch numbers or numeric strings (seconds or milliseconds)
 * - Slack style epoch strings ("1788421800.000200")
 * - Cross-midnight shifts (e.g. 10:00 PM -> 2:00 AM)
 * - Malformed timestamp detection with error recovery
 */

export interface NormalizedDateResult {
  isValid: boolean;
  date: Date | null;
  iso: string;
  display: string;
  epochMs: number;
  error?: string;
}

/**
 * Normalizes any timestamp representation from different mock sources
 * into a single unified UTC ISO 8601 string and standard display string.
 */
export function normalizeTimestamp(raw: string | number | undefined | null): NormalizedDateResult {
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    return {
      isValid: false,
      date: null,
      iso: '',
      display: 'Missing timestamp',
      epochMs: 0,
      error: 'Empty or missing timestamp',
    };
  }

  let parsedDate: Date | null = null;

  // Case 1: Numeric timestamp (epoch ms or seconds)
  if (typeof raw === 'number') {
    if (!isFinite(raw) || raw <= 0) {
      return {
        isValid: false,
        date: null,
        iso: '',
        display: 'Invalid timestamp',
        epochMs: 0,
        error: `Malformed numeric timestamp: ${raw}`,
      };
    }
    // If < 10,000,000,000, treat as epoch seconds
    const ms = raw < 10000000000 ? raw * 1000 : raw;
    parsedDate = new Date(ms);
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();

    // Check if it's purely digits or Slack style decimal timestamp "1788421800.000200"
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      const ms = num < 10000000000 ? num * 1000 : num;
      parsedDate = new Date(ms);
    } else {
      // Try standard Date parsing
      let d = new Date(trimmed);

      // If invalid, try standard replacements for common non-standard strings
      // e.g. "2026-09-03 14:30:00" -> replace space with 'T'
      if (isNaN(d.getTime())) {
        if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?/.test(trimmed)) {
          const isoLike = trimmed.replace(' ', 'T');
          d = new Date(isoLike);
        }
      }

      // e.g. "09/03/2026 14:30" or "09-03-2026 14:30"
      if (isNaN(d.getTime())) {
        const parts = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (parts) {
          const m = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const year = parseInt(parts[3], 10);
          const hr = parseInt(parts[4], 10);
          const min = parseInt(parts[5], 10);
          const sec = parts[6] ? parseInt(parts[6], 10) : 0;
          d = new Date(year, m, day, hr, min, sec);
        }
      }

      parsedDate = d;
    }
  }

  // Validate resulting Date
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return {
      isValid: false,
      date: null,
      iso: '',
      display: 'Malformed Date',
      epochMs: 0,
      error: `Could not parse date string: "${raw}"`,
    };
  }

  const epochMs = parsedDate.getTime();
  const iso = parsedDate.toISOString();
  const display = formatDateTimeDisplay(iso);

  return {
    isValid: true,
    date: parsedDate,
    iso,
    display,
    epochMs,
  };
}

/**
 * Resolves the start and end of a shift window, explicitly supporting
 * cross-midnight scenarios (e.g. 10:00 PM -> 2:00 AM).
 */
export function getResolvedShiftWindow(
  startInput: string,
  endInput: string
): {
  startMs: number;
  endMs: number;
  isCrossMidnight: boolean;
  startIso: string;
  endIso: string;
} {
  const startDate = new Date(startInput);
  let endDate = new Date(endInput);

  let startMs = startDate.getTime();
  let endMs = endDate.getTime();
  let isCrossMidnight = false;

  // If user entered end before start (e.g. 22:00 to 02:00 on same calendar day selection)
  if (endMs <= startMs) {
    // Add 24 hours (1 day) to the end timestamp to properly span past midnight
    endMs += 24 * 60 * 60 * 1000;
    endDate = new Date(endMs);
    isCrossMidnight = true;
  }

  return {
    startMs,
    endMs,
    isCrossMidnight,
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
  };
}

/**
 * Critical Shift Window Filtering:
 * start_time <= event_time <= end_time
 *
 * Supports cross-midnight shifts and robustly handles unparseable timestamps.
 */
export function isWithinShift(
  rawTimestamp: string | number,
  startInput: string,
  endInput: string
): boolean {
  const norm = normalizeTimestamp(rawTimestamp);
  if (!norm.isValid || !norm.date) return false;

  const window = getResolvedShiftWindow(startInput, endInput);
  const eventMs = norm.epochMs;

  return window.startMs <= eventMs && eventMs <= window.endMs;
}

export function formatDateTimeDisplay(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Invalid date';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeOnly(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function calculateDurationHours(startIso: string, endIso: string): string {
  const window = getResolvedShiftWindow(startIso, endIso);
  if (isNaN(window.startMs) || isNaN(window.endMs) || window.endMs < window.startMs) return '0 hrs';
  const diffHours = (window.endMs - window.startMs) / (1000 * 60 * 60);
  return `${diffHours.toFixed(1)} hrs${window.isCrossMidnight ? ' (Overnight)' : ''}`;
}

export function getPresetRange(type: '8h' | '12h' | 'day' | 'evening' | 'night' | '24h') {
  const now = new Date();
  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  if (type === '8h') {
    const start = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    return { start: format(start), end: format(now) };
  }

  if (type === '12h') {
    const start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    return { start: format(start), end: format(now) };
  }

  if (type === '24h') {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { start: format(start), end: format(now) };
  }

  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  if (type === 'day') {
    // 08:00 - 16:00
    const start = new Date(y, m, d, 8, 0, 0);
    const end = new Date(y, m, d, 16, 0, 0);
    return { start: format(start), end: format(end) };
  }

  if (type === 'evening') {
    // 16:00 - 00:00 (Cross midnight)
    const start = new Date(y, m, d, 16, 0, 0);
    const end = new Date(y, m, d + 1, 0, 0, 0);
    return { start: format(start), end: format(end) };
  }

  if (type === 'night') {
    // Overnight: 22:00 -> 06:00
    const start = new Date(y, m, d - 1, 22, 0, 0);
    const end = new Date(y, m, d, 6, 0, 0);
    return { start: format(start), end: format(end) };
  }

  return { start: format(now), end: format(now) };
}
