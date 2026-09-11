import { exec } from 'child_process';
import { promisify } from 'util';

const rawExecAsync = promisify(exec);

// A stuck ffmpeg/ffprobe process (e.g. waiting forever on a malformed input)
// would otherwise hang the request — and the in-memory job map — until the
// container is killed. 5 minutes is generous for any single step of a
// short-form reel render at 1 vCPU, while still guaranteeing forward
// progress instead of an indefinite hang.
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Non-blocking replacement for execSync. Unlike execSync (which blocks the
 * whole Node event loop — and therefore this entire single-process server —
 * for the full duration of every ffmpeg/ffprobe call), this spawns the
 * subprocess asynchronously and lets the event loop keep serving other
 * requests while it runs.
 */
export function execAsync(command: string, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  return rawExecAsync(command, { maxBuffer: 20 * 1024 * 1024, timeout: timeoutMs });
}
