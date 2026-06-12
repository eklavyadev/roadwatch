/**
 * In-memory cache for task states
 * This helps bridge gaps when Modal backend restarts
 * Falls back to last known state when 404s occur
 */

interface TaskState {
  status: 'processing' | 'done' | 'error';
  percent: number;
  progress: number;
  total_frames: number;
  potholes_found: number;
  result?: any;
  error?: string;
  lastUpdated: number;
  failureCount: number;
}

const taskCache = new Map<string, TaskState>();
const MAX_STALE_TIME = 60000; // Keep cache for 60 seconds after last update
const MAX_CONSECUTIVE_FAILURES = 3; // Allow up to 3 consecutive failures before considering it stuck

export function updateTaskCache(taskId: string, state: Partial<TaskState>) {
  const existing = taskCache.get(taskId) || {
    status: 'processing',
    percent: 0,
    progress: 0,
    total_frames: 0,
    potholes_found: 0,
    lastUpdated: Date.now(),
    failureCount: 0,
  };

  const updated: TaskState = {
    ...existing,
    ...state,
    lastUpdated: Date.now(),
    failureCount: 0, // Reset failure count on successful update
  };

  taskCache.set(taskId, updated);
}

export function recordTaskFailure(taskId: string) {
  const existing = taskCache.get(taskId);
  if (existing) {
    existing.failureCount += 1;
    existing.lastUpdated = Date.now();
  }
}

export function getTaskStateFromCache(taskId: string): TaskState | null {
  const cached = taskCache.get(taskId);
  if (!cached) return null;

  // Check if cache is stale
  const age = Date.now() - cached.lastUpdated;
  if (age > MAX_STALE_TIME) {
    taskCache.delete(taskId);
    return null;
  }

  return cached;
}

export function shouldRetryAfterFailure(taskId: string): boolean {
  const cached = taskCache.get(taskId);
  if (!cached) return true;

  // Allow retries as long as we haven't exceeded max consecutive failures
  // and the task hasn't completed
  if (cached.status === 'done' || cached.status === 'error') {
    return false; // Don't retry completed tasks
  }

  return cached.failureCount < MAX_CONSECUTIVE_FAILURES;
}

export function clearTaskCache(taskId: string) {
  taskCache.delete(taskId);
}

export function clearAllCache() {
  taskCache.clear();
}
