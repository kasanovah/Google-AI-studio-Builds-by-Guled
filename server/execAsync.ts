import { exec } from 'child_process';
import { promisify } from 'util';

const rawExecAsync = promisify(exec);

/**
 * Non-blocking replacement for execSync. Unlike execSync (which blocks the
 * whole Node event loop — and therefore this entire single-process server —
 * for the full duration of every ffmpeg/ffprobe call), this spawns the
 * subprocess asynchronously and lets the event loop keep serving other
 * requests while it runs.
 */
export function execAsync(command: string) {
  return rawExecAsync(command, { maxBuffer: 20 * 1024 * 1024 });
}
